"""Generic async CRUD repository base class.

Every domain repository inherits from BaseRepository and gets:
  - get_by_id()
  - get_all() with pagination, filtering, ordering
  - create()
  - update()
  - delete()
  - count()

All queries are automatically scoped to the current organization (tenant isolation).
"""

from typing import Any, Generic, Optional, Sequence, TypeVar, Type
from sqlalchemy import select, func, update as sa_update, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """Async CRUD repository with automatic tenant scoping.

    Usage:
        class ProductRepo(BaseRepository[Product]):
            def __init__(self, session, org_id):
                super().__init__(session, Product, org_id)
    """

    def __init__(self, session: AsyncSession, model: Type[T], org_id: int | None = None):
        self.session = session
        self.model = model
        self.org_id = org_id

    def _scoped_query(self, stmt=None):
        """Apply organization scope to a query statement."""
        if stmt is None:
            stmt = select(self.model)
        if self.org_id is not None and hasattr(self.model, "organization_id"):
            stmt = stmt.where(self.model.organization_id == self.org_id)
        return stmt

    async def get_by_id(self, entity_id: int) -> Optional[T]:
        """Get a single entity by ID, scoped to org."""
        stmt = self._scoped_query().where(self.model.id == entity_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        order_by: str | None = None,
        order_desc: bool = True,
        filters: dict[str, Any] | None = None,
    ) -> Sequence[T]:
        """Get all entities with pagination, ordering, and filtering."""
        stmt = self._scoped_query()

        # Apply filters
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key) and value is not None:
                    stmt = stmt.where(getattr(self.model, key) == value)

        # Apply ordering
        if order_by and hasattr(self.model, order_by):
            col = getattr(self.model, order_by)
            stmt = stmt.order_by(col.desc() if order_desc else col.asc())
        elif hasattr(self.model, "id"):
            stmt = stmt.order_by(self.model.id.desc())

        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count(self, filters: dict[str, Any] | None = None) -> int:
        """Count entities, optionally with filters."""
        stmt = select(func.count(self.model.id))
        if self.org_id is not None and hasattr(self.model, "organization_id"):
            stmt = stmt.where(self.model.organization_id == self.org_id)
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key) and value is not None:
                    stmt = stmt.where(getattr(self.model, key) == value)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def create(self, entity: T) -> T:
        """Add a new entity to the session."""
        # Auto-set organization_id if applicable
        if self.org_id is not None and hasattr(entity, "organization_id"):
            if getattr(entity, "organization_id", None) is None:
                entity.organization_id = self.org_id
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def create_many(self, entities: list[T]) -> list[T]:
        """Bulk-add entities."""
        for entity in entities:
            if self.org_id is not None and hasattr(entity, "organization_id"):
                if getattr(entity, "organization_id", None) is None:
                    entity.organization_id = self.org_id
        self.session.add_all(entities)
        await self.session.flush()
        for entity in entities:
            await self.session.refresh(entity)
        return entities

    async def update(self, entity_id: int, **values) -> Optional[T]:
        """Update an entity by ID. Returns the updated entity or None."""
        entity = await self.get_by_id(entity_id)
        if entity is None:
            return None
        for key, value in values.items():
            if hasattr(entity, key):
                setattr(entity, key, value)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def delete(self, entity_id: int) -> bool:
        """Delete an entity by ID. Returns True if deleted."""
        entity = await self.get_by_id(entity_id)
        if entity is None:
            return False
        await self.session.delete(entity)
        await self.session.flush()
        return True

    async def exists(self, **filters) -> bool:
        """Check if an entity matching the filters exists."""
        stmt = self._scoped_query()
        for key, value in filters.items():
            if hasattr(self.model, key):
                stmt = stmt.where(getattr(self.model, key) == value)
        stmt = stmt.limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None
