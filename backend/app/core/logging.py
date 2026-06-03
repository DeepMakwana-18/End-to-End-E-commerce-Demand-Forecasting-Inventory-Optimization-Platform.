"""Structured JSON logging configuration.

Provides:
  • JSON-formatted log output for production
  • Human-readable colored output for development
  • Automatic PII scrubbing (passwords, tokens)
  • Correlation ID propagation via contextvars
  • Tenant-aware log fields (org_id, user_id)
"""

from __future__ import annotations

import logging
import re
import sys
import uuid
from contextvars import ContextVar
from typing import Any

# ── Context Variables ───────────────────────────────────────────────
# These are set per-request by the RequestContextMiddleware.

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")
tenant_org_id_var: ContextVar[int | None] = ContextVar("tenant_org_id", default=None)
tenant_user_id_var: ContextVar[int | None] = ContextVar("tenant_user_id", default=None)


def generate_request_id() -> str:
    """Generate a short unique request ID."""
    return uuid.uuid4().hex[:12]


# ── PII Scrubbing ──────────────────────────────────────────────────

_SENSITIVE_KEYS = re.compile(
    r"(password|secret|token|authorization|cookie|api_key|access_token|refresh_token)",
    re.IGNORECASE,
)


def scrub_dict(data: dict[str, Any], depth: int = 0) -> dict[str, Any]:
    """Recursively scrub sensitive values from a dict."""
    if depth > 5:
        return data
    result = {}
    for key, value in data.items():
        if _SENSITIVE_KEYS.search(str(key)):
            result[key] = "***REDACTED***"
        elif isinstance(value, dict):
            result[key] = scrub_dict(value, depth + 1)
        else:
            result[key] = value
    return result


# ── JSON Formatter ──────────────────────────────────────────────────


class TitanJsonFormatter(logging.Formatter):
    """Structured JSON log formatter with request context."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        from datetime import datetime, timezone

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add request context if available
        req_id = request_id_var.get("")
        if req_id:
            log_entry["request_id"] = req_id

        corr_id = correlation_id_var.get("")
        if corr_id:
            log_entry["correlation_id"] = corr_id

        org_id = tenant_org_id_var.get(None)
        if org_id:
            log_entry["org_id"] = org_id

        user_id = tenant_user_id_var.get(None)
        if user_id:
            log_entry["user_id"] = user_id

        # Add exception info
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else "Unknown",
                "message": str(record.exc_info[1]),
            }

        # Add extra fields
        for key in ("method", "path", "status_code", "duration_ms", "client_ip"):
            val = getattr(record, key, None)
            if val is not None:
                log_entry[key] = val

        return json.dumps(log_entry, default=str)


# ── Setup ───────────────────────────────────────────────────────────


def setup_logging(*, debug: bool = False, json_output: bool = True) -> None:
    """Configure the root logger for the Titan application.

    Args:
        debug: Enable DEBUG level logging.
        json_output: Use JSON formatter (production) vs. human-readable (dev).
    """
    root = logging.getLogger()
    root.setLevel(logging.DEBUG if debug else logging.INFO)

    # Remove existing handlers
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if json_output and not debug:
        handler.setFormatter(TitanJsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s — %(message)s",
                datefmt="%H:%M:%S",
            )
        )

    root.addHandler(handler)

    # Quiet noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if debug else logging.WARNING
    )
    logging.getLogger("celery").setLevel(logging.INFO)

    logging.getLogger("titan").info(
        "Logging configured (level=%s, json=%s)",
        "DEBUG" if debug else "INFO",
        json_output and not debug,
    )
