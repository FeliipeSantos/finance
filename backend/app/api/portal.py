from datetime import datetime, timedelta, timezone
from secrets import compare_digest
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import reusable_oauth2
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import hash_password, verify_password
from app.database.connection import get_db
from app.database.seeding import seed_user_categories
from app.models.models import (
    User, Account, CreditCard, Transaction, TransactionInstallment, Category,
    Budget, Goal, Investment, InvestmentMovement, CustomIcon, Notification,
    Settings, AuditLog, SharedIcon, PlatformBranding,
)
from app.schemas.base import CamelModel
from app.schemas.custom_icon import SharedIconRequest, CustomIconResponse
from app.schemas.branding import BrandingSettings
from app.services.branding import get_branding

router = APIRouter(prefix="/portal", tags=["portal"])
PORTAL_AUDIENCE = "finance-portal"
_admin_password_hash = hash_password(settings.PORTAL_ADMIN_PASSWORD)


class PortalLogin(CamelModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=255)


class ConfirmAccount(CamelModel):
    confirmation_email: str


class ResetUserPassword(ConfirmAccount):
    new_password: str = Field(min_length=6, max_length=128)


class PortalUser(CamelModel):
    id: UUID
    full_name: str
    email: str
    created_at: datetime
    mfa_enabled: bool
    accounts_count: int
    cards_count: int
    transactions_count: int


def require_portal_admin(token: HTTPAuthorizationCredentials = Depends(reusable_oauth2)):
    try:
        if not token:
            raise ValueError("Missing token")
        payload = jwt.decode(
            token.credentials, settings.JWT_SECRET, algorithms=["HS256"],
            audience=PORTAL_AUDIENCE, options={"require": ["exp", "sub", "aud"]},
        )
        if payload.get("sub") != "portal-admin":
            raise ValueError("Invalid administrator")
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Entre no portal administrativo para continuar.")


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, payload: PortalLogin):
    valid_password = verify_password(payload.password, _admin_password_hash)
    if not compare_digest(payload.username.encode(), b"admin") or not valid_password:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")
    now = datetime.now(timezone.utc)
    token = jwt.encode({
        "sub": "portal-admin", "aud": PORTAL_AUDIENCE,
        "iat": now, "exp": now + timedelta(hours=1),
    }, settings.JWT_SECRET, algorithm="HS256")
    return {"token": token}


@router.get("/branding", response_model=BrandingSettings)
def read_branding(db: Session = Depends(get_db)):
    # Public so login pages can display the platform identity before signing in.
    return get_branding(db)


@router.put("/branding", response_model=BrandingSettings, dependencies=[Depends(require_portal_admin)])
def update_branding(payload: BrandingSettings, db: Session = Depends(get_db)):
    record = db.get(PlatformBranding, 1)
    if record is None:
        record = PlatformBranding(id=1)
        db.add(record)
    record.name = payload.name
    record.icon_data = payload.icon_data
    record.favicon_data = payload.favicon_data
    db.add(AuditLog(action="PORTAL_UPDATE", entity_name="PLATFORM_BRANDING"))
    db.commit()
    return get_branding(db)


@router.get("/users", response_model=list[PortalUser], dependencies=[Depends(require_portal_admin)])
def list_users(db: Session = Depends(get_db)):
    counts = {
        model: dict(db.query(model.user_id, func.count(model.id)).group_by(model.user_id).all())
        for model in (Account, CreditCard, Transaction)
    }
    return [PortalUser(
        id=user.id, full_name=user.full_name, email=user.email,
        created_at=user.created_at, mfa_enabled=bool(user.mfa_enabled),
        accounts_count=counts[Account].get(user.id, 0),
        cards_count=counts[CreditCard].get(user.id, 0),
        transactions_count=counts[Transaction].get(user.id, 0),
    ) for user in db.query(User).order_by(User.created_at.desc(), User.id).all()]


def shared_icon_response(icon: SharedIcon):
    return CustomIconResponse(id=icon.id, image_data=icon.image_data,
                              created_at=icon.created_at, can_delete=True, is_shared=True)


@router.get("/shared-icons", response_model=list[CustomIconResponse], dependencies=[Depends(require_portal_admin)])
def list_shared_icons(db: Session = Depends(get_db)):
    return [shared_icon_response(icon) for icon in db.query(SharedIcon).order_by(SharedIcon.created_at).all()]


