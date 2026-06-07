"""Celery tasks for automated anomaly detection.

Three task variants:
  1. run_anomaly_scan         — on-demand / triggered (upload, retrain)
  2. scheduled_anomaly_scan   — nightly beat task (auto-registered in celery_app.py)

Design:
  * Uses AnomalyService via a fresh async DB session (asyncio.run pattern,
    same as retraining_tasks.py).
  * Publishes 3 domain events via the in-process event bus:
      anomaly.scan.started
      anomaly.scan.completed
      anomaly.detected           (one per anomaly found, batched summary)
  * No duplicate detection logic — reuses AnomalyService.detect() exactly.
  * Tenant-safe: org_id is always an explicit parameter.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from app.celery_app import celery
from app.core.task_status import (
    set_task_status_sync,
    TASK_STATE_STARTED,
    TASK_STATE_COMPLETED,
    TASK_STATE_FAILED,
)
from app.core.events import EventType, DomainEvent

logger = logging.getLogger("titan.tasks.anomaly")


# ── Internal async runner ─────────────────────────────────────────────


async def _run_detection(
    org_id: int,
    lookback_weeks: int,
    z_threshold_low: float,
    z_threshold_medium: float,
    z_threshold_critical: float,
) -> dict:
    """Run anomaly detection inside a fresh async DB session.

    Returns the AnomalyDetectResponse as a plain dict.
    """
    from app.database import async_session
    from app.schemas.anomaly import AnomalyDetectRequest
    from app.services.anomaly_service import AnomalyService

    req = AnomalyDetectRequest(
        lookback_weeks=lookback_weeks,
        z_threshold_low=z_threshold_low,
        z_threshold_medium=z_threshold_medium,
        z_threshold_critical=z_threshold_critical,
    )

    async with async_session() as db:
        svc = AnomalyService(db=db, org_id=org_id)
        result = await svc.detect(req)

    return {
        "detected": result.detected,
        "demand_spikes": result.demand_spikes,
        "demand_drops": result.demand_drops,
        "inventory_shocks": result.inventory_shocks,
        "forecast_misses": result.forecast_misses,
        "critical": result.critical,
        "medium": result.medium,
        "low": result.low,
        "computation_seconds": result.computation_seconds,
    }


async def _publish_events(org_id: int, result: dict, trigger: str) -> None:
    """Publish domain events for the anomaly scan lifecycle."""
    from app.core.events import event_bus

    # anomaly.scan.completed
    await event_bus.publish(DomainEvent(
        event_type=EventType.ANOMALY_SCAN_COMPLETED,
        org_id=org_id,
        payload={
            "trigger": trigger,
            "detected": result["detected"],
            "critical": result["critical"],
            "medium": result["medium"],
            "low": result["low"],
            "demand_spikes": result["demand_spikes"],
            "demand_drops": result["demand_drops"],
            "inventory_shocks": result["inventory_shocks"],
            "forecast_misses": result["forecast_misses"],
            "computation_seconds": result["computation_seconds"],
        },
    ))

    # anomaly.detected — only if any were found
    if result["detected"] > 0:
        await event_bus.publish(DomainEvent(
            event_type=EventType.ANOMALY_DETECTED,
            org_id=org_id,
            payload={
                "count": result["detected"],
                "critical_count": result["critical"],
                "trigger": trigger,
            },
        ))


# ── On-demand / Triggered Task ────────────────────────────────────────


@celery.task(
    bind=True,
    name="titan.anomaly.scan",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
    time_limit=180,   # 3 min hard limit
    soft_time_limit=150,
)
def run_anomaly_scan(
    self,
    *,
    org_id: int,
    user_id: int | None = None,
    trigger: str = "manual",           # "upload", "retrain", "manual", "scheduled"
    lookback_weeks: int = 12,
    z_threshold_low: float = 2.0,
    z_threshold_medium: float = 3.0,
    z_threshold_critical: float = 4.0,
):
    """Celery task: run anomaly detection for an organisation.

    Parameters
    ----------
    org_id : int
        Tenant scope — anomalies are stored and isolated per org.
    user_id : int | None
        User who triggered the scan (None for scheduled runs).
    trigger : str
        Source of the trigger: "upload", "retrain", "manual", "scheduled".
    lookback_weeks : int
        How many weeks of history to analyse (default 12).
    z_threshold_low / medium / critical : float
        Z-score thresholds for severity classification.
    """
    task_id = self.request.id
    set_task_status_sync(
        task_id,
        state=TASK_STATE_STARTED,
        message=f"Anomaly scan starting (trigger={trigger})...",
        org_id=org_id,
        user_id=user_id,
    )

    # Publish scan.started event (fire-and-forget via new loop)
    try:
        from app.core.events import event_bus

        async def _started():
            await event_bus.publish(DomainEvent(
                event_type=EventType.ANOMALY_SCAN_STARTED,
                org_id=org_id,
                payload={"trigger": trigger, "lookback_weeks": lookback_weeks},
            ))

        asyncio.run(_started())
    except Exception:
        logger.warning("[org:%d] Could not publish anomaly.scan.started", org_id, exc_info=True)

    try:
        logger.info("[org:%d] Starting anomaly scan (trigger=%s, lookback=%dw)", org_id, trigger, lookback_weeks)

        result = asyncio.run(_run_detection(
            org_id=org_id,
            lookback_weeks=lookback_weeks,
            z_threshold_low=z_threshold_low,
            z_threshold_medium=z_threshold_medium,
            z_threshold_critical=z_threshold_critical,
        ))

        # Publish completion events
        try:
            asyncio.run(_publish_events(org_id=org_id, result=result, trigger=trigger))
        except Exception:
            logger.warning("[org:%d] Could not publish anomaly completion events", org_id, exc_info=True)

        # Mark Celery task complete
        msg = (
            f"Scan complete: {result['detected']} anomalies "
            f"(critical={result['critical']}, medium={result['medium']}, low={result['low']}) "
            f"in {result['computation_seconds']:.2f}s"
        )
        set_task_status_sync(
            task_id,
            state=TASK_STATE_COMPLETED,
            progress=100,
            message=msg,
            result=result,
            org_id=org_id,
            user_id=user_id,
        )

        logger.info("[org:%d] Anomaly scan done: %d found", org_id, result["detected"])
        return result

    except Exception as exc:
        logger.exception("[org:%d] Anomaly scan failed", org_id)
        set_task_status_sync(
            task_id,
            state=TASK_STATE_FAILED,
            message="Anomaly scan failed",
            error=str(exc),
            org_id=org_id,
            user_id=user_id,
        )
        raise self.retry(exc=exc)


# ── Nightly Scheduled Task ────────────────────────────────────────────


@celery.task(
    bind=True,
    name="titan.anomaly.nightly_scan",
    max_retries=1,
    default_retry_delay=60,
    acks_late=True,
    time_limit=300,
    soft_time_limit=240,
)
def scheduled_anomaly_scan(self):
    """Nightly Celery beat task: scan ALL organisations for anomalies.

    Iterates over all active organizations and dispatches an individual
    run_anomaly_scan task per org (fan-out pattern).
    """
    logger.info("[nightly] Starting scheduled anomaly scan for all orgs")
    try:
        async def _get_all_org_ids() -> list[int]:
            from app.database import async_session
            from sqlalchemy import select
            from app.models import Organization
            async with async_session() as db:
                result = await db.execute(
                    select(Organization.id).where(Organization.is_active == True)  # noqa: E712
                )
                return list(result.scalars().all())

        org_ids = asyncio.run(_get_all_org_ids())
        logger.info("[nightly] Dispatching anomaly scan for %d org(s): %s", len(org_ids), org_ids)

        dispatched = 0
        for org_id in org_ids:
            try:
                run_anomaly_scan.apply_async(
                    kwargs={
                        "org_id": org_id,
                        "user_id": None,
                        "trigger": "scheduled",
                        "lookback_weeks": 12,
                        "z_threshold_low": 2.0,
                        "z_threshold_medium": 3.0,
                        "z_threshold_critical": 4.0,
                    },
                    countdown=dispatched * 5,   # stagger by 5s per org
                )
                dispatched += 1
                logger.info("[nightly] Queued anomaly scan for org_id=%d", org_id)
            except Exception:
                logger.exception("[nightly] Failed to queue scan for org_id=%d", org_id)

        return {"dispatched": dispatched, "org_ids": org_ids}

    except Exception as exc:
        logger.exception("[nightly] Scheduled scan failed")
        raise self.retry(exc=exc)
