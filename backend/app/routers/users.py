"""User Management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import User
from app.schemas import UserResponse
from app.utils.auth import hash_password
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])

class UserCreateAdmin(BaseModel):
    name: str
    email: str
    role: str
    password: str = "default123!" # Default password for new admin-created users

@router.get("", response_model=List[UserResponse])
async def get_all_users(db: AsyncSession = Depends(get_db)):
    """Get all users (admin only ideally, but keeping open for demo)."""
    result = await db.execute(select(User).order_by(User.id.desc()))
    return result.scalars().all()

@router.post("", response_model=UserResponse)
async def create_user(user_in: UserCreateAdmin, db: AsyncSession = Depends(get_db)):
    """Create a new user from the admin dashboard."""
    # Check email
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user = User(
        email=user_in.email,
        name=user_in.name,
        role=user_in.role,
        password_hash=hash_password(user_in.password),
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/{user_id}/status")
async def toggle_user_status(user_id: int, db: AsyncSession = Depends(get_db)):
    """Toggle a user's active status."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = not user.is_active
    await db.commit()
    return {"status": "success", "is_active": user.is_active}

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a user."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await db.delete(user)
    await db.commit()
    return {"status": "success"}
