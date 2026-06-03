"""User Management API routes — tenant-scoped with RBAC."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserResponse, UserCreate, UserUpdate
from app.core.security import hash_password
from app.dependencies import get_tenant_context, require_admin
from app.core.tenant import TenantContext
from app.repositories.user_repo import UserRepository

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get all users in the organization (admin only)."""
    if not tenant.can_manage_users:
        raise HTTPException(status_code=403, detail="Admin access required")

    repo = UserRepository(db, tenant.org_id)
    users = await repo.get_org_users(tenant.org_id)
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Create a new user in the organization (admin only)."""
    if not tenant.can_manage_users:
        raise HTTPException(status_code=403, detail="Admin access required")

    repo = UserRepository(db)
    if await repo.email_exists(user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Prevent non-super-admins from creating super_admin users
    if user_in.role == UserRole.SUPER_ADMIN and not tenant.is_super_admin:
        raise HTTPException(status_code=403, detail="Only super admins can create super admin users")

    user = User(
        organization_id=tenant.org_id,
        email=user_in.email,
        name=user_in.name,
        role=user_in.role,
        password_hash=hash_password(user_in.password),
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Update a user (admin only)."""
    if not tenant.can_manage_users:
        raise HTTPException(status_code=403, detail="Admin access required")

    repo = UserRepository(db, tenant.org_id)
    updates = user_in.model_dump(exclude_unset=True)

    # Prevent role escalation
    if "role" in updates and updates["role"] == UserRole.SUPER_ADMIN and not tenant.is_super_admin:
        raise HTTPException(status_code=403, detail="Cannot assign super_admin role")

    user = await repo.update(user_id, **updates)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/status")
async def toggle_user_status(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Toggle a user's active status (admin only)."""
    if not tenant.can_manage_users:
        raise HTTPException(status_code=403, detail="Admin access required")

    repo = UserRepository(db, tenant.org_id)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-deactivation
    if user.id == tenant.user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.is_active = not user.is_active
    await db.flush()
    return {"status": "success", "is_active": user.is_active}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Delete a user (admin only)."""
    if not tenant.can_manage_users:
        raise HTTPException(status_code=403, detail="Admin access required")

    if user_id == tenant.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    repo = UserRepository(db, tenant.org_id)
    success = await repo.delete(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
