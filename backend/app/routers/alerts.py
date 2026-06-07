"""Alerts API routes — DB-backed with email integration.

Phase 5: Secured under /api/v1/alerts with full tenant context
and per-organisation rate limiting on the send-email endpoint.
"""

import time
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.repositories.alert_repo import AlertRepository
from app.utils.email import send_alert_email

# ── Rate limiting (in-memory, per org_id) ───────────────────────────
# Allows at most EMAIL_RATE_LIMIT calls per EMAIL_RATE_WINDOW seconds.
EMAIL_RATE_LIMIT = 5        # max emails
EMAIL_RATE_WINDOW = 300     # per 5 minutes

_email_rate_store: dict[int, list[float]] = {}


def _check_email_rate(org_id: int) -> None:
    """Raise 429 if the org has exceeded the email rate limit."""
    now = time.monotonic()
    window_start = now - EMAIL_RATE_WINDOW
    calls = _email_rate_store.get(org_id, [])
    # Prune old entries
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
# prefix is /alerts — registered in main.py under /api/v1
router = APIRouter(prefix="/alerts", tags=["Alerts"])


class AlertPayload(BaseModel):
    sku: str
    message: str
    date: str


@router.post("/send-email")
async def trigger_email_alert(
    payload: AlertPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Trigger a background email alert.

    Requires authentication and tenant context.
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


@router.get("")
async def get_all_alerts(
    severity: Optional[str] = None,
    resolved: bool = False,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get all alerts for the organisation (tenant-scoped)."""
    repo = AlertRepository(db, tenant.org_id)
    if resolved:
        alerts = await repo.get_all(filters={"is_resolved": True}, limit=50)
        return {"alerts": [_serialize_alert(a) for a in alerts], "total": len(alerts)}

    alerts = await repo.get_active_alerts(severity=severity)
    return {"alerts": alerts, "total": len(alerts)}


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Resolve an alert (tenant-scoped)."""
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    repo = AlertRepository(db, tenant.org_id)
    success = await repo.resolve(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "resolved", "id": alert_id}


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
    return {"status": "dismissed", "id": alert_id}


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


def _serialize_alert(alert):
    return {
        "id": alert.id,
        "product_id": alert.product_id,
        "alert_type": alert.alert_type.value if alert.alert_type else "",
        "severity": alert.severity.value if alert.severity else "",
        "message": alert.message,
        "is_resolved": alert.is_resolved,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    }
