"""Redis caching layer.

Provides a thin async wrapper around redis for caching JSON-serializable data.
Falls back gracefully when Redis is unavailable.
"""

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Global redis client — initialized lazily
_redis_client = None


async def get_redis():
    """Get or create the global async Redis client."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        from redis.asyncio import from_url
        from app.config import settings

        _redis_client = from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
        # Test connection
        await _redis_client.ping()
        logger.info("✅ Redis connected at %s", settings.REDIS_URL)
        return _redis_client
    except Exception as e:
        logger.warning("⚠️ Redis unavailable — caching disabled: %s", e)
        _redis_client = None
        return None


async def cache_get(key: str) -> Optional[Any]:
    """Get a value from cache. Returns None on miss or error."""
    client = await get_redis()
    if client is None:
        return None
    try:
        raw = await client.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> bool:
    """Set a value in cache with TTL. Returns False on error."""
    client = await get_redis()
    if client is None:
        return False
    try:
        await client.set(key, json.dumps(value, default=str), ex=ttl_seconds)
        return True
    except Exception:
        return False


async def cache_delete(key: str) -> bool:
    """Delete a cache key."""
    client = await get_redis()
    if client is None:
        return False
    try:
        await client.delete(key)
        return True
    except Exception:
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a pattern (e.g., 'org:5:*'). Returns count deleted."""
    client = await get_redis()
    if client is None:
        return 0
    try:
        keys = []
        async for key in client.scan_iter(match=pattern, count=100):
            keys.append(key)
        if keys:
            await client.delete(*keys)
        return len(keys)
    except Exception:
        return 0


def make_cache_key(org_id: int, domain: str, *parts: str) -> str:
    """Build a namespaced cache key: 'titan:org:{org_id}:{domain}:{parts}'."""
    segments = [f"titan:org:{org_id}", domain] + list(parts)
    return ":".join(segments)
