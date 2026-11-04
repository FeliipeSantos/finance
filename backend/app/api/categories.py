from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.database.connection import get_db
from app.api.deps import get_current_user
from app.models.models import User
from app.schemas.category import CategoryRequest, CategoryResponse, CategoryReorderRequest
from app.repositories.base import category_repo
from app.services.audit import AuditLogService

router = APIRouter(prefix="/categories", tags=["categories"])

@router.post("", response_model=CategoryResponse)
def create_category(
    request: CategoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    obj_in = {
        "user_id": current_user.id,
        "name": request.name,
        "type": request.type,
        "parent_category_id": request.parent_category_id,
        "color": request.color,
        "icon": request.icon,
        "show_in_accounts_by_category": request.show_in_accounts_by_category,
        "show_in_category_summary": request.show_in_category_summary,
        "show_in_category_balance": request.show_in_category_balance
    }
    category = category_repo.create(db, obj_in=obj_in)
    response = CategoryResponse.model_validate(category)
    AuditLogService.log_event(current_user.id, "CREATE", "CATEGORY", category.id, None, response)
    return response

@router.get("", response_model=List[CategoryResponse])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    categories = category_repo.find_by_user_id_or_system(db, current_user.id)
    return [CategoryResponse.model_validate(c) for c in categories]

@router.get("/{id}", response_model=CategoryResponse)
def get_category(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = category_repo.find_by_id_and_user_id_or_system(db, id, current_user.id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada"
        )
    return CategoryResponse.model_validate(category)

@router.put("/reorder")
def reorder_categories(
    request: CategoryReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = category_repo.reorder(db, current_user.id, request.category_ids)
    AuditLogService.log_event(current_user.id, "UPDATE", "CATEGORY_ORDER", current_user.id, None, {"category_ids": [str(c) for c in request.category_ids]})
    return {"updated": len(updated)}

@router.put("/{id}", response_model=CategoryResponse)
def update_category(
    id: UUID,
    request: CategoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = category_repo.get(db, id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada"
        )
    
    if category.user_id is not None and category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: esta categoria pertence a outro usuário"
        )

    # Prevent updating system categories
    if category.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido editar categorias padrões do sistema"
        )

    before = CategoryResponse.model_validate(category)
    
    obj_in = {
        "name": request.name,
        "color": request.color,
        "icon": request.icon,
        "show_in_accounts_by_category": request.show_in_accounts_by_category,
        "show_in_category_summary": request.show_in_category_summary,
        "show_in_category_balance": request.show_in_category_balance
    }
    
    updated_category = category_repo.update(db, db_obj=category, obj_in=obj_in)
    after = CategoryResponse.model_validate(updated_category)
    AuditLogService.log_event(current_user.id, "UPDATE", "CATEGORY", updated_category.id, before, after)
    return after

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = category_repo.get(db, id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada"
        )
    
    if category.user_id is not None and category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: esta categoria pertence a outro usuário"
        )

    # Prevent deleting system categories
    if category.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido excluir categorias padrões do sistema"
        )

    before = CategoryResponse.model_validate(category)
    category_repo.remove(db, id=id)
    AuditLogService.log_event(current_user.id, "DELETE", "CATEGORY", id, before, None)
