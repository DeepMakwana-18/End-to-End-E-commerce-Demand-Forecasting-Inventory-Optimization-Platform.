"""Organization repository — CRUD + slug lookup."""

from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Organization
from app.core.base_repository import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):

    def __init__(self, session: AsyncSession):
        # Orgs are NOT scoped by org_id (they ARE the top-level entity)
        super().__init__(session, Organization, org_id=None)

    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        stmt = select(Organization).where(Organization.slug == slug)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def slug_exists(self, slug: str) -> bool:
        stmt = select(Organization.id).where(Organization.slug == slug).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def generate_slug(self, name: str) -> str:
        """Generate a unique slug from an organization name."""
        import re
        base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        if not base_slug:
            base_slug = "org"
        slug = base_slug
        counter = 1
        while await self.slug_exists(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug
