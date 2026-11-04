import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from calendar import monthrange

from app.database.connection import get_db
from app.api.deps import get_current_user
from app.models.models import User, Budget, Transaction, Category
from app.schemas.budget import BudgetRequest, BudgetResponse, BudgetReorderRequest
from app.repositories.base import budget_repo, category_repo
from app.services.audit import AuditLogService

router = APIRouter(prefix="/budgets", tags=["budgets"])

def calculate_current_value(db: Session, user_id: UUID, category_ids: List[UUID], month: int, year: int, transaction_type: str, start_date=None, end_date=None) -> Decimal:
    if start_date is None:
        start_date = datetime.date(year, month, 1)
    if end_date is None:
        last_day = monthrange(year, month)[1]
        end_date = datetime.date(year, month, last_day)
    
    # Budget periods follow the transaction's due date when one exists. This
    # keeps a transaction entered in October but due in November out of the
    # October budget. Transactions without a due date still use their date.
    budget_date = func.coalesce(Transaction.due_date, Transaction.date)
    total = db.query(func.sum(Transaction.value)).filter(
        Transaction.user_id == user_id,
        Transaction.category_id.in_(category_ids),
        Transaction.type == transaction_type,
        budget_date >= start_date,
        budget_date <= end_date
    ).scalar()
    
    return total or Decimal("0.00")

def expand_category_selection(db: Session, user_id: UUID, selected_ids: List[UUID]) -> List[UUID]:
    """A selected parent category includes its subcategories in budget totals."""
    available = db.query(Category).filter(
        (Category.user_id == user_id) | (Category.user_id.is_(None))
    ).all()
    children_by_parent: dict[UUID, list[UUID]] = {}
    for category in available:
        if category.parent_category_id:
            children_by_parent.setdefault(category.parent_category_id, []).append(category.id)

    expanded = list(dict.fromkeys(selected_ids))
    pending = list(expanded)
    while pending:
        parent_id = pending.pop()
        for child_id in children_by_parent.get(parent_id, []):
            if child_id not in expanded:
                expanded.append(child_id)
                pending.append(child_id)
    return expanded

def build_budget_response(db: Session, budget: Budget, user_id: UUID) -> BudgetResponse:
    category_ids = [UUID(str(value)) for value in (budget.settings or {}).get("categoryIds", [str(budget.category_id)])]
    categories_by_id = {item.id: item for item in db.query(Category).filter(Category.id.in_(category_ids)).all()}
    categories = [categories_by_id[category_id] for category_id in category_ids if category_id in categories_by_id]
    category = next((item for item in categories if item.id == budget.category_id), categories[0] if categories else None)
    category_name = ", ".join(item.name for item in categories) if categories else "Sem Categoria"
    
    settings = budget.settings or {}
    period_start = period_end = None
    if settings.get("monthly") is False and settings.get("activeFrom") and settings.get("activeTo"):
        try:
            period_start = datetime.date.fromisoformat(settings["activeFrom"])
            period_end = datetime.date.fromisoformat(settings["activeTo"])
        except (TypeError, ValueError):
            period_start = period_end = None
    elif settings.get("activeFrom"):
        try:
            configured_start = datetime.date.fromisoformat(settings["activeFrom"])
            if (configured_start.year, configured_start.month) == (budget.year, budget.month):
                period_start = configured_start
        except (TypeError, ValueError):
            period_start = None
    calculation_category_ids = expand_category_selection(db, user_id, category_ids)
    curr_val = calculate_current_value(db, user_id, calculation_category_ids, budget.month, budget.year, category.type if category else "EXPENSE", period_start, period_end)
    
    return BudgetResponse(
        id=budget.id,
        category_id=budget.category_id,
        category_ids=category_ids,
        category_name=category_name,
        limit_value=budget.limit_value,
        current_value=curr_val,
        month=budget.month,
        year=budget.year,
        name=budget.name,
        color=budget.color,
        icon=budget.icon,
        settings=budget.settings or {},
        display_order=budget.display_order or 0,
        created_at=budget.created_at,
        updated_at=budget.updated_at
    )

