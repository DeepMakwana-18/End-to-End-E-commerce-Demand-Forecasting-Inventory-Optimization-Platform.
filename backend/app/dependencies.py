"""FastAPI dependencies for authentication, authorization, and tenant context.

Provides:
  - get_current_user     → resolves JWT to User ORM object
  - get_tenant_context   → extracts TenantContext from JWT
  - require_role(...)    → RBAC guard factory
  - require_admin        → shortcut for org_admin+
  - require_analyst      → shortcut for analyst+
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, UserRole
from app.core.security import decode_token
from app.core.tenant import TenantContext

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get the current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


async def get_tenant_context(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> TenantContext:
    """Extract tenant context from JWT.

    Returns a TenantContext with org_id, user_id, and role for tenant scoping.
    Falls back to looking up the user if org_id is missing from token (backward compat).
    """
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    org_id = payload.get("org_id")
    role = payload.get("role", "viewer")
    org_slug = payload.get("org_slug", "")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # If org_id is missing from token, look up user to get it
    if org_id is None:
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        org_id = user.organization_id
        role = user.role.value if user.role else "viewer"

    return TenantContext(
        org_id=int(org_id),
        org_slug=org_slug,
        user_id=int(user_id),
        user_role=role,
    )


def require_role(*allowed_roles: UserRole):
    """Factory dependency that checks if the user has one of the allowed roles.

    Usage:
        @router.post("/admin-only", dependencies=[Depends(require_role(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN))])
    """
    async def _check_role(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {[r.value for r in allowed_roles]}",
            )
        return user
    return _check_role


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require org_admin or super_admin role."""
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_manager_or_above(user: User = Depends(get_current_user)) -> User:
    """Require analyst or above role (backward compat alias)."""
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.ANALYST):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst or higher access required",
        )
    return user
