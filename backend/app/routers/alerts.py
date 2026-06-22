"""Alerts API routes — Rule-driven with full lifecycle management.

Phase 5E-C additions:
  POST /alerts/{id}/acknowledge — active → acknowledged lifecycle
  POST /alerts/scan-inventory  — manually trigger inventory rule sweep
  Updated GET /alerts          — includes lifecycle, acknowledged_at, extra_data
  Updated _serialize_alert     — full Phase 5E-C fields
"""

import time
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.repositories.alert_repo import AlertRepository, _serialize_alert
from app.utils.email import send_alert_email

# ── Rate limiting (in-memory, per org_id) ───────────────────────────
EMAIL_RATE_LIMIT = 5
EMAIL_RATE_WINDOW = 300

_email_rate_store: dict[int, list[float]] = {}


def _check_email_rate(org_id: int) -> None:
    now = time.monotonic()
    window_start = now - EMAIL_RATE_WINDOW
    calls = _email_rate_store.get(org_id, [])
    calls = [t for t in calls if t > window_start]
    if len(calls) >= EMAIL_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Email rate limit exceeded: max {EMAIL_RATE_LIMIT} alerts "
                f"per {EMAIL_RATE_WINDOW // 60} minutes per organisation."
            ),
        )
    calls.append(now)
    _email_rate_store[org_id] = calls


# ── Router ─────────────────────────────────────────────────────────
router = APIRouter(prefix="/alerts", tags=["Alerts"])


class AlertPayload(BaseModel):
    sku: str
    message: str
    date: str


# ── Email alert (unchanged) ─────────────────────────────────────────

@router.post("/send-email")
async def trigger_email_alert(
    payload: AlertPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Trigger a background email alert.

    Rate-limited to 5 emails per 5 minutes per organisation.
    """
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions to send alerts")

    _check_email_rate(tenant.org_id)

    try:
        background_tasks.add_task(
            send_alert_email,
            sku=payload.sku,
            message=payload.message,
            date=payload.date,
        )
        return {
            "status": "success",
            "message": "Email alert queued for background dispatch.",
            "org_id": tenant.org_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Manual inventory rule scan ──────────────────────────────────────

@router.post("/scan-inventory")
async def scan_inventory_alerts(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Manually trigger inventory alert rule scan for the organisation.

    Runs R1 (critical inventory) and R2 (low inventory) rules immediately.
    Publishes alert.triggered events for each new alert created.
    Returns newly created alerts.
    """
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    from app.services.alert_engine import AlertRuleEngine
    from app.core.events import event_bus, DomainEvent, EventType

    engine = AlertRuleEngine(db, tenant.org_id)
    new_alerts = await engine.run_inventory_rules()
    await db.commit()

    # Publish alert.triggered events
    for alert in new_alerts:
        await event_bus.publish(
            DomainEvent(
                event_type=EventType.ALERT_TRIGGERED,
                org_id=tenant.org_id,
                user_id=tenant.user_id,
                payload={
                    "alert_id": alert.id,
                    "alert_type": alert.alert_type.value,
                    "severity": alert.severity.value,
                    "message": alert.message,
                    "product_id": alert.product_id,
                    "rule_key": alert.rule_key,
                    "source": "manual_scan",
                },
            )
        )

    return {
        "status": "scan_complete",
        "new_alerts": len(new_alerts),
        "alerts": [_serialize_alert(a) for a in new_alerts],
    }


# ── List alerts ─────────────────────────────────────────────────────

@router.get("")
async def get_all_alerts(
    severity: Optional[str] = None,
    resolved: bool = False,
    offset: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get all alerts for the organisation (tenant-scoped)."""
    repo = AlertRepository(db, tenant.org_id)
    if resolved:
        alerts_raw = await repo.get_all(filters={"is_resolved": True}, limit=limit)
        return {
            "alerts": [_serialize_alert(a) for a in alerts_raw],
            "total": len(alerts_raw),
        }

    alerts = await repo.get_active_alerts(severity=severity, offset=offset, limit=limit)
    return {"alerts": alerts, "total": len(alerts)}


# ── Acknowledge ─────────────────────────────────────────────────────

@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Acknowledge an alert — transitions from active → acknowledged.

    Publishes alert.acknowledged WS event.
    """
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    repo = AlertRepository(db, tenant.org_id)
    success = await repo.acknowledge(alert_id, user_id=tenant.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already resolved")

    await db.commit()

    # Publish WS event
    from app.core.events import event_bus, DomainEvent, EventType
    await event_bus.publish(
        DomainEvent(
            event_type=EventType.ALERT_ACKNOWLEDGED,
            org_id=tenant.org_id,
            user_id=tenant.user_id,
            payload={"alert_id": alert_id, "acknowledged_by": tenant.user_id},
        )
    )

    return {"status": "acknowledged", "id": alert_id}


# ── Resolve ─────────────────────────────────────────────────────────

@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Resolve an alert (tenant-scoped). Publishes alert.resolved WS event."""
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    repo = AlertRepository(db, tenant.org_id)
    success = await repo.resolve(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")

    await db.commit()

    # Publish WS event
    from app.core.events import event_bus, DomainEvent, EventType
    await event_bus.publish(
        DomainEvent(
            event_type=EventType.ALERT_RESOLVED,
            org_id=tenant.org_id,
            user_id=tenant.user_id,
            payload={"alert_id": alert_id},
        )
    )

    return {"status": "resolved", "id": alert_id}


# ── Dismiss ─────────────────────────────────────────────────────────

@router.delete("/{alert_id}")
async def dismiss_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Dismiss (soft-delete) an alert (tenant-scoped)."""
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    repo = AlertRepository(db, tenant.org_id)
    success = await repo.delete(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.commit()
    return {"status": "dismissed", "id": alert_id}


# ── Stats ───────────────────────────────────────────────────────────

@router.get("/stats")
async def get_alert_stats(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get alert statistics by severity (tenant-scoped)."""
    repo = AlertRepository(db, tenant.org_id)
    by_severity = await repo.count_by_severity()
    total = await repo.count_active()
    return {"total_active": total, "by_severity": by_severity}
