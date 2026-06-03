"""Task status tracking via Redis.

Stores task progress as Redis hashes so both the FastAPI process
and Celery workers can read/write progress.  The WebSocket layer
polls these to stream updates to the frontend.

Key format:  titan:task:{task_id}
Fields:      state, progress, message, result, error, org_id, user_id, started_at, updated_at
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger("titan.tasks.status")

# ── Constants ───────────────────────────────────────────────────────

TASK_STATE_PENDING = "pending"
TASK_STATE_STARTED = "started"
TASK_STATE_PROGRESS = "progress"
TASK_STATE_COMPLETED = "completed"
TASK_STATE_FAILED = "failed"


def _task_key(task_id: str) -> str:
    return f"titan:task:{task_id}"


# ── Write (called from Celery workers) ──────────────────────────────


async def set_task_status(
    task_id: str,
    *,
    state: str,
    progress: int = 0,
    message: str = "",
    result: Any = None,
    error: str | None = None,
    org_id: int | None = None,
    user_id: int | None = None,
) -> None:
    """Update task status in Redis."""
    from app.core.cache import get_redis

    client = await get_redis()
    if client is None:
        logger.warning("Redis unavailable — cannot update task status for %s", task_id)
        return

    data = {
        "state": state,
        "progress": progress,
        "message": message,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if result is not None:
        data["result"] = json.dumps(result, default=str)
    if error:
        data["error"] = error
    if org_id is not None:
        data["org_id"] = str(org_id)
    if user_id is not None:
        data["user_id"] = str(user_id)
    if state == TASK_STATE_STARTED:
        data["started_at"] = datetime.now(timezone.utc).isoformat()

    try:
        key = _task_key(task_id)
        await client.hset(key, mapping=data)
        await client.expire(key, 3600)  # TTL: 1 hour
    except Exception:
        logger.exception("Failed to update task status for %s", task_id)


# ── Synchronous Write (for Celery workers that aren't async) ────────


def set_task_status_sync(
    task_id: str,
    *,
    state: str,
    progress: int = 0,
    message: str = "",
    result: Any = None,
    error: str | None = None,
    org_id: int | None = None,
    user_id: int | None = None,
) -> None:
    """Synchronous version for use inside Celery workers."""
    import redis as sync_redis
    from app.config import settings

    try:
        client = sync_redis.from_url(settings.REDIS_URL, decode_responses=True)
        data = {
            "state": state,
            "progress": str(progress),
            "message": message,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if result is not None:
            data["result"] = json.dumps(result, default=str)
        if error:
            data["error"] = error
        if org_id is not None:
            data["org_id"] = str(org_id)
        if user_id is not None:
            data["user_id"] = str(user_id)
        if state == TASK_STATE_STARTED:
            data["started_at"] = datetime.now(timezone.utc).isoformat()

        key = _task_key(task_id)
        client.hset(key, mapping=data)
        client.expire(key, 3600)
        client.close()
    except Exception:
        logger.exception("Failed to update task status (sync) for %s", task_id)


# ── Read (called from FastAPI) ──────────────────────────────────────


async def get_task_status(task_id: str) -> Optional[dict[str, Any]]:
    """Read task status from Redis. Returns None if not found."""
    from app.core.cache import get_redis

    client = await get_redis()
    if client is None:
        return None

    try:
        data = await client.hgetall(_task_key(task_id))
        if not data:
            return None
        # Parse numeric fields
        if "progress" in data:
            data["progress"] = int(data["progress"])
        if "result" in data:
            try:
                data["result"] = json.loads(data["result"])
            except (json.JSONDecodeError, TypeError):
                pass
        if "org_id" in data:
            data["org_id"] = int(data["org_id"])
        if "user_id" in data:
            data["user_id"] = int(data["user_id"])
        return data
    except Exception:
        logger.exception("Failed to read task status for %s", task_id)
        return None
