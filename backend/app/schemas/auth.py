from uuid import UUID
from typing import Optional
from pydantic import Field
from app.schemas.base import CamelModel

class RegisterRequest(CamelModel):
    email: str
    password: str = Field(min_length=6)  # mesmo mínimo já comunicado no formulário do frontend
    full_name: str

class LoginRequest(CamelModel):
    email: str
    password: str
    otp_token: Optional[str] = None

class UserResponse(CamelModel):
    id: UUID
    full_name: str
    email: str
    mfa_enabled: bool
    avatar_url: Optional[str] = None

class AuthResponse(CamelModel):
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    mfa_required: bool
    user: Optional[UserResponse] = None

class MfaSetupResponse(CamelModel):
    secret: str
    qr_code_url: str

class UpdateProfileRequest(CamelModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class ChangePasswordRequest(CamelModel):
    current_password: str
    new_password: str = Field(min_length=6)
