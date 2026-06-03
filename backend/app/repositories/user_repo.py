"""User repository — tenant-scoped user CRUD + email lookup."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.core.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):

    def __init__(self, session: AsyncSession, org_id: int | None = None):
        super().__init__(session, User, org_id)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Find user by email (globally unique, not scoped by org)."""
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        stmt = select(User.id).where(User.email == email).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_org_users(self, org_id: int, *, offset: int = 0, limit: int = 50):
        stmt = (
            select(User)
            .where(User.organization_id == org_id)
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
