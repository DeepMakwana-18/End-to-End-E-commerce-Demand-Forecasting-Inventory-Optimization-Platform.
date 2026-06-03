"""JWT Authentication, Password Hashing, and Security Utilities.

Refactored from utils/auth.py with added organization-aware JWT claims.
Phase 2.5: Added refresh token rotation, blacklisting, password strength validation.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings
import re
import logging

logger = logging.getLogger("titan.security")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password Hashing ────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets enterprise requirements.

    Returns (is_valid, error_message).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    return True, ""


# ── JWT Token Management ────────────────────────────────────────────


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT access token with organization claims.

    Expected data keys:
        sub       — user id (str)
        email     — user email
        role      — user role
        org_id    — organization id (int)
        org_slug  — organization slug (str)
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access", "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token with rotation support."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh", "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns payload dict or None."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def extract_token_claims(token: str) -> dict:
    """Decode token and return claims with defaults for missing fields.

    Returns:
        dict with keys: sub, email, role, org_id, org_slug, type
    """
    payload = decode_token(token)
    if payload is None:
        return {}
    return {
        "sub": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "org_id": payload.get("org_id"),
        "org_slug": payload.get("org_slug"),
        "type": payload.get("type"),
    }


# ── Refresh Token Rotation ──────────────────────────────────────────


async def blacklist_token(token: str, ttl_seconds: int = 604800) -> None:
    """Add a refresh token to the Redis blacklist.

    Used for token rotation: once a refresh token is used, the old one
    is blacklisted to prevent replay attacks.
    """
    try:
        from app.core.cache import get_redis
        client = await get_redis()
        if client:
            # Use token hash as key to avoid storing the full JWT
            import hashlib
            token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]
            await client.set(f"titan:blacklist:{token_hash}", "1", ex=ttl_seconds)
    except Exception:
        logger.warning("Failed to blacklist token")


async def is_token_blacklisted(token: str) -> bool:
    """Check if a refresh token has been blacklisted."""
    try:
        from app.core.cache import get_redis
        client = await get_redis()
        if client:
            import hashlib
            token_hash = hashlib.sha256(token.encode()).hexdigest()[:32]
            return await client.exists(f"titan:blacklist:{token_hash}") > 0
    except Exception:
        pass
    return False
