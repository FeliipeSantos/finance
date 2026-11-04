from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Dict
from app.database.connection import get_db
from app.schemas.auth import (
    RegisterRequest, LoginRequest, AuthResponse, MfaSetupResponse, UserResponse,
    UpdateProfileRequest, ChangePasswordRequest
)
from app.repositories.base import user_repo, category_repo
from app.models.models import User
from app.core.rate_limit import limiter
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    generate_totp_secret, verify_totp_token, get_totp_provisioning_url
)
from app.services.audit import AuditLogService
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if user_repo.exists_by_email(db, request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail já está cadastrado"
        )
    
    # Generate base user with Argon2id encrypted password
    mfa_secret = generate_totp_secret()
    user_data = {
        "full_name": request.full_name,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "mfa_enabled": False,
        "mfa_secret": mfa_secret
    }
    user = user_repo.create(db, obj_in=user_data)
    
    # Seed default categories and subcategories for new user
    from app.database.seeding import seed_user_categories
    seed_user_categories(db, user.id)
    
    user_resp = UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        mfa_enabled=user.mfa_enabled,
        avatar_url=user.avatar_url
    )

    AuditLogService.log_event(None, "CREATE", "USER", user.id, None, user_resp)
    
    token = create_access_token(user.email)
    refresh_token = create_refresh_token(user.email)
    
    return AuthResponse(
        token=token,
        refresh_token=refresh_token,
        mfa_required=False,
        user=user_resp
    )

@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = user_repo.find_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        # Mensagem genérica de propósito — não revelar se o e-mail existe ou
        # não (evita enumeração de contas cadastradas via este endpoint).
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos"
        )

    user_resp = UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        mfa_enabled=user.mfa_enabled,
        avatar_url=user.avatar_url
    )

    if user.mfa_enabled:
        if not payload.otp_token or not payload.otp_token.strip():
            return AuthResponse(
                mfa_required=True,
                user=user_resp
            )

        is_otp_valid = verify_totp_token(user.mfa_secret, payload.otp_token)
        if not is_otp_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Código de autenticação multifator inválido"
            )
            
    token = create_access_token(user.email)
    refresh_token = create_refresh_token(user.email)
    
    AuditLogService.log_event(user.id, "LOGIN", "USER", user.id, None, None)
    
    return AuthResponse(
        token=token,
        refresh_token=refresh_token,
        mfa_required=False,
        user=user_resp
    )

@router.get("/mfa/setup", response_model=MfaSetupResponse)
def get_mfa_setup(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.mfa_secret:
        current_user.mfa_secret = generate_totp_secret()
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
    
    from app.services.branding import get_branding

    qr_code_url = get_totp_provisioning_url(current_user.email, current_user.mfa_secret, get_branding(db).name)
    return MfaSetupResponse(
        secret=current_user.mfa_secret,
        qr_code_url=qr_code_url
    )

@router.post("/mfa/enable")
@limiter.limit("10/minute")
def enable_mfa(
    request: Request,
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    code = payload.get("code")
    if not code or not code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O código MFA é obrigatório"
        )
    
    is_otp_valid = verify_totp_token(current_user.mfa_secret, code)
    if not is_otp_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de autenticação inválido. MFA não foi ativado."
        )
    
    current_user.mfa_enabled = True
    db.add(current_user)
    db.commit()
    
    AuditLogService.log_event(current_user.id, "UPDATE", "MFA_ENABLED", current_user.id, None, None)
    return {"message": "MFA ativado com sucesso"}

@router.post("/mfa/disable")
def disable_mfa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.mfa_enabled = False
    db.add(current_user)
    db.commit()

    AuditLogService.log_event(current_user.id, "UPDATE", "MFA_DISABLED", current_user.id, None, None)
    return {"message": "MFA desativado com sucesso"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        mfa_enabled=current_user.mfa_enabled,
        avatar_url=current_user.avatar_url
    )

@router.put("/profile", response_model=UserResponse)
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    before = UserResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        mfa_enabled=current_user.mfa_enabled,
        avatar_url=current_user.avatar_url
    )

    if request.full_name is not None:
        current_user.full_name = request.full_name
    if request.avatar_url is not None:
        current_user.avatar_url = request.avatar_url or None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    after = UserResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        mfa_enabled=current_user.mfa_enabled,
        avatar_url=current_user.avatar_url
    )
    AuditLogService.log_event(current_user.id, "UPDATE", "USER_PROFILE", current_user.id, before, after)
    return after

@router.put("/password")
@limiter.limit("10/minute")
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()

    AuditLogService.log_event(current_user.id, "UPDATE", "USER_PASSWORD", current_user.id, None, None)
    return {"message": "Senha alterada com sucesso"}
