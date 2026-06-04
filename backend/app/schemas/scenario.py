"""Scenario schemas — request/response Pydantic models.

Keeps API contracts stable and decoupled from ORM.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.scenario import ScenarioStatus, ScenarioType


# ── Scenario Schemas ──────────────────────────────────────────────────


class ScenarioCreate(BaseModel):
    """Request body for creating a new scenario."""

    name: str = Field(min_length=1, max_length=255, examples=["Q3 Demand Spike"])
    description: Optional[str] = Field(default=None, max_length=2000)
    scenario_type: ScenarioType = ScenarioType.CUSTOM
    product_ids: Optional[list[int]] = Field(
        default=None,
        description="Specific product IDs to scope simulation. Null = all products.",
    )
    horizon_weeks: int = Field(default=12, ge=1, le=52)
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Type-specific simulation parameters (JSON).",
        examples=[{"demand_multiplier": 1.25, "affected_weeks": 4}],
    )


class ScenarioUpdate(BaseModel):
    """Request body for updating an existing scenario.

    Only provided fields are changed.  Any update increments the version.
    """

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    scenario_type: Optional[ScenarioType] = None
    product_ids: Optional[list[int]] = None
    horizon_weeks: Optional[int] = Field(default=None, ge=1, le=52)
    parameters: Optional[dict[str, Any]] = None


class ScenarioRunRequest(BaseModel):
    """Request body for triggering a scenario simulation run.

    Can optionally provide updated parameters inline, which are applied
    before running without persisting them (dry-run mode), or persisted
    if save_params=True.
    """

    parameters: Optional[dict[str, Any]] = None
    save_params: bool = False


# ── Response Schemas ──────────────────────────────────────────────────


class ScenarioResultSummary(BaseModel):
    """Lightweight result summary embedded in ScenarioResponse."""

    id: int
    version: int
    baseline_demand: Optional[float] = None
    simulated_demand: Optional[float] = None
    demand_delta_pct: Optional[float] = None
    revenue_impact: Optional[float] = None
    inventory_impact: Optional[float] = None
    stockout_risk_pct: Optional[float] = None
    computation_seconds: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScenarioResultDetail(ScenarioResultSummary):
    """Full result including time-series detail and recommendations."""

    detail: Optional[dict[str, Any]] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True


class ScenarioResponse(BaseModel):
    """Full scenario response."""

    id: int
    organization_id: int
    created_by: Optional[int] = None
    name: str
    description: Optional[str] = None
    scenario_type: ScenarioType
    status: ScenarioStatus
    version: int
    is_active: bool
    product_ids: Optional[list[int]] = None
    horizon_weeks: int
    parameters: dict[str, Any]
    task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_run_at: Optional[datetime] = None
    latest_result: Optional[ScenarioResultSummary] = None

    class Config:
        from_attributes = True


class ScenarioListResponse(BaseModel):
    """Paginated list of scenarios."""

    scenarios: list[ScenarioResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class ScenarioRunResponse(BaseModel):
    """Response when a simulation run is dispatched."""

    scenario_id: int
    task_id: str
    status: ScenarioStatus
    message: str
