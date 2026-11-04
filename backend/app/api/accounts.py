from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.database.connection import get_db
from app.api.deps import get_current_user
from app.models.models import User, Account
from app.schemas.account import AccountRequest, AccountResponse
from app.repositories.base import account_repo
from app.services.audit import AuditLogService

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.post("", response_model=AccountResponse)
def create_account(
    request: AccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if request.is_default:
        db.query(Account).filter(Account.user_id == current_user.id).update({"is_default": False})
    
    obj_in = {
        "user_id": current_user.id,
        "name": request.name,
        "institution": request.institution or request.name,
        "balance_initial": request.balance_initial,
        "balance_current": request.balance_initial,  # Current starts as initial
        "color": request.color,
        "type": request.type,
        "is_active": True,
        "overdraft": request.overdraft,
        "account_number": request.account_number,
        "additional_data": request.additional_data,
        "is_default": request.is_default,
        "show_in_resume": request.show_in_resume,
        "is_investment": request.is_investment,
        "ignore_in_totals": request.ignore_in_totals,
        "account_group": request.account_group or "Nenhum",
        "icon": request.icon or "bank",
        "custom_icon_url": request.custom_icon_url
    }
    account = account_repo.create(db, obj_in=obj_in)
    
    response = AccountResponse.model_validate(account)
    AuditLogService.log_event(current_user.id, "CREATE", "ACCOUNT", account.id, None, response)
    return response

@router.get("", response_model=List[AccountResponse])
def list_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    accounts = account_repo.find_by_user_id(db, current_user.id)
    return [AccountResponse.model_validate(a) for a in accounts]

@router.get("/{id}", response_model=AccountResponse)
def get_account(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = account_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    return AccountResponse.model_validate(account)

@router.put("/{id}", response_model=AccountResponse)
def update_account(
    id: UUID,
    request: AccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = account_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    
    if request.is_default:
        db.query(Account).filter(Account.user_id == current_user.id, Account.id != id).update({"is_default": False})
    
    before = AccountResponse.model_validate(account)
    
    # Adjust current balance based on initial balance delta
    initial_delta = request.balance_initial - account.balance_initial
    new_current_balance = account.balance_current + initial_delta
    
    obj_in = {
        "name": request.name,
        "institution": request.institution or request.name,
        "balance_initial": request.balance_initial,
        "balance_current": new_current_balance,
        "color": request.color,
        "type": request.type,
        "overdraft": request.overdraft,
        "account_number": request.account_number,
        "additional_data": request.additional_data,
        "is_default": request.is_default,
        "show_in_resume": request.show_in_resume,
        "is_investment": request.is_investment,
        "ignore_in_totals": request.ignore_in_totals,
        "account_group": request.account_group or "Nenhum",
        "icon": request.icon or "bank",
        "custom_icon_url": request.custom_icon_url
    }

    updated_account = account_repo.update(db, db_obj=account, obj_in=obj_in)
    after = AccountResponse.model_validate(updated_account)
    AuditLogService.log_event(current_user.id, "UPDATE", "ACCOUNT", updated_account.id, before, after)
    return after

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = account_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada"
        )
    before = AccountResponse.model_validate(account)
    account_repo.remove(db, id=id)
    AuditLogService.log_event(current_user.id, "DELETE", "ACCOUNT", id, before, None)
