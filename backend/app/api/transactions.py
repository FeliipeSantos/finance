import datetime
import re
import uuid
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Literal
from app.database.connection import get_db
from app.api.deps import get_current_user
from app.models.models import User, Transaction, TransactionInstallment, Account
from app.schemas.transaction import TransactionRequest, TransactionResponse, TransactionInstallmentResponse, TransactionStatusRequest, TransactionDescriptionUpdate
from app.repositories.base import transaction_repo, account_repo, category_repo, card_repo
from app.services.audit import AuditLogService

router = APIRouter(prefix="/transactions", tags=["transactions"])

def add_months(sourcedate: datetime.date, months: int) -> datetime.date:
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, [31,
        29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28,
        31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
    return datetime.date(year, month, day)

def _advance_recurrence_date(base_date: datetime.date, steps: int, interval: str) -> datetime.date:
    if interval == "weekly":
        return base_date + datetime.timedelta(weeks=steps)
    if interval == "biweekly":
        return base_date + datetime.timedelta(days=15 * steps)
    if interval == "annual":
        return add_months(base_date, 12 * steps)
    return add_months(base_date, steps)

def _infer_recurrence_interval(sequence: list[Transaction]) -> str:
    candidates = ("weekly", "biweekly", "monthly", "annual")
    errors = {candidate: 0 for candidate in candidates}
    observations = 0

    for previous, following in zip(sequence, sequence[1:]):
        steps = (following.recurrence_index or 0) - (previous.recurrence_index or 0)
        if steps <= 0:
            continue
        for field in ("date", "due_date"):
            start = getattr(previous, field)
            end = getattr(following, field)
            if start is None or end is None:
                continue
            observations += 1
            for candidate in candidates:
                predicted = _advance_recurrence_date(start, steps, candidate)
                errors[candidate] += abs((predicted - end).days)

    if not observations:
        return "monthly"
    return min(candidates, key=lambda candidate: errors[candidate])

def get_account_or_throw(db: Session, account_id: UUID, user_id: UUID) -> Account:
    account = account_repo.find_by_id_and_user_id(db, account_id, user_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conta não encontrada"
        )
    return account

def validate_category(db: Session, category_id: UUID, user_id: UUID):
    if category_id:
        category = category_repo.find_by_id_and_user_id_or_system(db, category_id, user_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoria não encontrada"
            )

def validate_card(db: Session, credit_card_id: UUID, user_id: UUID):
    if credit_card_id:
        card = card_repo.find_by_id_and_user_id(db, credit_card_id, user_id)
        if not card:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cartão de crédito não encontrado"
            )
        return card

def apply_transaction_balances(db: Session, transaction: Transaction):
    if not getattr(transaction, "effective", True):
        return

    if transaction.credit_card_id is not None:
        return

    value = transaction.value
    if transaction.type == "REVENUE":
        if transaction.account_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conta de destino é obrigatória para receitas"
            )
        account = get_account_or_throw(db, transaction.account_id, transaction.user_id)
        account.balance_current += value
        db.add(account)
    elif transaction.type == "EXPENSE":
        if transaction.account_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conta de origem é obrigatória para despesas"
            )
        account = get_account_or_throw(db, transaction.account_id, transaction.user_id)
        account.balance_current -= value
        db.add(account)
    elif transaction.type == "TRANSFER":
        if transaction.account_id is None or transaction.destination_account_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contas de origem e destino são obrigatórias para transferências"
            )
        if transaction.account_id == transaction.destination_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A conta de origem e destino não podem ser as mesmas"
            )
        source = get_account_or_throw(db, transaction.account_id, transaction.user_id)
        dest = get_account_or_throw(db, transaction.destination_account_id, transaction.user_id)
        source.balance_current -= value
        dest.balance_current += value
        db.add(source)
        db.add(dest)

