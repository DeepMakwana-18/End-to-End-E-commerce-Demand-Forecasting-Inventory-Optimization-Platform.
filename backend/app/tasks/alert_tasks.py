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
    time_limit=120,
    soft_time_limit=90,
)
def run_inventory_alert_sweep(self, *, org_id: int, user_id: int | None = None):
    """Scan inventory for all active products and create rule-based alerts.

    Publishes alert.triggered events for each new alert created.
    Safe to run repeatedly — duplicate prevention via rule_key.
    """
    logger.info("[org:%s] Starting inventory alert sweep...", org_id)

    async def _sweep():
        from app.database import async_session
        from app.services.alert_engine import AlertRuleEngine
        from app.core.events import event_bus, DomainEvent, EventType

        created_count = 0
        async with async_session() as db:
            engine = AlertRuleEngine(db, org_id)
            new_alerts = await engine.run_inventory_rules()
            await db.commit()

            # Publish alert.triggered for each new alert
            for alert in new_alerts:
                created_count += 1
                await event_bus.publish(
                    DomainEvent(
                        event_type=EventType.ALERT_TRIGGERED,
                        org_id=org_id,
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

        logger.info(
            "[org:%s] Inventory alert sweep complete: %d new alerts",
            org_id, created_count,
        )
        return {"created": created_count, "org_id": org_id}

    try:
        return asyncio.run(_sweep())
    except Exception as exc:
        logger.exception("[org:%s] Inventory alert sweep failed", org_id)
        raise
