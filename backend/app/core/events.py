"""In-process async domain event bus.

Provides a lightweight pub/sub system for the modular monolith.
Events are dispatched asynchronously to all registered handlers within the
same process.  No external message broker required — Celery handles
cross-process orchestration separately.

Usage:
    from app.core.events import event_bus, DomainEvent, EventType

    # Subscribe
    @event_bus.on(EventType.MODEL_RETRAINED)
    async def handle_retrain(event: DomainEvent):
        ...

    # Publish
    await event_bus.publish(DomainEvent(
        event_type=EventType.MODEL_RETRAINED,
        org_id=1,
        user_id=2,
        payload={"version": "v3.0"},
    ))
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

logger = logging.getLogger("titan.events")


# ── Event Type Constants ────────────────────────────────────────────


class EventType:
    """Namespaced event type constants."""

    # Forecasting
    FORECAST_GENERATED = "forecast.generated"
    FORECAST_FAILED = "forecast.failed"

    # ML
    MODEL_RETRAINED = "model.retrained"
    MODEL_RETRAIN_STARTED = "model.retrain_started"
    MODEL_RETRAIN_PROGRESS = "model.retrain_progress"
    MODEL_ROLLBACK = "model.rollback"

    # Inventory
    INVENTORY_CRITICAL = "inventory.critical"
    INVENTORY_UPDATED = "inventory.updated"

    # Alerts
    ALERT_TRIGGERED = "alert.triggered"
    ALERT_RESOLVED = "alert.resolved"
    ALERT_ACKNOWLEDGED = "alert.acknowledged"

    # Tasks
    TASK_STARTED = "task.started"
    TASK_PROGRESS = "task.progress"
    TASK_COMPLETED = "task.completed"
    TASK_FAILED = "task.failed"

    # User / Auth
    USER_LOGIN = "user.login"
    USER_ACTION = "user.action"

    # Reports
    REPORT_GENERATED = "report.generated"
    REPORT_FAILED = "report.failed"

    # Notifications
    NOTIFICATION_SENT = "notification.sent"

    # Anomaly Detection
    ANOMALY_SCAN_STARTED = "anomaly.scan.started"
    ANOMALY_SCAN_COMPLETED = "anomaly.scan.completed"
    ANOMALY_DETECTED = "anomaly.detected"


# ── Domain Event ────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class DomainEvent:
    """Immutable domain event that travels through the event bus."""

    event_type: str
    org_id: int
    payload: dict[str, Any] = field(default_factory=dict)
    user_id: int | None = None
    event_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    correlation_id: str | None = None


# ── Event Bus ───────────────────────────────────────────────────────

# Handler type: async callable that accepts a DomainEvent
EventHandler = Callable[[DomainEvent], Coroutine[Any, Any, None]]


class EventBus:
    """Async in-process event dispatcher.

    Handlers are registered per event_type.  A wildcard handler ("*")
    receives *all* events (useful for audit logging / metrics).

    Failures in individual handlers are logged but do NOT prevent other
    handlers from executing.
    """

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}
        self._started = False

    # ── Registration ────────────────────────────────────────────────

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """Register a handler for an event type."""
        self._handlers.setdefault(event_type, []).append(handler)
        logger.debug("Subscribed %s to %s", handler.__name__, event_type)

    def on(self, event_type: str):
        """Decorator form of subscribe."""

        def decorator(fn: EventHandler) -> EventHandler:
            self.subscribe(event_type, fn)
            return fn

        return decorator

    # ── Publishing ──────────────────────────────────────────────────

    async def publish(self, event: DomainEvent) -> None:
        """Dispatch an event to all matching handlers + wildcard handlers."""
        handlers = list(self._handlers.get(event.event_type, []))
        handlers.extend(self._handlers.get("*", []))

        if not handlers:
            logger.debug("No handlers for event %s", event.event_type)
            return

        logger.info(
            "Publishing %s (id=%s, org=%s) to %d handler(s)",
            event.event_type,
            event.event_id,
            event.org_id,
            len(handlers),
        )

        tasks = [self._safe_call(handler, event) for handler in handlers]
        await asyncio.gather(*tasks)

    async def _safe_call(self, handler: EventHandler, event: DomainEvent) -> None:
        """Call a handler, catching and logging any exceptions."""
        try:
            await handler(event)
        except Exception:
            logger.exception(
                "Handler %s failed for event %s (id=%s)",
                handler.__name__,
                event.event_type,
                event.event_id,
            )

    # ── Lifecycle ───────────────────────────────────────────────────

    def clear(self) -> None:
        """Remove all handlers (useful for testing)."""
        self._handlers.clear()


# ── Singleton ───────────────────────────────────────────────────────

event_bus = EventBus()