def reverse_transaction_balances(db: Session, transaction: Transaction):
    if not getattr(transaction, "effective", True):
        return

    if transaction.credit_card_id is not None:
        return

    value = transaction.value
    if transaction.type == "REVENUE":
        if transaction.account_id is not None:
            account = get_account_or_throw(db, transaction.account_id, transaction.user_id)
            account.balance_current -= value
            db.add(account)
    elif transaction.type == "EXPENSE":
        if transaction.account_id is not None:
            account = get_account_or_throw(db, transaction.account_id, transaction.user_id)
            account.balance_current += value
            db.add(account)
    elif transaction.type == "TRANSFER":
        if transaction.account_id is not None and transaction.destination_account_id is not None:
            source = get_account_or_throw(db, transaction.account_id, transaction.user_id)
            dest = get_account_or_throw(db, transaction.destination_account_id, transaction.user_id)
            source.balance_current += value
            dest.balance_current -= value
            db.add(source)
            db.add(dest)

def build_transaction_response(transaction: Transaction, db: Session) -> TransactionResponse:
    installments = db.query(TransactionInstallment).filter(
        TransactionInstallment.transaction_id == transaction.id
    ).order_by(TransactionInstallment.installment_number).all()
    
    inst_resps = []
    for inst in installments:
        inst_resps.append(
            TransactionInstallmentResponse(
                id=inst.id,
                installment_number=inst.installment_number,
                total_installments=inst.total_installments,
                value=inst.value,
                due_date=inst.due_date,
                status=inst.status,
                created_at=inst.created_at,
                updated_at=inst.updated_at
            )
        )
    
    return TransactionResponse(
        id=transaction.id,
        recurrence_group_id=transaction.recurrence_group_id,
        recurrence_index=transaction.recurrence_index,
        account_id=transaction.account_id,
        destination_account_id=transaction.destination_account_id,
        category_id=transaction.category_id,
        credit_card_id=transaction.credit_card_id,
        value=transaction.value,
        date=transaction.date,
        type=transaction.type,
        description=transaction.description,
        notes=transaction.notes,
        attachments_url=transaction.attachments_url,
        tags=transaction.tags,
        effective=transaction.effective,
        effective_date=transaction.effective_date,
        due_date=transaction.due_date,
        installments=inst_resps if inst_resps else None,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at
    )

