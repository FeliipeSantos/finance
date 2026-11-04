from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.database.connection import get_db
from app.api.deps import get_current_user
from app.models.models import User, SharedIcon
from app.schemas.custom_icon import CustomIconRequest, CustomIconResponse
from app.repositories.base import custom_icon_repo

router = APIRouter(prefix="/custom-icons", tags=["custom-icons"])

def _to_response(icon, current_user_id) -> CustomIconResponse:
    return CustomIconResponse(
        id=icon.id,
        image_data=icon.image_data,
        created_at=icon.created_at,
        can_delete=not isinstance(icon, SharedIcon) and icon.user_id == current_user_id,
        is_shared=isinstance(icon, SharedIcon),
    )

@router.get("", response_model=List[CustomIconResponse])
def list_custom_icons(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ícones privados da conta + biblioteca global do Portal.
    icons = custom_icon_repo.find_visible_to_user(db, current_user.id)
    return [_to_response(i, current_user.id) for i in icons]

@router.post("", response_model=CustomIconResponse)
def create_custom_icon(
    request: CustomIconRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Evita duplicar a mesma imagem se ela já estiver visível para este
    # usuário (própria ou da biblioteca global).
    existing = custom_icon_repo.find_by_image_data_visible_to_user(db, request.image_data, current_user.id)
    if existing:
        return _to_response(existing, current_user.id)

    icon = custom_icon_repo.create(db, obj_in={
        "user_id": current_user.id,
        "image_data": request.image_data,
    })
    return _to_response(icon, current_user.id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_icon(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Esta rota remove apenas ícones privados pertencentes ao usuário.
    icon = custom_icon_repo.find_by_id_and_user_id(db, id, current_user.id)
    if not icon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ícone não encontrado"
        )
    custom_icon_repo.remove(db, id=id)
