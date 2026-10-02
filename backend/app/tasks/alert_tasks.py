"""Celery tasks for the Alert Rule Engine (Phase 5E-C).

Tasks:
  run_inventory_alert_sweep  — Scan all inventory for rule violations, create alerts
"""

import asyncio
import logging

from app.celery_app import celery

logger = logging.getLogger("titan.tasks.alerts")


@celery.task(
    bind=True,
    name="titan.alerts.inventory_sweep",
    max_retries=0,
    acks_late=True,
    time_limit=300,
    soft_time_limit=240,
)
def run_inventory_alert_sweep(self, *, org_id: int | None = None, user_id: int | None = None):
    """Scan inventory for rule violations and create alerts.

    When org_id is None (beat schedule call without kwargs), iterates over ALL
    active organizations so every tenant is covered.

    When org_id is provided (direct API/UI call), scans only that org.

    Safe to run repeatedly — duplicate prevention via rule_key.
    """
    async def _get_all_org_ids() -> list[int]:
        from app.database import async_session
        from sqlalchemy import select
        from app.models import Organization
        async with async_session() as db:
            result = await db.execute(
                select(Organization.id).where(Organization.is_active == True)  # noqa: E712
            )
            return [row[0] for row in result.fetchall()]

    async def _sweep_org(target_org_id: int) -> int:
        from app.database import async_session
        from app.services.alert_engine import AlertRuleEngine
        from app.core.events import event_bus, DomainEvent, EventType

        created_count = 0
        async with async_session() as db:
            engine = AlertRuleEngine(db, target_org_id)
            new_alerts = await engine.run_inventory_rules()
            await db.commit()

            for alert in new_alerts:
                created_count += 1
                await event_bus.publish(
                    DomainEvent(
                        event_type=EventType.ALERT_TRIGGERED,
                        org_id=target_org_id,
                        user_id=user_id,
                        payload={
                            "alert_id": alert.id,
                            "alert_type": alert.alert_type.value,
                            "severity": alert.severity.value,
                            "message": alert.message,
                            "product_id": alert.product_id,
                            "rule_key": alert.rule_key,
                            "source": "inventory_sweep",
                        },
                    )
                )

        logger.info("[org:%s] Alert sweep complete: %d new alerts", target_org_id, created_count)
        return created_count

    try:
        if org_id is not None:
            logger.info("[org:%s] Starting targeted inventory alert sweep...", org_id)
            total = asyncio.run(_sweep_org(org_id))
            return {"created": total, "org_id": org_id}
        else:
            # Beat schedule: sweep every active org
            org_ids = asyncio.run(_get_all_org_ids())
            logger.info("[beat] Inventory alert sweep dispatched for %d org(s)", len(org_ids))
            results: dict = {}
            for oid in org_ids:
                try:
                    results[oid] = asyncio.run(_sweep_org(oid))
                except Exception:
                    logger.exception("[org:%s] Alert sweep failed", oid)
                    results[oid] = -1
            return {"orgs": results}
    except Exception:
        logger.exception("Inventory alert sweep failed (org_id=%s)", org_id)
        raise
