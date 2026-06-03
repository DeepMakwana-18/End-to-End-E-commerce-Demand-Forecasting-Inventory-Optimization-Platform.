"""JWT Authentication and Password Hashing Utilities.

Re-exports from core.security for backward compatibility.
"""

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    extract_token_claims,
)

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "extract_token_claims",
]
