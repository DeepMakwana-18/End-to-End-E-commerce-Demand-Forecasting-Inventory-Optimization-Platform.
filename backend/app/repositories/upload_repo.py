"""Upload repository — tenant-scoped file upload tracking."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UploadedFile
from app.core.base_repository import BaseRepository


class UploadRepository(BaseRepository[UploadedFile]):

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, UploadedFile, org_id)

    async def get_history(self, *, offset: int = 0, limit: int = 20) -> list[UploadedFile]:
        return await self.get_all(offset=offset, limit=limit, order_by="created_at", order_desc=True)
