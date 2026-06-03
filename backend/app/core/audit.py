"""Audit logging — persists user actions to the audit_logs table.

Provides both async (for FastAPI routes) and sync (for Celery tasks) writers.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog

logger = logging.getLogger("titan.audit")


async def log_action(
    db: AsyncSession,
    *,
    org_id: int,
    user_id: int | None = None,
    action: str,
    resource_type: str | None = None,
    resource_id: int | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Write an audit log entry to the database.

    Args:
        db: Async database session
        org_id: Organization ID (tenant)
        user_id: ID of the user performing the action
        action: Action name (e.g., "user.login", "product.create")
        resource_type: Type of resource (e.g., "product", "forecast")
        resource_id: ID of the affected resource
        details: Additional context (JSON-serializable)
        ip_address: Client IP address
    """
    try:
        entry = AuditLog(
            organization_id=org_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        await db.flush()

        logger.debug(
            "AUDIT [org:%s] user=%s action=%s resource=%s/%s",
            org_id,
            user_id,
            action,
            resource_type,
            resource_id,
        )
    except Exception:
        logger.exception("Failed to write audit log")


def get_client_ip(request) -> str:
    """Extract real client IP from request, handling proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
