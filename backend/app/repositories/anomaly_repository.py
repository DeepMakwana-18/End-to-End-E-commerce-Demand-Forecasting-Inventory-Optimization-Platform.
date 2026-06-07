"""Anomaly repository — data access for anomaly detection results.

Extends BaseRepository with anomaly-specific query methods:
  - list_active()       — unresolved anomalies
  - list_by_type()      — filter by anomaly_type
  - list_by_severity()  — filter by severity
  - list_by_product()   — product-scoped anomalies
  - get_summary()       — count stats for dashboard
  - resolve_many()      — bulk resolve by ID list
  - delete_old()        — purge anomalies older than N days
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Sequence

from sqlalchemy import func, select, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base_repository import BaseRepository
from app.models.anomaly import Anomaly, AnomalyType, AnomalySeverity

logger = logging.getLogger("titan.anomaly.repo")


class AnomalyRepository(BaseRepository[Anomaly]):

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, Anomaly, org_id)

    # ── Reads ─────────────────────────────────────────────────────────

    async def list_active(
        self,
        *,
        limit: int = 100,
        offset: int = 0,
        severity: Optional[AnomalySeverity] = None,
        anomaly_type: Optional[AnomalyType] = None,
        product_id: Optional[int] = None,
    ) -> tuple[Sequence[Anomaly], int]:
        """List unresolved anomalies for this org with optional filters."""
        base = (
            self._scoped_query()
            .where(Anomaly.is_resolved == False)  # noqa: E712
        )

        if severity is not None:
            base = base.where(Anomaly.severity == severity)
        if anomaly_type is not None:
            base = base.where(Anomaly.anomaly_type == anomaly_type)
        if product_id is not None:
            base = base.where(Anomaly.product_id == product_id)

        # Count
        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self.session.execute(count_stmt)).scalar() or 0

        # Page
        stmt = base.order_by(Anomaly.detected_at.desc()).offset(offset).limit(limit)
        rows = (await self.session.execute(stmt)).scalars().all()
        return rows, total

    async def list_all(
        self,
        *,
        limit: int = 100,
        offset: int = 0,
        severity: Optional[AnomalySeverity] = None,
        anomaly_type: Optional[AnomalyType] = None,
        product_id: Optional[int] = None,
        include_resolved: bool = False,
    ) -> tuple[Sequence[Anomaly], int]:
        """List anomalies with full filter set."""
        base = self._scoped_query()

        if not include_resolved:
            base = base.where(Anomaly.is_resolved == False)  # noqa: E712
        if severity is not None:
            base = base.where(Anomaly.severity == severity)
        if anomaly_type is not None:
            base = base.where(Anomaly.anomaly_type == anomaly_type)
        if product_id is not None:
            base = base.where(Anomaly.product_id == product_id)

        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self.session.execute(count_stmt)).scalar() or 0

        stmt = base.order_by(Anomaly.detected_at.desc()).offset(offset).limit(limit)
        rows = (await self.session.execute(stmt)).scalars().all()
        return rows, total

    async def get_summary(self) -> dict:
        """Return aggregated counts for dashboard summary widget."""
        # Active (unresolved) counts by severity
        base = (
            self._scoped_query()
            .where(Anomaly.is_resolved == False)  # noqa: E712
        )

        async def _count(extra_filter=None):
            stmt = select(func.count()).select_from(
                (base.where(extra_filter) if extra_filter is not None else base).subquery()
            )
            return (await self.session.execute(stmt)).scalar() or 0

        total_active = await _count()
        critical = await _count(Anomaly.severity == AnomalySeverity.CRITICAL)
        medium = await _count(Anomaly.severity == AnomalySeverity.MEDIUM)
        low = await _count(Anomaly.severity == AnomalySeverity.LOW)
        spikes = await _count(Anomaly.anomaly_type == AnomalyType.DEMAND_SPIKE)
        drops = await _count(Anomaly.anomaly_type == AnomalyType.DEMAND_DROP)
        shocks = await _count(Anomaly.anomaly_type == AnomalyType.INVENTORY_SHOCK)
        misses = await _count(Anomaly.anomaly_type == AnomalyType.FORECAST_MISS)

        # Latest detection timestamp
        latest_stmt = (
            self._scoped_query()
            .where(Anomaly.is_resolved == False)  # noqa: E712
            .order_by(Anomaly.detected_at.desc())
            .limit(1)
            .with_only_columns(Anomaly.detected_at)
        )
        latest_row = (await self.session.execute(latest_stmt)).scalar_one_or_none()

        return {
            "total_active": total_active,
            "critical_count": critical,
            "medium_count": medium,
            "low_count": low,
            "demand_spikes": spikes,
            "demand_drops": drops,
            "inventory_shocks": shocks,
            "forecast_misses": misses,
            "latest_detected_at": latest_row,
        }

    # ── Writes ────────────────────────────────────────────────────────

    async def bulk_create(self, anomalies: list[Anomaly]) -> list[Anomaly]:
        """Persist a batch of detected anomalies."""
        for a in anomalies:
            if a.organization_id is None:
                a.organization_id = self.org_id
        self.session.add_all(anomalies)
        await self.session.flush()
        return anomalies

    async def resolve_many(self, anomaly_ids: list[int]) -> int:
        """Mark a list of anomaly IDs as resolved. Returns number updated."""
        now = datetime.now(timezone.utc)
        stmt = (
            sa_update(Anomaly)
            .where(Anomaly.organization_id == self.org_id)
            .where(Anomaly.id.in_(anomaly_ids))
            .where(Anomaly.is_resolved == False)  # noqa: E712
            .values(is_resolved=True, resolved_at=now)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    async def delete_old(self, older_than_days: int = 90) -> int:
        """Purge resolved anomalies older than N days. Returns deleted count."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=older_than_days)
        stmt = (
            select(Anomaly)
            .where(Anomaly.organization_id == self.org_id)
            .where(Anomaly.is_resolved == True)  # noqa: E712
            .where(Anomaly.detected_at < cutoff)
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        for row in rows:
            await self.session.delete(row)
        await self.session.flush()
        return len(rows)
