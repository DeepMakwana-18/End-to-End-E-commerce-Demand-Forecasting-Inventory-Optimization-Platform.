"""FastAPI middleware stack.

Provides:
  • RequestContextMiddleware — injects X-Request-ID, sets contextvars
  • LatencyMiddleware — records request duration, logs slow requests
"""

from __future__ import annotations

import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import (
    generate_request_id,
    request_id_var,
    correlation_id_var,
    tenant_org_id_var,
    tenant_user_id_var,
)

logger = logging.getLogger("titan.http")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Injects request ID and correlation ID into every request.

    Sets contextvars so that downstream loggers automatically include
    request_id, correlation_id, and (if available) tenant context.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Generate or forward request ID
        req_id = request.headers.get("X-Request-ID") or generate_request_id()
        corr_id = request.headers.get("X-Correlation-ID") or req_id

        # Set context vars for logging
        request_id_var.set(req_id)
        correlation_id_var.set(corr_id)
        tenant_org_id_var.set(None)
        tenant_user_id_var.set(None)

        # Store on request state for downstream access
        request.state.request_id = req_id
        request.state.correlation_id = corr_id

        response = await call_next(request)

        # Attach to response headers
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Correlation-ID"] = corr_id

        return response


class LatencyMiddleware(BaseHTTPMiddleware):
    """Records request latency and logs slow requests.

    Adds X-Response-Time header.  Logs a WARNING for requests > 2s.
    """

    SLOW_REQUEST_THRESHOLD_MS = 2000

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Response-Time"] = f"{duration_ms:.1f}ms"

        # Structured log
        method = request.method
        path = request.url.path
        status = response.status_code
        client_ip = request.client.host if request.client else "unknown"

        log_level = logging.WARNING if duration_ms > self.SLOW_REQUEST_THRESHOLD_MS else logging.INFO

        # Skip noisy health/metrics endpoints
        if path in ("/api/health", "/metrics", "/api/docs", "/api/redoc", "/openapi.json"):
            log_level = logging.DEBUG

        logger.log(
            log_level,
            "%s %s → %d (%.1fms)",
            method,
            path,
            status,
            duration_ms,
            extra={
                "method": method,
                "path": path,
                "status_code": status,
                "duration_ms": round(duration_ms, 1),
                "client_ip": client_ip,
            },
        )

        return response
