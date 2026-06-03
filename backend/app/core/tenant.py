"""Tenant context extraction and helpers.

Provides a `TenantContext` dataclass that travels through the request lifecycle
and a FastAPI dependency that extracts it from the JWT.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True, slots=True)
class TenantContext:
    """Immutable tenant context extracted from JWT claims."""

    org_id: int
    org_slug: str
    user_id: int
    user_role: str

    @property
    def is_super_admin(self) -> bool:
        return self.user_role == "super_admin"

    @property
    def is_org_admin(self) -> bool:
        return self.user_role in ("super_admin", "org_admin")

    @property
    def is_analyst(self) -> bool:
        return self.user_role in ("super_admin", "org_admin", "analyst")

    @property
    def can_write(self) -> bool:
        """Returns True if the user can create/update/delete resources."""
        return self.user_role in ("super_admin", "org_admin", "analyst")

    @property
    def can_manage_users(self) -> bool:
        return self.user_role in ("super_admin", "org_admin")

    @property
    def can_manage_ml(self) -> bool:
        return self.user_role in ("super_admin", "org_admin", "analyst")
