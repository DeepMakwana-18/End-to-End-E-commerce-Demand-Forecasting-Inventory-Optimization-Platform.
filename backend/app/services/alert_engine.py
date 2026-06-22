"""Alert Rule Engine — Phase 5E-C.

Centralized, deterministic rule processor.  Every rule:
  - evaluates a specific condition against live DB data
  - produces a *deterministic* rule_key so duplicates can be avoided
  - persists a new InventoryAlert only if no active alert with that key exists
  - returns a list of newly created alerts for event publishing

Design goals:
  - Stateless: all state lives in the DB / passed as arguments
  - Tenant-scoped: every query is filtered by org_id
  - Idempotent: safe to call multiple times; duplicates are silently skipped
  - No external dependencies beyond SQLAlchemy and the existing models

Rule registry (5 initial rules):
  R1_CRITICAL_INVENTORY   — Inventory status == CRITICAL
  R2_LOW_INVENTORY        — current_stock < reorder_point (not already CRITICAL)
  R3_FORECAST_MISS        — anomaly of type DEMAND_SPIKE or TREND_BREAK with high MAE
  R4_ANOMALY_DETECTED     — critical/high anomaly from scan results
  R5_MODEL_ACCURACY       — retrained model accuracy below threshold
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    InventoryAlert, AlertType, AlertSeverity,
    Inventory, InventoryStatus, Product,
)
from app.models.anomaly import Anomaly, AnomalySeverity, AnomalyType

logger = logging.getLogger("titan.alert_engine")

# ── Thresholds ──────────────────────────────────────────────────────────────

# Minimum model accuracy before we raise a degradation alert
ACCURACY_CRITICAL_THRESHOLD = 0.60  # below this → critical
ACCURACY_HIGH_THRESHOLD = 0.70      # below this → high severity


# ── Helper ──────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _find_active_by_rule_key(
    db: AsyncSession,
    org_id: int,
    rule_key: str,
) -> InventoryAlert | None:
    """Return an existing *unresolved* alert matching this rule_key, or None."""
    stmt = (
        select(InventoryAlert)
        .where(
            and_(
                InventoryAlert.organization_id == org_id,
                InventoryAlert.rule_key == rule_key,
                InventoryAlert.is_resolved == False,  # noqa: E712
            )
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _create_alert(
    db: AsyncSession,
    *,
    org_id: int,
    product_id: int | None,
    alert_type: AlertType,
    severity: AlertSeverity,
    message: str,
    rule_key: str,
    source_event_id: str | None = None,
    extra_data: dict | None = None,
) -> InventoryAlert | None:
    """Create a new alert only if no active alert with same rule_key exists (dedup)."""
    existing = await _find_active_by_rule_key(db, org_id, rule_key)
    if existing:
        logger.debug(
            "[org:%s] Skipping duplicate alert (rule_key=%s, existing_id=%s)",
            org_id, rule_key, existing.id,
        )
        return None

    alert = InventoryAlert(
        organization_id=org_id,
        product_id=product_id,
        alert_type=alert_type,
        severity=severity,
        message=message,
        rule_key=rule_key,
        source_event_id=source_event_id,
        extra_data=extra_data or {},
        is_resolved=False,
        created_at=_utcnow(),
    )
    db.add(alert)
    await db.flush()  # populate alert.id without committing
    logger.info(
        "[org:%s] Alert created: type=%s severity=%s product_id=%s rule_key=%s",
        org_id, alert_type.value, severity.value, product_id, rule_key,
    )
    return alert


# ── Rule Engine ─────────────────────────────────────────────────────────────


class AlertRuleEngine:
    """Evaluate alert rules and persist new InventoryAlert rows."""

    def __init__(self, db: AsyncSession, org_id: int) -> None:
        self.db = db
        self.org_id = org_id

    # ── R1 + R2: Inventory Rules ─────────────────────────────────────

    async def run_inventory_rules(self) -> list[InventoryAlert]:
        """Scan all inventory for the org and create alerts as needed."""
        stmt = (
            select(Inventory, Product)
            .join(Product, Inventory.product_id == Product.id)
            .where(Inventory.organization_id == self.org_id)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        created: list[InventoryAlert] = []

        for inv, product in rows:
            alert = await self._eval_inventory_item(inv, product)
            if alert:
                created.append(alert)

        return created

    async def _eval_inventory_item(
        self,
        inv: Inventory,
        product: Product,
    ) -> InventoryAlert | None:
        """Apply R1 (critical) and R2 (low stock) to a single inventory record."""

        # R1 — Critical Inventory Risk
        if inv.status == InventoryStatus.CRITICAL or inv.current_stock == 0:
            rule_key = f"critical_inventory:product:{inv.product_id}:org:{self.org_id}"
            return await _create_alert(
                self.db,
                org_id=self.org_id,
                product_id=inv.product_id,
                alert_type=AlertType.STOCKOUT,
                severity=AlertSeverity.CRITICAL,
                message=(
                    f"CRITICAL: {product.name} (SKU {product.sku}) "
                    f"has {inv.current_stock} units — at or near stockout. "
                    f"Reorder point is {inv.reorder_point}."
                ),
                rule_key=rule_key,
                extra_data={
                    "current_stock": inv.current_stock,
                    "reorder_point": inv.reorder_point,
                    "safety_stock": inv.safety_stock,
                    "health_score": inv.health_score,
                    "sku": product.sku,
                },
            )

        # R2 — Low Inventory Threshold
        if inv.current_stock < inv.reorder_point and inv.status == InventoryStatus.LOW:
            shortage = inv.reorder_point - inv.current_stock
            severity = (
                AlertSeverity.HIGH
                if shortage > inv.safety_stock
                else AlertSeverity.MEDIUM
            )
            rule_key = f"low_inventory:product:{inv.product_id}:org:{self.org_id}"
            return await _create_alert(
                self.db,
                org_id=self.org_id,
                product_id=inv.product_id,
                alert_type=AlertType.LOW_STOCK,
                severity=severity,
                message=(
                    f"{product.name} (SKU {product.sku}) is below reorder point. "
                    f"Current: {inv.current_stock} units, "
                    f"Reorder at: {inv.reorder_point}, "
                    f"Shortage: {shortage} units."
                ),
                rule_key=rule_key,
                extra_data={
                    "current_stock": inv.current_stock,
                    "reorder_point": inv.reorder_point,
                    "shortage": shortage,
                    "safety_stock": inv.safety_stock,
                    "sku": product.sku,
                },
            )

        return None

    # ── R3 + R4: Anomaly Rules ───────────────────────────────────────

    async def run_anomaly_rules(
        self,
        anomaly_ids: list[int] | None = None,
        source_event_id: str | None = None,
    ) -> list[InventoryAlert]:
        """Create alerts for critical/high anomalies found in the last scan."""
        stmt = select(Anomaly).where(
            and_(
                Anomaly.organization_id == self.org_id,
                Anomaly.is_resolved == False,  # noqa: E712
                Anomaly.severity.in_([AnomalySeverity.CRITICAL, AnomalySeverity.MEDIUM]),
            )
        )
        if anomaly_ids:
            stmt = stmt.where(Anomaly.id.in_(anomaly_ids))

        result = await self.db.execute(stmt)
        anomalies: Sequence[Anomaly] = result.scalars().all()

        created: list[InventoryAlert] = []

        for anomaly in anomalies:
            alert = await self._eval_anomaly(anomaly, source_event_id)
            if alert:
                created.append(alert)

        return created

    async def _eval_anomaly(
        self,
        anomaly: Anomaly,
        source_event_id: str | None = None,
    ) -> InventoryAlert | None:
        """R3/R4 — Create alert for a high/critical anomaly."""
        # Skip org-level anomalies (no product_id) — inventory_alerts requires product_id
        if anomaly.product_id is None:
            return None

        severity = (
            AlertSeverity.CRITICAL
            if anomaly.severity == AnomalySeverity.CRITICAL
            else AlertSeverity.MEDIUM
        )

        # Distinguish forecast miss (R3) vs general anomaly (R4)
        is_forecast_miss = anomaly.anomaly_type in (
            AnomalyType.DEMAND_SPIKE, AnomalyType.DEMAND_DROP,
        )
        alert_type = AlertType.FORECAST_MISS if is_forecast_miss else AlertType.ANOMALY_DETECTED

        rule_key = f"anomaly:{anomaly.id}:org:{self.org_id}"

        product_id = anomaly.product_id if hasattr(anomaly, "product_id") else None

        # Try to get product name
        product_name = "Unknown Product"
        if product_id:
            prod_result = await self.db.execute(
                select(Product.name).where(Product.id == product_id)
            )
            pname = prod_result.scalar_one_or_none()
            if pname:
                product_name = pname

        z = float(anomaly.z_score) if anomaly.z_score is not None else 0.0
        return await _create_alert(
            self.db,
            org_id=self.org_id,
            product_id=product_id,
            alert_type=alert_type,
            severity=severity,
            message=(
                f"{'Forecast miss' if is_forecast_miss else 'Anomaly'} detected "
                f"for {product_name}: {anomaly.explanation or anomaly.anomaly_type.value}. "
                f"Z-score: {z:.2f}."
            ),
            rule_key=rule_key,
            source_event_id=source_event_id,
            extra_data={
                "anomaly_id": anomaly.id,
                "anomaly_type": anomaly.anomaly_type.value,
                "z_score": z,
                "product_id": product_id,
            },
        )

    # ── R5: Model Accuracy Rule ──────────────────────────────────────

    async def run_model_accuracy_rule(
        self,
        accuracy: float,
        version_tag: str,
        source_event_id: str | None = None,
    ) -> InventoryAlert | None:
        """R5 — Raise alert if retrained model accuracy has degraded."""
        if accuracy >= ACCURACY_HIGH_THRESHOLD:
            return None  # Model is fine

        severity = (
            AlertSeverity.CRITICAL
            if accuracy < ACCURACY_CRITICAL_THRESHOLD
            else AlertSeverity.HIGH
        )

        rule_key = f"model_accuracy:{version_tag}:org:{self.org_id}"

        return await _create_alert(
            self.db,
            org_id=self.org_id,
            product_id=None,
            alert_type=AlertType.MODEL_ACCURACY_DEGRADED,
            severity=severity,
            message=(
                f"Model accuracy degraded: {version_tag} achieved only "
                f"{accuracy:.1%} accuracy (threshold: {ACCURACY_HIGH_THRESHOLD:.0%}). "
                f"Consider retraining with more data or investigating data quality."
            ),
            rule_key=rule_key,
            source_event_id=source_event_id,
            extra_data={
                "accuracy": accuracy,
                "version_tag": version_tag,
                "threshold": ACCURACY_HIGH_THRESHOLD,
            },
        )
