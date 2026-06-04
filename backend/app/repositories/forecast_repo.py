"""Forecast repository — tenant-scoped forecast CRUD + aggregation."""

from typing import Optional, Sequence
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Forecast, ModelVersion
from app.core.base_repository import BaseRepository


class ForecastRepository(BaseRepository[Forecast]):

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, Forecast, org_id)

    async def get_latest_forecasts(
        self,
        product_id: Optional[int] = None,
        limit: int = 52,
    ) -> Sequence[Forecast]:
        """Get latest forecasts, optionally for a specific product."""
        stmt = self._scoped_query()
        if product_id:
            stmt = stmt.where(Forecast.product_id == product_id)
        stmt = stmt.order_by(Forecast.forecast_date.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_accuracy(self) -> float:
        """Calculate forecast accuracy (MAPE-based) from forecasts that have actual demand."""
        stmt = (
            select(
                func.avg(
                    func.abs(Forecast.predicted_demand - Forecast.actual_demand)
                    / func.nullif(Forecast.actual_demand, 0)
                    * 100
                )
            )
            .where(Forecast.organization_id == self.org_id)
            .where(Forecast.actual_demand.isnot(None))
            .where(Forecast.actual_demand > 0)
        )
        result = await self.session.execute(stmt)
        mape = result.scalar()
        if mape is None:
            return 0.0
        return round(max(0, 100 - float(mape)), 1)

    async def bulk_save_forecasts(self, forecasts: list[Forecast]) -> int:
        """Save a batch of forecast records."""
        for f in forecasts:
            if f.organization_id is None:
                f.organization_id = self.org_id
        self.session.add_all(forecasts)
        await self.session.flush()
        return len(forecasts)


class ModelVersionRepository(BaseRepository[ModelVersion]):

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, ModelVersion, org_id)

    async def get_active(self) -> Optional[ModelVersion]:
        """Get the currently active model version for this org."""
        stmt = (
            self._scoped_query()
            .where(ModelVersion.is_active == True)
            .order_by(ModelVersion.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def deactivate_all(self):
        """Deactivate all model versions for this org."""
        stmt = (
            select(ModelVersion)
            .where(ModelVersion.organization_id == self.org_id)
            .where(ModelVersion.is_active == True)
        )
        result = await self.session.execute(stmt)
        for mv in result.scalars().all():
            mv.is_active = False
        await self.session.flush()

    async def get_active_with_artifact(self) -> tuple[Optional[ModelVersion], Optional[str]]:
        """Get the active model version and verify its artifact path exists on disk.

        Returns (ModelVersion, artifact_path) if both are present.
        Returns (ModelVersion, None) if the version exists but has no artifact on disk.
        Returns (None, None) if no active version exists.
        """
        import os
        mv = await self.get_active()
        if mv is None:
            return None, None
        path = mv.model_path
        if path and os.path.exists(path):
            return mv, path
        return mv, None

    async def get_training_history(self, limit: int = 20) -> Sequence[ModelVersion]:
        stmt = (
            self._scoped_query()
            .order_by(ModelVersion.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
