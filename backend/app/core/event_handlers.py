"""Event handler registrations.

Wires domain events to side-effects:
  • WebSocket broadcasts  (deferred — wired when WS manager is available)
  • Audit log persistence
  • Cache invalidation
  • Logging

Called once during application startup from main.py lifespan.
"""

from __future__ import annotations

import logging
from app.core.events import event_bus, DomainEvent, EventType

logger = logging.getLogger("titan.events.handlers")

# Reference to WS manager — set during startup by main.py
_ws_manager = None


def set_ws_manager(manager) -> None:
    """Inject the WebSocket connection manager (Phase 2.5B)."""
    global _ws_manager
    _ws_manager = manager


# ── Handler Implementations ─────────────────────────────────────────


async def _broadcast_to_org(event: DomainEvent) -> None:
    """Forward any event to the WebSocket manager for tenant broadcast."""
    if _ws_manager is None:
        return
    await _ws_manager.broadcast_to_org(
        org_id=event.org_id,
        event_type=event.event_type,
        data={
            "event_id": event.event_id,
            "payload": event.payload,
            "timestamp": event.timestamp,
        },
    )


async def on_alert_triggered(event: DomainEvent) -> None:
    """Handle new inventory alerts — broadcast + log."""
    logger.info(
        "[org:%s] Alert triggered: %s",
        event.org_id,
        event.payload.get("message", ""),
    )
    await _broadcast_to_org(event)


async def on_model_retrained(event: DomainEvent) -> None:
    """Handle model retrain completion — broadcast + invalidate forecast cache."""
    logger.info(
        "[org:%s] Model retrained: version=%s accuracy=%.2f%%",
        event.org_id,
        event.payload.get("version_tag", "?"),
        event.payload.get("accuracy", 0) * 100,
    )
    # Invalidate forecast cache for this org
    try:
        from app.core.cache import cache_delete_pattern
        await cache_delete_pattern(f"titan:org:{event.org_id}:forecast:*")
        await cache_delete_pattern(f"titan:org:{event.org_id}:dashboard:*")
    except Exception:
        logger.warning("Cache invalidation failed after retrain")

    await _broadcast_to_org(event)


async def on_task_progress(event: DomainEvent) -> None:
    """Stream task progress to the user who initiated it."""
    await _broadcast_to_org(event)


async def on_task_completed(event: DomainEvent) -> None:
    """Notify on task completion."""
    logger.info(
        "[org:%s] Task completed: %s",
        event.org_id,
        event.payload.get("task_name", "unknown"),
    )
    await _broadcast_to_org(event)


async def on_task_failed(event: DomainEvent) -> None:
    """Log and broadcast task failures."""
    logger.error(
        "[org:%s] Task FAILED: %s — %s",
        event.org_id,
        event.payload.get("task_name", "unknown"),
        event.payload.get("error", ""),
    )
    await _broadcast_to_org(event)


async def on_forecast_generated(event: DomainEvent) -> None:
    """Broadcast dashboard refresh on new forecasts."""
    await _broadcast_to_org(event)


async def on_report_generated(event: DomainEvent) -> None:
    """Notify user their report is ready."""
    logger.info(
        "[org:%s] Report ready: %s",
        event.org_id,
        event.payload.get("report_name", ""),
    )
    await _broadcast_to_org(event)


async def on_user_action(event: DomainEvent) -> None:
    """Audit log writer — persists user actions to the audit_logs table.

    Full DB persistence is wired in Phase 2.5C (audit.py).
    For now, structured log output is sufficient.
    """
    logger.info(
        "[org:%s] AUDIT user=%s action=%s resource=%s/%s",
        event.org_id,
        event.user_id,
        event.payload.get("action", "?"),
        event.payload.get("resource_type", "?"),
        event.payload.get("resource_id", "?"),
    )


async def on_anomaly_scan_started(event: DomainEvent) -> None:
    """Log anomaly scan start."""
    logger.info(
        "[org:%s] Anomaly scan started (trigger=%s, lookback=%dw)",
        event.org_id,
        event.payload.get("trigger", "unknown"),
        event.payload.get("lookback_weeks", 12),
    )
    await _broadcast_to_org(event)


async def on_anomaly_scan_completed(event: DomainEvent) -> None:
    """Log anomaly scan completion and broadcast summary to UI."""
    payload = event.payload
    logger.info(
        "[org:%s] Anomaly scan complete (trigger=%s): %d found "
        "[critical=%d medium=%d low=%d] in %.2fs",
        event.org_id,
        payload.get("trigger", "unknown"),
        payload.get("detected", 0),
        payload.get("critical", 0),
        payload.get("medium", 0),
        payload.get("low", 0),
        payload.get("computation_seconds", 0.0),
    )
    await _broadcast_to_org(event)


async def on_anomaly_detected(event: DomainEvent) -> None:
    """Log that anomalies were found — broadcast for UI refresh."""
    logger.warning(
        "[org:%s] ANOMALY DETECTED: count=%d critical=%d (trigger=%s)",
        event.org_id,
        event.payload.get("count", 0),
        event.payload.get("critical_count", 0),
        event.payload.get("trigger", "unknown"),
    )
    await _broadcast_to_org(event)


# ── Registration ────────────────────────────────────────────────────


def register_event_handlers() -> None:
    """Register all event handlers with the global event bus.

    Called once from main.py lifespan startup.
    """
    event_bus.subscribe(EventType.ALERT_TRIGGERED, on_alert_triggered)
    event_bus.subscribe(EventType.ALERT_RESOLVED, _broadcast_to_org)
    event_bus.subscribe(EventType.MODEL_RETRAINED, on_model_retrained)
    event_bus.subscribe(EventType.MODEL_RETRAIN_STARTED, _broadcast_to_org)
    event_bus.subscribe(EventType.MODEL_RETRAIN_PROGRESS, on_task_progress)
    event_bus.subscribe(EventType.TASK_STARTED, _broadcast_to_org)
    event_bus.subscribe(EventType.TASK_PROGRESS, on_task_progress)
    event_bus.subscribe(EventType.TASK_COMPLETED, on_task_completed)
    event_bus.subscribe(EventType.TASK_FAILED, on_task_failed)
    event_bus.subscribe(EventType.FORECAST_GENERATED, on_forecast_generated)
    event_bus.subscribe(EventType.REPORT_GENERATED, on_report_generated)
    event_bus.subscribe(EventType.USER_ACTION, on_user_action)
    event_bus.subscribe(EventType.USER_LOGIN, on_user_action)
    # Anomaly events
    event_bus.subscribe(EventType.ANOMALY_SCAN_STARTED, on_anomaly_scan_started)
    event_bus.subscribe(EventType.ANOMALY_SCAN_COMPLETED, on_anomaly_scan_completed)
    event_bus.subscribe(EventType.ANOMALY_DETECTED, on_anomaly_detected)

    logger.info("✅ Event handlers registered (%d types)", len(event_bus._handlers))
