import jwt
import pyotp
from datetime import datetime, timedelta
from typing import Optional, Any
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.core.config import settings

# Argon2id hasher matches Java parameters exactly:
# iterations (time_cost) = 2
# memory (memory_cost) = 65536 (64MB)
# parallelism = 1
password_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=1
)

def hash_password(password: str) -> str:
    return password_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return password_hasher.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


# JWT Access and Refresh tokens
def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(seconds=settings.JWT_EXPIRATION)
    to_encode = {
        "sub": str(subject),
        "iat": datetime.utcnow(),
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

def create_refresh_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(seconds=settings.JWT_REFRESH_EXPIRATION)
    to_encode = {
        "sub": str(subject),
        "iat": datetime.utcnow(),
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


# TOTP Multi-factor Authentication
def generate_totp_secret() -> str:
    return pyotp.random_base32()

def verify_totp_token(secret: str, token: str) -> bool:
    if not token or not token.strip():
        return False
    try:
        totp = pyotp.TOTP(secret)
        # valid_window=1 allows the token from the previous or next 30s steps to account for slight clock drifts.
        return totp.verify(token.strip(), valid_window=1)
    except Exception:
        return False

def get_totp_provisioning_url(email: str, secret: str, platform_name: str = "Finance") -> str:
    from urllib.parse import quote, urlencode

    return f"otpauth://totp/{quote(platform_name, safe='')}:{quote(email, safe='')}?{urlencode({'secret': secret, 'issuer': platform_name})}"
