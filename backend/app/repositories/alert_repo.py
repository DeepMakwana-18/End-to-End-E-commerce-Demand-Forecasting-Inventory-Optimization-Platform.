"""Alert repository — tenant-scoped alert CRUD + lifecycle."""

from typing import Optional, Sequence
from datetime import datetime, timezone
from sqlalchemy import select, func, desc, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InventoryAlert, Product, AlertSeverity
from app.core.base_repository import BaseRepository


class AlertRepository(BaseRepository[InventoryAlert]):

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, InventoryAlert, org_id)

    async def get_active_alerts(
        self,
        *,
        severity: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[dict]:
        """Get unresolved alerts with product names."""
        filters = [
            InventoryAlert.organization_id == self.org_id,
            InventoryAlert.is_resolved == False,
        ]
        if severity:
            filters.append(InventoryAlert.severity == severity)

        stmt = (
            select(InventoryAlert, Product.name.label("product_name"))
            .join(Product, InventoryAlert.product_id == Product.id)
            .where(*filters)
            .order_by(
                # Critical first, then by recency
                desc(
                    InventoryAlert.severity == AlertSeverity.CRITICAL
                ),
                InventoryAlert.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        alerts = []
        for alert, product_name in rows:
            alerts.append({
                "id": alert.id,
                "product_name": product_name,
                "product_id": alert.product_id,
                "alert_type": alert.alert_type.value,
                "severity": alert.severity.value,
                "message": alert.message,
                "is_resolved": alert.is_resolved,
                "created_at": alert.created_at.isoformat() if alert.created_at else None,
            })

        return alerts

    async def count_active(self) -> int:
        stmt = (
            select(func.count(InventoryAlert.id))
            .where(InventoryAlert.organization_id == self.org_id)
            .where(InventoryAlert.is_resolved == False)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def resolve(self, alert_id: int) -> bool:
        """Mark an alert as resolved."""
        alert = await self.get_by_id(alert_id)
        if alert is None:
            return False
        alert.is_resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        await self.session.flush()
        return True

    async def count_by_severity(self) -> dict[str, int]:
        stmt = (
            select(InventoryAlert.severity, func.count(InventoryAlert.id))
            .where(InventoryAlert.organization_id == self.org_id)
            .where(InventoryAlert.is_resolved == False)
            .group_by(InventoryAlert.severity)
        )
        result = await self.session.execute(stmt)
        return {row[0].value: row[1] for row in result.all()}
