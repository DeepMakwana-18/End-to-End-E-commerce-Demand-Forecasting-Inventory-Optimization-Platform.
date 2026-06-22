"""Alert repository — tenant-scoped alert CRUD + lifecycle.

Phase 5E-C additions:
  - get_by_rule_key()  : dedup lookup used by alert_engine.py
  - acknowledge()      : active → acknowledged lifecycle transition
  - get_active_alerts(): extended with new Phase 5E-C fields
"""

from typing import Optional, Sequence
from datetime import datetime, timezone
from sqlalchemy import select, func, desc, update as sa_update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InventoryAlert, Product, AlertSeverity
from app.core.base_repository import BaseRepository


class AlertRepository(BaseRepository[InventoryAlert]):

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, InventoryAlert, org_id)

    # ── Dedup ────────────────────────────────────────────────────────────

    async def get_by_rule_key(self, rule_key: str) -> Optional[InventoryAlert]:
        """Return an active (unresolved) alert with this rule_key, or None."""
        stmt = (
            select(InventoryAlert)
            .where(
                and_(
                    InventoryAlert.organization_id == self.org_id,
                    InventoryAlert.rule_key == rule_key,
                    InventoryAlert.is_resolved == False,  # noqa: E712
                )
            )
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # ── Lifecycle ────────────────────────────────────────────────────────

    async def acknowledge(self, alert_id: int, user_id: int) -> bool:
        """Mark an alert as acknowledged (active → acknowledged)."""
        alert = await self.get_by_id(alert_id)
        if alert is None:
            return False
        if alert.is_resolved:
            return False  # already resolved — don't acknowledge
        alert.acknowledged_at = datetime.now(timezone.utc)
        alert.acknowledged_by = user_id
        await self.session.flush()
        return True

    async def resolve(self, alert_id: int) -> bool:
        """Mark an alert as resolved (active or acknowledged → resolved)."""
        alert = await self.get_by_id(alert_id)
        if alert is None:
            return False
        alert.is_resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        await self.session.flush()
        return True

    # ── Queries ──────────────────────────────────────────────────────────

    async def get_active_alerts(
        self,
        *,
        severity: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[dict]:
        """Get unresolved alerts with product names (full Phase 5E-C fields)."""
        filters = [
            InventoryAlert.organization_id == self.org_id,
            InventoryAlert.is_resolved == False,  # noqa: E712
        ]
        if severity:
            filters.append(InventoryAlert.severity == severity)

        stmt = (
            select(InventoryAlert, Product.name.label("product_name"))
            .outerjoin(Product, InventoryAlert.product_id == Product.id)
            .where(*filters)
            .order_by(
                # Critical first, then by recency
                desc(InventoryAlert.severity == AlertSeverity.CRITICAL),
                InventoryAlert.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        alerts = []
        for alert, product_name in rows:
            alerts.append(_serialize_alert(alert, product_name))

        return alerts

    async def count_active(self) -> int:
        stmt = (
            select(func.count(InventoryAlert.id))
            .where(InventoryAlert.organization_id == self.org_id)
            .where(InventoryAlert.is_resolved == False)  # noqa: E712
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def count_by_severity(self) -> dict[str, int]:
        stmt = (
            select(InventoryAlert.severity, func.count(InventoryAlert.id))
            .where(InventoryAlert.organization_id == self.org_id)
            .where(InventoryAlert.is_resolved == False)  # noqa: E712
            .group_by(InventoryAlert.severity)
        )
        result = await self.session.execute(stmt)
        return {row[0].value: row[1] for row in result.all()}


# ── Serialiser ───────────────────────────────────────────────────────────────

def _serialize_alert(alert: InventoryAlert, product_name: Optional[str] = None) -> dict:
    """Full serialization including Phase 5E-C lifecycle fields."""
    # Determine lifecycle state
    if alert.is_resolved:
        lifecycle = "resolved"
    elif alert.acknowledged_at is not None:
        lifecycle = "acknowledged"
    else:
        lifecycle = "active"

    return {
        "id": alert.id,
        "product_id": alert.product_id,
        "product_name": product_name or "",
        "alert_type": alert.alert_type.value if alert.alert_type else "",
        "severity": alert.severity.value if alert.severity else "",
        "message": alert.message,
        "is_resolved": alert.is_resolved,
        "lifecycle": lifecycle,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
        "acknowledged_by": alert.acknowledged_by,
        "rule_key": alert.rule_key,
        "source_event_id": alert.source_event_id,
        "extra_data": alert.extra_data or {},
    }