@router.post("/shared-icons", response_model=CustomIconResponse, dependencies=[Depends(require_portal_admin)])
def create_shared_icon(payload: SharedIconRequest, db: Session = Depends(get_db)):
    icon = db.query(SharedIcon).filter(SharedIcon.image_data == payload.image_data).first()
    if icon:
        return shared_icon_response(icon)
    icon = SharedIcon(image_data=payload.image_data)
    db.add(icon)
    db.flush()
    db.add(AuditLog(action="PORTAL_CREATE", entity_name="SHARED_ICON", entity_id=icon.id))
    db.commit()
    db.refresh(icon)
    return shared_icon_response(icon)


@router.delete("/shared-icons/{icon_id}", status_code=204, dependencies=[Depends(require_portal_admin)])
def delete_shared_icon(icon_id: UUID, db: Session = Depends(get_db)):
    icon = db.get(SharedIcon, icon_id)
    if not icon:
        raise HTTPException(status_code=404, detail="Ícone compartilhado não encontrado")
    db.delete(icon)
    db.add(AuditLog(action="PORTAL_DELETE", entity_name="SHARED_ICON", entity_id=icon_id))
    db.commit()


def confirmed_user(db: Session, user_id: UUID, payload: ConfirmAccount) -> User:
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if not user:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    if payload.confirmation_email.strip() != user.email:
        raise HTTPException(status_code=400, detail="Digite o e-mail da conta para confirmar.")
    return user


def clear_user_data(db: Session, user_id: UUID):
    # Explicit child-first deletion also works with SQLite foreign keys disabled.
    transaction_ids = db.query(Transaction.id).filter(Transaction.user_id == user_id)
    investment_ids = db.query(Investment.id).filter(Investment.user_id == user_id)
    db.query(TransactionInstallment).filter(TransactionInstallment.transaction_id.in_(transaction_ids)).delete(synchronize_session=False)
    db.query(InvestmentMovement).filter(InvestmentMovement.investment_id.in_(investment_ids)).delete(synchronize_session=False)
    for model in (Transaction, Budget, Goal, Investment, CreditCard, Account, CustomIcon, Notification, Settings):
        db.query(model).filter(model.user_id == user_id).delete(synchronize_session=False)
    db.query(Category).filter(Category.user_id == user_id).update({Category.parent_category_id: None}, synchronize_session=False)
    db.query(Category).filter(Category.user_id == user_id).delete(synchronize_session=False)


@router.post("/users/{user_id}/reset", dependencies=[Depends(require_portal_admin)])
def reset_user(user_id: UUID, payload: ConfirmAccount, db: Session = Depends(get_db)):
    user = confirmed_user(db, user_id, payload)
    try:
        clear_user_data(db, user.id)
        seed_user_categories(db, user.id, commit=False)
        db.add(AuditLog(user_id=user.id, action="PORTAL_RESET", entity_name="USER", entity_id=user.id))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"message": "Dados financeiros apagados. O login foi mantido e as categorias padrão foram restauradas."}


@router.post("/users/{user_id}/password", dependencies=[Depends(require_portal_admin)])
def reset_user_password(user_id: UUID, payload: ResetUserPassword, db: Session = Depends(get_db)):
    user = confirmed_user(db, user_id, payload)
    try:
        user.password_hash = hash_password(payload.new_password)
        db.add(AuditLog(user_id=user.id, action="PORTAL_PASSWORD_RESET", entity_name="USER", entity_id=user.id))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"message": f"Senha de {user.email} redefinida com sucesso."}


@router.delete("/users/{user_id}", dependencies=[Depends(require_portal_admin)])
def delete_user(user_id: UUID, payload: ConfirmAccount, db: Session = Depends(get_db)):
    user = confirmed_user(db, user_id, payload)
    try:
        clear_user_data(db, user.id)
        db.query(AuditLog).filter(AuditLog.user_id == user.id).delete(synchronize_session=False)
        db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
        db.add(AuditLog(action="PORTAL_DELETE", entity_name="USER", entity_id=user_id))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"message": "Conta e dados excluídos."}
