"""Scenario repository — tenant-scoped CRUD + query helpers.

Extends BaseRepository with scenario-specific query patterns:
  - list with status/type filters
  - get with latest result joined
  - version management
  - result creation
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.base_repository import BaseRepository
from app.models.scenario import Scenario, ScenarioResult, ScenarioStatus


class ScenarioRepository(BaseRepository[Scenario]):
    """Tenant-scoped repository for What-If scenarios."""

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, Scenario, org_id)

    # ── Queries ───────────────────────────────────────────────────────

    async def get_with_latest_result(self, scenario_id: int) -> Optional[Scenario]:
        """Get a scenario by ID with its most recent result eagerly loaded."""
        stmt = (
            self._scoped_query()
            .where(Scenario.id == scenario_id)
            .options(selectinload(Scenario.results))
        )
        result = await self.session.execute(stmt)
        scenario = result.scalar_one_or_none()
        return scenario

    async def list_scenarios(
        self,
        *,
        status: Optional[ScenarioStatus] = None,
        scenario_type: Optional[str] = None,
        include_archived: bool = False,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[Sequence[Scenario], int]:
        """List scenarios with optional filtering.

        Returns (scenarios, total_count) for pagination.
        """
        stmt = self._scoped_query()

        if not include_archived:
            stmt = stmt.where(Scenario.is_active == True)

        if status:
            stmt = stmt.where(Scenario.status == status)

        if scenario_type:
            stmt = stmt.where(Scenario.scenario_type == scenario_type)

        # Count before pagination
        from sqlalchemy import func, select as sa_select
        count_stmt = sa_select(func.count()).select_from(stmt.subquery())
        count_result = await self.session.execute(count_stmt)
        total = count_result.scalar() or 0

        # Apply pagination and eager-load latest result
        stmt = (
            stmt
            .options(selectinload(Scenario.results))
            .order_by(Scenario.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        scenarios = result.scalars().all()

        return scenarios, total

    async def increment_version(self, scenario_id: int) -> Optional[Scenario]:
        """Increment the version counter on a scenario (called before parameter updates)."""
        scenario = await self.get_by_id(scenario_id)
        if scenario is None:
            return None
        scenario.version += 1
        scenario.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(scenario)
        return scenario

    async def set_status(
        self,
        scenario_id: int,
        status: ScenarioStatus,
        task_id: Optional[str] = None,
    ) -> Optional[Scenario]:
        """Update a scenario's execution status."""
        scenario = await self.get_by_id(scenario_id)
        if scenario is None:
            return None
        scenario.status = status
        if task_id is not None:
            scenario.task_id = task_id
        if status == ScenarioStatus.RUNNING:
            scenario.last_run_at = datetime.now(timezone.utc)
        scenario.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(scenario)
        return scenario

    async def archive(self, scenario_id: int) -> bool:
        """Soft-delete a scenario (set is_active=False)."""
        scenario = await self.get_by_id(scenario_id)
        if scenario is None:
            return False
        scenario.is_active = False
        scenario.status = ScenarioStatus.ARCHIVED
        scenario.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return True


class ScenarioResultRepository(BaseRepository[ScenarioResult]):
    """Tenant-scoped repository for scenario results."""

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, ScenarioResult, org_id)

    async def get_by_scenario_version(
        self, scenario_id: int, version: int
    ) -> Optional[ScenarioResult]:
        """Get the result for a specific scenario version."""
        stmt = (
            self._scoped_query()
            .where(ScenarioResult.scenario_id == scenario_id)
            .where(ScenarioResult.version == version)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_latest_for_scenario(self, scenario_id: int) -> Optional[ScenarioResult]:
        """Get the most recent result for a scenario."""
        stmt = (
            self._scoped_query()
            .where(ScenarioResult.scenario_id == scenario_id)
            .order_by(ScenarioResult.version.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_scenario(self, scenario_id: int) -> Sequence[ScenarioResult]:
        """Get all results for a scenario, newest first."""
        stmt = (
            self._scoped_query()
            .where(ScenarioResult.scenario_id == scenario_id)
            .order_by(ScenarioResult.version.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