@router.post("", response_model=TransactionResponse)
def create_transaction(
    request: TransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import timedelta
    validate_category(db, request.category_id, current_user.id)
    card = validate_card(db, request.credit_card_id, current_user.id)
    if card and card.account_id:
        request.account_id = card.account_id

    def calculate_recurrence_date(base_date, offset, periodicity):
        periodicity = (periodicity or "mensal").lower()
        if periodicity == "semanal":
            return base_date + timedelta(weeks=offset)
        elif periodicity == "quinzenal":
            return base_date + timedelta(days=15 * offset)
        elif periodicity == "anual":
            return add_months(base_date, 12 * offset)
        else: # default to mensal
            return add_months(base_date, offset)

    # Check recurrence type
    recurrence = request.recurrence_type or "NP"
    
    if recurrence == "PARCELADA":
        installments_count = request.installments_count or 1
        start_installment = request.start_installment or 1
        periodicity = request.periodicity or "mensal"
        value_type = request.value_type or "total"
        
        # Calculate installment values for all installments
        total_val = request.value
        if value_type == "total":
            base_val = (total_val / installments_count).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            sum_vals = base_val * installments_count
            diff = total_val - sum_vals
        else:
            base_val = total_val
            diff = Decimal("0.00")

        group_id = uuid.uuid4()
        created_transactions = []
        for idx, i in enumerate(range(start_installment, installments_count + 1)):
            if value_type == "total":
                inst_value = base_val + diff if i == 1 else base_val
            else:
                inst_value = base_val

            offset = i - start_installment
            inst_date = calculate_recurrence_date(request.date, offset, periodicity)
            inst_due_date = calculate_recurrence_date(request.due_date or request.date, offset, periodicity)
            desc = f"{request.description} {i}/{installments_count}"

            inst_effective = (request.effective if request.effective is not None else True) if offset == 0 else False
            inst_effective_date = request.effective_date if offset == 0 else None

            obj_in = {
                "user_id": current_user.id,
                "account_id": request.account_id,
                "destination_account_id": request.destination_account_id,
                "category_id": request.category_id,
                "credit_card_id": request.credit_card_id,
                "value": inst_value,
                "date": inst_date,
                "type": request.type,
                "description": desc,
                "notes": request.notes,
                "attachments_url": request.attachments_url,
                "tags": request.tags,
                "effective": inst_effective,
                "effective_date": inst_effective_date,
                "due_date": inst_due_date,
                "recurrence_group_id": group_id,
                "recurrence_index": i
            }
            tx = Transaction(**obj_in)
            apply_transaction_balances(db, tx)
            db.add(tx)
            created_transactions.append(tx)

        db.commit()
        for tx in created_transactions:
            db.refresh(tx)
        transaction = created_transactions[0]

    elif recurrence == "FIXA":
        group_id = uuid.uuid4()
        created_transactions = []
        for offset in range(12):
            inst_date = calculate_recurrence_date(request.date, offset, "mensal")
            inst_due_date = calculate_recurrence_date(request.due_date or request.date, offset, "mensal")
            desc = f"{request.description} [Fixa]"

            inst_effective = (request.effective if request.effective is not None else True) if offset == 0 else False
            inst_effective_date = request.effective_date if offset == 0 else None

            obj_in = {
                "user_id": current_user.id,
                "account_id": request.account_id,
                "destination_account_id": request.destination_account_id,
                "category_id": request.category_id,
                "credit_card_id": request.credit_card_id,
                "value": request.value,
                "date": inst_date,
                "type": request.type,
                "description": desc,
                "notes": request.notes,
                "attachments_url": request.attachments_url,
                "tags": request.tags,
                "effective": inst_effective,
                "effective_date": inst_effective_date,
                "due_date": inst_due_date,
                "recurrence_group_id": group_id,
                "recurrence_index": offset + 1
            }
            tx = Transaction(**obj_in)
            apply_transaction_balances(db, tx)
            db.add(tx)
            created_transactions.append(tx)

        db.commit()
        for tx in created_transactions:
            db.refresh(tx)
        transaction = created_transactions[0]

    else:
        # Normal Non-Recurrent flow
        obj_in = {
            "user_id": current_user.id,
            "account_id": request.account_id,
            "destination_account_id": request.destination_account_id,
            "category_id": request.category_id,
            "credit_card_id": request.credit_card_id,
            "value": request.value,
            "date": request.date,
            "type": request.type,
            "description": request.description,
            "notes": request.notes,
            "attachments_url": request.attachments_url,
            "tags": request.tags,
            "effective": request.effective if request.effective is not None else True,
            "effective_date": request.effective_date,
            "due_date": request.due_date
        }
        transaction = Transaction(**obj_in)
        apply_transaction_balances(db, transaction)
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        # Generate installments if requested (> 1) [Legacy installments table mapping]
        if request.installments_count and request.installments_count > 1:
            count = request.installments_count
            total_value = transaction.value
            base_value = (total_value / count).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            sum_installments = base_value * count
            difference = total_value - sum_installments
            
            installments = []
            for i in range(1, count + 1):
                installment_value = base_value
                if i == 1:
                    installment_value = base_value + difference
                    
                installment = TransactionInstallment(
                    transaction_id=transaction.id,
                    installment_number=i,
                    total_installments=count,
                    value=installment_value,
                    due_date=add_months(transaction.date, i - 1),
                    status="PENDING"
                )
                installments.append(installment)
                
            db.add_all(installments)
            db.commit()
            
    response = build_transaction_response(transaction, db)
    AuditLogService.log_event(current_user.id, "CREATE", "TRANSACTION", transaction.id, None, response)
    return response

@router.post("/effective-status", status_code=status.HTTP_204_NO_CONTENT)
def update_effective_status(
    request: TransactionStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ids = set(request.transaction_ids)
    transactions = db.query(Transaction).filter(
        Transaction.id.in_(ids), Transaction.user_id == current_user.id
    ).all()
    if len(transactions) != len(ids):
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    if request.effective and not request.use_due_date and not request.effective_date:
        raise HTTPException(status_code=400, detail="Informe a data de efetivação")

    audit_entries = []
    try:
        for transaction in transactions:
            before = build_transaction_response(transaction, db)
            reverse_transaction_balances(db, transaction)
            transaction.effective = request.effective
            transaction.effective_date = (
                (transaction.due_date or transaction.date) if request.use_due_date
                else request.effective_date
            ) if request.effective else None
            apply_transaction_balances(db, transaction)
            audit_entries.append((transaction, before))
        db.commit()
    except Exception:
        db.rollback()
        raise

    for transaction, before in audit_entries:
        after = build_transaction_response(transaction, db)
        AuditLogService.log_event(current_user.id, "UPDATE", "TRANSACTION", transaction.id, before, after)


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transactions = transaction_repo.find_by_user_id(db, current_user.id)
    return [build_transaction_response(t, db) for t in transactions]

@router.get("/{id}", response_model=TransactionResponse)
def get_transaction(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transaction = transaction_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
    return build_transaction_response(transaction, db)

@router.put("/{id}", response_model=TransactionResponse)
def update_transaction(
    id: UUID,
    request: TransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transaction = transaction_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
        
    validate_category(db, request.category_id, current_user.id)
    card = validate_card(db, request.credit_card_id, current_user.id)
    if card and card.account_id:
        request.account_id = card.account_id
    before = build_transaction_response(transaction, db)

    # 1. Reverse the old transaction's impact on balances
    reverse_transaction_balances(db, transaction)
    
    # 2. Check if recurrence is requested in edit mode
    recurrence = request.recurrence_type or "NP"
    if recurrence in ("PARCELADA", "FIXA"):
        # Delete the old single transaction
        transaction_repo.remove(db, id=id)
        
        # Create the new recurring sequence
        from datetime import timedelta
        def calculate_recurrence_date(base_date, offset, periodicity):
            periodicity = (periodicity or "mensal").lower()
            if periodicity == "semanal":
                return base_date + timedelta(weeks=offset)
            elif periodicity == "quinzenal":
                return base_date + timedelta(days=15 * offset)
            elif periodicity == "anual":
                return add_months(base_date, 12 * offset)
            else: # default to mensal
                return add_months(base_date, offset)

        if recurrence == "PARCELADA":
            installments_count = request.installments_count or 1
            start_installment = request.start_installment or 1
            periodicity = request.periodicity or "mensal"
            value_type = request.value_type or "total"
            
            # Calculate installment values for all installments
            total_val = request.value
            if value_type == "total":
                base_val = (total_val / installments_count).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                sum_vals = base_val * installments_count
                diff = total_val - sum_vals
            else:
                base_val = total_val
                diff = Decimal("0.00")

            group_id = uuid.uuid4()
            created_transactions = []
            for idx, i in enumerate(range(start_installment, installments_count + 1)):
                if value_type == "total":
                    inst_value = base_val + diff if i == 1 else base_val
                else:
                    inst_value = base_val

                offset = i - start_installment
                inst_date = calculate_recurrence_date(request.date, offset, periodicity)
                inst_due_date = calculate_recurrence_date(request.due_date or request.date, offset, periodicity)
                desc = f"{request.description} {i}/{installments_count}"

                inst_effective = (request.effective if request.effective is not None else True) if offset == 0 else False
                inst_effective_date = request.effective_date if offset == 0 else None

                obj_in = {
                    "user_id": current_user.id,
                    "account_id": request.account_id,
                    "destination_account_id": request.destination_account_id,
                    "category_id": request.category_id,
                    "credit_card_id": request.credit_card_id,
                    "value": inst_value,
                    "date": inst_date,
                    "type": request.type,
                    "description": desc,
                    "notes": request.notes,
                    "attachments_url": request.attachments_url,
                    "tags": request.tags,
                    "effective": inst_effective,
                    "effective_date": inst_effective_date,
                    "due_date": inst_due_date,
                    "recurrence_group_id": group_id,
                    "recurrence_index": i
                }
                tx = Transaction(**obj_in)
                apply_transaction_balances(db, tx)
                db.add(tx)
                created_transactions.append(tx)

            db.commit()
            for tx in created_transactions:
                db.refresh(tx)
            transaction = created_transactions[0]

        elif recurrence == "FIXA":
            group_id = uuid.uuid4()
            created_transactions = []
            for offset in range(12):
                inst_date = calculate_recurrence_date(request.date, offset, "mensal")
                inst_due_date = calculate_recurrence_date(request.due_date or request.date, offset, "mensal")
                desc = f"{request.description} [Fixa]"

                inst_effective = (request.effective if request.effective is not None else True) if offset == 0 else False
                inst_effective_date = request.effective_date if offset == 0 else None

                obj_in = {
                    "user_id": current_user.id,
                    "account_id": request.account_id,
                    "destination_account_id": request.destination_account_id,
                    "category_id": request.category_id,
                    "credit_card_id": request.credit_card_id,
                    "value": request.value,
                    "date": inst_date,
                    "type": request.type,
                    "description": desc,
                    "notes": request.notes,
                    "attachments_url": request.attachments_url,
                    "tags": request.tags,
                    "effective": inst_effective,
                    "effective_date": inst_effective_date,
                    "due_date": inst_due_date,
                    "recurrence_group_id": group_id,
                    "recurrence_index": offset + 1
                }
                tx = Transaction(**obj_in)
                apply_transaction_balances(db, tx)
                db.add(tx)
                created_transactions.append(tx)

            db.commit()
            for tx in created_transactions:
                db.refresh(tx)
            transaction = created_transactions[0]

        after = build_transaction_response(transaction, db)
        AuditLogService.log_event(current_user.id, "UPDATE", "TRANSACTION", transaction.id, before, after)
        return after

    # 3. Apply the normal updated transaction's impact on balances
    transaction.account_id = request.account_id
    transaction.destination_account_id = request.destination_account_id
    transaction.category_id = request.category_id
    transaction.credit_card_id = request.credit_card_id
    transaction.value = request.value
    transaction.date = request.date
    transaction.type = request.type
    transaction.description = request.description
    transaction.notes = request.notes
    transaction.attachments_url = request.attachments_url
    transaction.tags = request.tags
    transaction.effective = request.effective if request.effective is not None else True
    transaction.effective_date = request.effective_date
    transaction.due_date = request.due_date
    
    apply_transaction_balances(db, transaction)
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    after = build_transaction_response(transaction, db)
    AuditLogService.log_event(current_user.id, "UPDATE", "TRANSACTION", transaction.id, before, after)
    return after

@router.put("/{id}/recurrent", response_model=TransactionResponse)
def update_recurrent_transaction(
    id: UUID,
    request: TransactionRequest,
    update_type: Literal["CURRENT_AND_FUTURE", "ALL"],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = transaction_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    if transaction.recurrence_group_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível localizar a série recorrente deste lançamento.",
        )

    validate_category(db, request.category_id, current_user.id)
    card = validate_card(db, request.credit_card_id, current_user.id)
    if card and card.account_id:
        request.account_id = card.account_id

    all_transactions = transaction_repo.find_by_user_id(db, current_user.id)
    sequence = sorted(
        (tx for tx in all_transactions if tx.recurrence_group_id == transaction.recurrence_group_id),
        key=lambda tx: (tx.recurrence_index or 0, tx.date, str(tx.id)),
    )
    if update_type == "CURRENT_AND_FUTURE":
        current_index = transaction.recurrence_index or 0
        selected = [tx for tx in sequence if (tx.recurrence_index or 0) >= current_index]
    else:
        selected = sequence

    if not selected:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Série recorrente não encontrada")

    requested_due_date = request.due_date or request.date
    original_due_date = transaction.due_date or transaction.date
    date_changed = request.date != transaction.date
    due_date_changed = requested_due_date != original_due_date
    recurrence_interval = _infer_recurrence_interval(sequence)
    current_index = transaction.recurrence_index or 0
    effective_changed = request.effective is not None and request.effective != transaction.effective
    effective_date_delta = None
    if request.effective_date and transaction.effective_date:
        effective_date_delta = request.effective_date - transaction.effective_date

    installment_marker = re.compile(r"\s+\d+/\d+\s*$")
    fixed_marker = re.compile(r"\s*\[Fix[ao]\]\s*$", re.IGNORECASE)
    requested_description = fixed_marker.sub("", installment_marker.sub("", request.description)).strip()

    audit_entries = []
    for target in selected:
        before = build_transaction_response(target, db)
        reverse_transaction_balances(db, target)
        recurrence_offset = (target.recurrence_index or current_index) - current_index

        target.account_id = request.account_id
        target.destination_account_id = request.destination_account_id
        target.category_id = request.category_id
        target.credit_card_id = request.credit_card_id
        target.value = request.value
        if date_changed:
            target.date = _advance_recurrence_date(request.date, recurrence_offset, recurrence_interval)
        if due_date_changed:
            target.due_date = _advance_recurrence_date(requested_due_date, recurrence_offset, recurrence_interval)
        target.type = request.type
        marker = installment_marker.search(target.description)
        fixed = fixed_marker.search(target.description)
        if marker:
            target.description = f"{requested_description} {marker.group(0).strip()}"
        elif fixed:
            target.description = f"{requested_description} {fixed.group(0).strip()}"
        else:
            target.description = requested_description
        target.notes = request.notes
        target.attachments_url = request.attachments_url
        target.tags = request.tags

        if target.id == transaction.id or effective_changed:
            target.effective = request.effective if request.effective is not None else target.effective
        if target.id == transaction.id:
            target.effective_date = request.effective_date
        elif effective_changed:
            target.effective_date = target.date if target.effective else None
        elif target.effective and target.effective_date and effective_date_delta is not None:
            target.effective_date = target.effective_date + effective_date_delta

        apply_transaction_balances(db, target)
        db.add(target)
        audit_entries.append((target, before))

    db.commit()
    for target, before in audit_entries:
        db.refresh(target)
        after = build_transaction_response(target, db)
        AuditLogService.log_event(current_user.id, "UPDATE", "TRANSACTION", target.id, before, after)

    db.refresh(transaction)
    return build_transaction_response(transaction, db)

@router.patch("/{id}/description", response_model=TransactionResponse)
def update_transaction_description(
    id: UUID,
    request: TransactionDescriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = transaction_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    description = request.description.strip()
    if not description:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A descrição não pode ficar vazia.")

    before = build_transaction_response(transaction, db)
    transaction.description = description
    db.commit()
    db.refresh(transaction)
    after = build_transaction_response(transaction, db)
    AuditLogService.log_event(current_user.id, "UPDATE", "TRANSACTION", transaction.id, before, after)
    return after


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transaction = transaction_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )
        
    before = build_transaction_response(transaction, db)
    
    # Reverse balances before deleting
    reverse_transaction_balances(db, transaction)
    
    transaction_repo.remove(db, id=id)
    AuditLogService.log_event(current_user.id, "DELETE", "TRANSACTION", id, before, None)

def _delete_recurrent_by_group(
    db: Session, current_user: User, transaction: Transaction, delete_type: str, reorganize: bool
) -> None:
    all_txs = transaction_repo.find_by_user_id(db, current_user.id)
    sequence_txs = sorted(
        (tx for tx in all_txs if tx.recurrence_group_id == transaction.recurrence_group_id),
        key=lambda tx: tx.recurrence_index,
    )

    current_idx = transaction.recurrence_index
    txs_to_delete = []
    txs_to_keep = []
    for tx in sequence_txs:
        if delete_type == "ONLY_CURRENT":
            if tx.id == transaction.id:
                txs_to_delete.append(tx)
            else:
                txs_to_keep.append(tx)
        elif delete_type == "CURRENT_AND_FUTURE":
            if tx.recurrence_index >= current_idx:
                txs_to_delete.append(tx)
            else:
                txs_to_keep.append(tx)
        elif delete_type == "ALL":
            txs_to_delete.append(tx)

    for tx in txs_to_delete:
        before = build_transaction_response(tx, db)
        reverse_transaction_balances(db, tx)
        transaction_repo.remove(db, id=tx.id)
        AuditLogService.log_event(current_user.id, "DELETE", "TRANSACTION", tx.id, before, None)

    # Reorganiza a numeração remanescente da série; só reescreve a descrição
    # quando ela já seguia o padrão "texto N/M" (séries PARCELADA) — séries
    # FIXA ("[Fixa]") não têm esse sufixo e ficam só com o índice atualizado.
    if reorganize and delete_type != "ALL" and txs_to_keep:
        new_total = len(txs_to_keep)
        desc_pattern = re.compile(r"^(.*?)\s+\d+/\d+$")
        for new_idx, tx in enumerate(txs_to_keep, 1):
            desc_match = desc_pattern.match(tx.description)
            reverse_transaction_balances(db, tx)
            if desc_match:
                tx.description = f"{desc_match.group(1)} {new_idx}/{new_total}"
            tx.recurrence_index = new_idx
            apply_transaction_balances(db, tx)
            db.add(tx)

    db.commit()

@router.delete("/{id}/recurrent", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurrent_transaction(
    id: UUID,
    delete_type: Literal["ONLY_CURRENT", "CURRENT_AND_FUTURE", "ALL"],
    reorganize: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transaction = transaction_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transação não encontrada"
        )

    if transaction.recurrence_group_id is not None:
        _delete_recurrent_by_group(db, current_user, transaction, delete_type, reorganize)
        return

    # Dados legados: transações criadas antes de existir recurrence_group_id
    # não têm outro sinal de agrupamento além do texto da descrição.
    match = re.search(r"^(.*?)\s+(\d+)/(\d+)$", transaction.description)
    if not match:
        # Not a recurrent installment transaction! Just do a standard delete
        before = build_transaction_response(transaction, db)
        reverse_transaction_balances(db, transaction)
        transaction_repo.remove(db, id=id)
        AuditLogService.log_event(current_user.id, "DELETE", "TRANSACTION", id, before, None)
        return
        
    base_desc = match.group(1)
    current_idx = int(match.group(2))
    total_count = int(match.group(3))
    
    # Find all transactions for this user of the same type and matching description pattern
    all_txs = transaction_repo.find_by_user_id(db, current_user.id)
    sequence_txs = []
    for tx in all_txs:
        if tx.type != transaction.type:
            continue
        tx_match = re.search(r"^(.*?)\s+(\d+)/(\d+)$", tx.description)
        if tx_match:
            tx_base = tx_match.group(1)
            tx_idx = int(tx_match.group(2))
            tx_total = int(tx_match.group(3))
            if tx_base == base_desc and tx_total == total_count:
                sequence_txs.append((tx, tx_idx))
                
    # Sort sequence by index
    sequence_txs.sort(key=lambda x: x[1])
    
    # Identify which transactions to delete
    txs_to_delete = []
    txs_to_keep = []
    for tx, idx in sequence_txs:
        if delete_type == "ONLY_CURRENT":
            if tx.id == id:
                txs_to_delete.append(tx)
            else:
                txs_to_keep.append((tx, idx))
        elif delete_type == "CURRENT_AND_FUTURE":
            if idx >= current_idx:
                txs_to_delete.append(tx)
            else:
                txs_to_keep.append((tx, idx))
        elif delete_type == "ALL":
            txs_to_delete.append(tx)
            
    # Reverse balances and delete targets
    for tx in txs_to_delete:
        before = build_transaction_response(tx, db)
        reverse_transaction_balances(db, tx)
        transaction_repo.remove(db, id=tx.id)
        AuditLogService.log_event(current_user.id, "DELETE", "TRANSACTION", tx.id, before, None)
        
    # Reorganize remaining sequence if reorganize is True
    if reorganize and delete_type != "ALL" and txs_to_keep:
        new_total = len(txs_to_keep)
        for new_idx, (tx, old_idx) in enumerate(txs_to_keep, 1):
            new_desc = f"{base_desc} {new_idx}/{new_total}"
            # Reverse old balance impact
            reverse_transaction_balances(db, tx)
            tx.description = new_desc
            # Apply new balance impact
            apply_transaction_balances(db, tx)
            db.add(tx)
            
    db.commit()
