"""Redis-backed sliding window rate limiter.

Usage as a FastAPI dependency:
    from app.core.rate_limiter import rate_limit

    @router.post("/login", dependencies=[Depends(rate_limit("login", 5, 60))])
    async def login(...):
        ...
"""

from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import Depends, HTTPException, Request, status

logger = logging.getLogger("titan.security.ratelimit")


async def _check_rate_limit(
    key: str, max_requests: int, window_seconds: int
) -> bool:
    """Check if a key has exceeded its rate limit using Redis sorted sets.

    Returns True if the request is allowed, False if rate limited.
    """
    from app.core.cache import get_redis

    client = await get_redis()
    if client is None:
        # If Redis is unavailable, allow the request (fail-open)
        return True

    now = time.time()
    window_start = now - window_seconds
    redis_key = f"titan:ratelimit:{key}"

    try:
        pipe = client.pipeline()
        # Remove old entries outside the window
        pipe.zremrangebyscore(redis_key, 0, window_start)
        # Count remaining entries
        pipe.zcard(redis_key)
        # Add current request
        pipe.zadd(redis_key, {str(now): now})
        # Set key expiry
        pipe.expire(redis_key, window_seconds + 1)
        results = await pipe.execute()

        current_count = results[1]
        return current_count < max_requests
    except Exception:
        logger.warning("Rate limit check failed for key=%s", key)
        return True  # Fail-open


def rate_limit(
    prefix: str,
    max_requests: int = 60,
    window_seconds: int = 60,
) -> Callable:
    """FastAPI dependency factory for rate limiting.

    Args:
        prefix: Identifier for the rate limit bucket (e.g., "login", "api")
        max_requests: Maximum requests allowed per window
        window_seconds: Time window in seconds
    """

    async def _dependency(request: Request):
        # Use client IP + prefix as the rate limit key
        client_ip = request.client.host if request.client else "unknown"
        key = f"{prefix}:{client_ip}"

        allowed = await _check_rate_limit(key, max_requests, window_seconds)
        if not allowed:
            logger.warning(
                "Rate limit exceeded: %s (%d/%d per %ds)",
                key,
                max_requests,
                max_requests,
                window_seconds,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded. Please try again later.",
                    "code": "RATE_LIMIT",
                    "retry_after": window_seconds,
                },
                headers={"Retry-After": str(window_seconds)},
            )

    return _dependency
