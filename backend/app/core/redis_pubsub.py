"""Redis Pub/Sub bridge — cross-process event transport.

Solves the process-boundary problem between Celery workers and the FastAPI
WebSocket process.  The in-process ``event_bus`` singleton cannot be shared
across OS processes, so we use Redis as the transport layer:

  Celery worker  →  redis.publish(channel, json_event)
       ↓
  FastAPI process (subscriber task)  →  event_bus.publish(DomainEvent)
       ↓
  event_handlers  →  ws_manager.broadcast_to_org(...)
       ↓
  Browser WebSocket client

Design:
  * Channel name: ``titan:events``  (shared by all orgs; org isolation via payload)
  * Publisher:    ``publish_event(event_type, org_id, payload)`` — sync-safe, for use
                  inside Celery tasks via a fresh sync Redis connection.
  * Subscriber:   ``start_redis_subscriber()`` — async generator launched once in
                  FastAPI lifespan as an asyncio background task.  Deserialises each
                  message and calls ``event_bus.publish()``.
  * Fallback:     Both functions degrade gracefully (log a warning) when Redis is
                  unavailable, so the app stays up even without Redis.
"""

from __future__ import annotations

import asyncio
import json
import logging

logger = logging.getLogger("titan.redis_pubsub")

CHANNEL = "titan:events"


# ── Publisher (sync-safe for Celery) ─────────────────────────────────


def publish_event(event_type: str, org_id: int, payload: dict | None = None) -> None:
    """Publish a domain event to the Redis channel.

    Designed to be called from **synchronous** Celery task code.
    Creates a fresh sync Redis connection per call so it does not depend on
    the FastAPI async Redis client that lives in a different event loop.

    Falls back silently when Redis is unavailable.
    """
    try:
        import redis as sync_redis  # synchronous redis-py
        from app.config import settings

        client = sync_redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        message = json.dumps(
            {
                "event_type": event_type,
                "org_id": org_id,
                "payload": payload or {},
            }
        )
        client.publish(CHANNEL, message)
        client.close()
        logger.debug("Published %s (org=%d) to Redis channel %s", event_type, org_id, CHANNEL)
    except Exception as exc:
        logger.warning(
            "Could not publish %s to Redis (%s) — WS clients will not receive this event",
            event_type,
            exc,
        )


# ── Subscriber (async, runs inside FastAPI process) ───────────────────


async def start_redis_subscriber() -> None:
    """Long-running async task: subscribe to CHANNEL and forward to event_bus.

    Should be started once via ``asyncio.create_task(start_redis_subscriber())``
    in the FastAPI lifespan.  Reconnects automatically on Redis errors.

    On shutdown the asyncio.CancelledError propagates naturally (task is
    cancelled by FastAPI lifespan cleanup).
    """
    from app.core.events import event_bus, DomainEvent
    from app.config import settings

    backoff = 1.0

    while True:
        try:
            from redis.asyncio import from_url as async_from_url

            client = async_from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=3,
            )
            pubsub = client.pubsub()
            await pubsub.subscribe(CHANNEL)
            logger.info("Redis Pub/Sub subscriber listening on channel '%s'", CHANNEL)
            backoff = 1.0  # reset on successful connect

            async for raw_message in pubsub.listen():
                if raw_message["type"] != "message":
                    continue
                try:
                    data = json.loads(raw_message["data"])
                    event = DomainEvent(
                        event_type=data["event_type"],
                        org_id=int(data["org_id"]),
                        payload=data.get("payload", {}),
                    )
                    await event_bus.publish(event)
                except Exception as parse_exc:
                    logger.warning("Redis pubsub: could not parse message: %s", parse_exc)

        except asyncio.CancelledError:
            logger.info("Redis Pub/Sub subscriber cancelled — shutting down")
            raise
        except Exception as exc:
            logger.warning(
                "Redis Pub/Sub subscriber error (%s) — retrying in %.0fs", exc, backoff
            )
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 30)  # exponential back-off, cap 30 s
