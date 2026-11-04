from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.database.connection import get_db
from app.api.deps import get_current_user
from app.models.models import User, CreditCard, Transaction
from app.schemas.card import CreditCardRequest, CreditCardResponse
from app.repositories.base import card_repo, account_repo
from app.services.audit import AuditLogService

router = APIRouter(prefix="/cards", tags=["cards"])

def validate_account(db: Session, account_id: UUID, user_id: UUID):
    if account_id:
        account = account_repo.find_by_id_and_user_id(db, account_id, user_id)
        if not account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Conta não encontrada"
            )

def build_card_response(card: CreditCard, db: Session) -> CreditCardResponse:
    # user_id é redundante com credit_card_id em teoria, mas fica como defesa em
    # profundidade caso alguma transação seja criada sem passar pela validação
    # de posse do cartão em transactions.py.
    transactions = db.query(Transaction).filter(
        Transaction.credit_card_id == card.id,
        Transaction.user_id == card.user_id,
        Transaction.type == "EXPENSE",
        Transaction.effective.is_(False),
    ).all()
    
    tx_sum = sum(t.value for t in transactions) if transactions else Decimal("0.00")
    limit_used = max(Decimal("0.00"), (card.initial_invoice or Decimal("0.00")) + tx_sum)
    limit_available = card.limit_total - limit_used
    
    card_dict = {
        "id": card.id,
        "name": card.name,
        "bank": card.bank,
        "brand": card.brand,
        "limit_total": card.limit_total,
        "limit_used": limit_used,
        "limit_available": limit_available,
        "closing_day": card.closing_day,
        "due_day": card.due_day,
        "color": card.color,
        "initial_invoice": card.initial_invoice,
        "account_id": card.account_id,
        "is_main": card.is_main,
        "dynamic_closing": card.dynamic_closing,
        "due_business_days": card.due_business_days,
        "custom_icon_url": card.custom_icon_url,
        "created_at": card.created_at,
        "updated_at": card.updated_at
    }
    return CreditCardResponse(**card_dict)

@router.post("", response_model=CreditCardResponse)
def create_card(
    request: CreditCardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    validate_account(db, request.account_id, current_user.id)

    if request.is_main:
        db.query(CreditCard).filter(CreditCard.user_id == current_user.id).update({"is_main": False})

    obj_in = {
        "user_id": current_user.id,
        "name": request.name,
        "bank": request.bank,
        "brand": request.brand,
        "limit_total": request.limit_total,
        "closing_day": request.closing_day,
        "due_day": request.due_day,
        "color": request.color,
        "initial_invoice": request.initial_invoice,
        "account_id": request.account_id,
        "is_main": request.is_main,
        "dynamic_closing": request.dynamic_closing,
        "due_business_days": request.due_business_days,
        "custom_icon_url": request.custom_icon_url
    }
    card = card_repo.create(db, obj_in=obj_in)
    response = build_card_response(card, db)
    AuditLogService.log_event(current_user.id, "CREATE", "CREDIT_CARD", card.id, None, response)
    return response

@router.get("", response_model=List[CreditCardResponse])
def list_cards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cards = card_repo.find_by_user_id(db, current_user.id)
    return [build_card_response(card, db) for card in cards]

@router.get("/{id}", response_model=CreditCardResponse)
def get_card(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    card = card_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado"
        )
    return build_card_response(card, db)

@router.put("/{id}", response_model=CreditCardResponse)
def update_card(
    id: UUID,
    request: CreditCardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    card = card_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado"
        )
    
    before = build_card_response(card, db)

    validate_account(db, request.account_id, current_user.id)

    if request.is_main:
        db.query(CreditCard).filter(CreditCard.user_id == current_user.id, CreditCard.id != id).update({"is_main": False})
    
    obj_in = {
        "name": request.name,
        "bank": request.bank,
        "brand": request.brand,
        "limit_total": request.limit_total,
        "closing_day": request.closing_day,
        "due_day": request.due_day,
        "color": request.color,
        "initial_invoice": request.initial_invoice,
        "account_id": request.account_id,
        "is_main": request.is_main,
        "dynamic_closing": request.dynamic_closing,
        "due_business_days": request.due_business_days,
        "custom_icon_url": request.custom_icon_url
    }

    updated_card = card_repo.update(db, db_obj=card, obj_in=obj_in)
    after = build_card_response(updated_card, db)
    AuditLogService.log_event(current_user.id, "UPDATE", "CREDIT_CARD", updated_card.id, before, after)
    return after

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    card = card_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartão de crédito não encontrado"
        )
    before = build_card_response(card, db)
    card_repo.remove(db, id=id)
    AuditLogService.log_event(current_user.id, "DELETE", "CREDIT_CARD", id, before, None)