def validate_category(db: Session, category_id: UUID, user_id: UUID):
    category = category_repo.find_by_id_and_user_id_or_system(db, category_id, user_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categoria não encontrada"
        )
    return category

def validate_categories(db: Session, category_ids: List[UUID], user_id: UUID):
    categories = [validate_category(db, category_id, user_id) for category_id in category_ids]
    if len({category.type for category in categories}) > 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selecione categorias do mesmo tipo")
    return categories

def validate_period_settings(settings: dict):
    if settings.get("monthly", True):
        active_from = settings.get("activeFrom")
        if active_from:
            try:
                datetime.date.fromisoformat(active_from)
            except (TypeError, ValueError):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe uma data inicial válida")
        return
    try:
        start_date = datetime.date.fromisoformat(settings.get("activeFrom", ""))
        end_date = datetime.date.fromisoformat(settings.get("activeTo", ""))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe as datas inicial e final do período")
    if end_date < start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A data final deve ser igual ou posterior à data inicial")

@router.post("", response_model=BudgetResponse)
def create_budget(
    request: BudgetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category_ids = list(dict.fromkeys(request.category_ids or [request.category_id]))
    validate_categories(db, category_ids, current_user.id)
    validate_period_settings(request.settings)
    category_id = category_ids[0]
    
    obj_in = {
        "user_id": current_user.id,
        "category_id": category_id,
        "limit_value": request.limit_value,
        "month": request.month,
        "year": request.year,
        "name": request.name,
        "color": request.color,
        "icon": request.icon,
        "settings": {**request.settings, "categoryIds": [str(value) for value in category_ids]},
        "display_order": max((item.display_order or 0 for item in budget_repo.find_by_user_id(db, current_user.id)), default=-1) + 1
    }
    budget = budget_repo.create(db, obj_in=obj_in)
        
    response = build_budget_response(db, budget, current_user.id)
    AuditLogService.log_event(
        current_user.id, 
        "CREATE", 
        "BUDGET", 
        budget.id, 
        None, 
        response
    )
    return response

@router.get("", response_model=List[BudgetResponse])
def list_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budgets = sorted(budget_repo.find_by_user_id(db, current_user.id), key=lambda item: (item.display_order or 0, item.created_at or datetime.datetime.min))
    return [build_budget_response(db, b, current_user.id) for b in budgets]

@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_budgets(
    request: BudgetReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budgets = [budget_repo.find_by_id_and_user_id(db, budget_id, current_user.id) for budget_id in request.budget_ids]
    if any(budget is None for budget in budgets):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orçamento não encontrado")
    for order, budget in enumerate(budgets):
        budget.display_order = order
    db.commit()

@router.get("/{id}", response_model=BudgetResponse)
def get_budget(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budget = budget_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado"
        )
    return build_budget_response(db, budget, current_user.id)

@router.put("/{id}", response_model=BudgetResponse)
def update_budget(
    id: UUID,
    request: BudgetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budget = budget_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado"
        )
        
    category_ids = list(dict.fromkeys(request.category_ids or [request.category_id]))
    validate_categories(db, category_ids, current_user.id)
    validate_period_settings(request.settings)
    before = build_budget_response(db, budget, current_user.id)
    
    obj_in = {
        "category_id": category_ids[0],
        "limit_value": request.limit_value,
        "month": request.month,
        "year": request.year,
        "name": request.name,
        "color": request.color,
        "icon": request.icon,
        "settings": {**request.settings, "categoryIds": [str(value) for value in category_ids]}
    }
    
    updated_budget = budget_repo.update(db, db_obj=budget, obj_in=obj_in)
    after = build_budget_response(db, updated_budget, current_user.id)
    AuditLogService.log_event(current_user.id, "UPDATE", "BUDGET", updated_budget.id, before, after)
    return after

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budget = budget_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado"
        )
    before = build_budget_response(db, budget, current_user.id)
    budget_repo.remove(db, id=id)
    AuditLogService.log_event(current_user.id, "DELETE", "BUDGET", id, before, None)
