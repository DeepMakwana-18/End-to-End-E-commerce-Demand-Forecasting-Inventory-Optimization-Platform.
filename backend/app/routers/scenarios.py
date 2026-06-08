"""Scenario Engine API routes.

CRUD:
  GET     /api/v1/scenarios            — list (with filters & pagination)
  POST    /api/v1/scenarios            — create
  GET     /api/v1/scenarios/{id}       — get with latest result
  PATCH   /api/v1/scenarios/{id}       — update parameters (bumps version)
  DELETE  /api/v1/scenarios/{id}       — archive (soft delete)

Simulation:
  POST    /api/v1/scenarios/{id}/run   — execute simulation, return result
  GET     /api/v1/scenarios/{id}/results         — list all version results
  GET     /api/v1/scenarios/{id}/results/{ver}   — specific version result
"""

from __future__ import annotations

import logging
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.schemas.scenario import (
    ScenarioCreate,
    ScenarioListResponse,
    ScenarioResponse,
    ScenarioResultDetail,
    ScenarioResultSummary,
    ScenarioRunResponse,
    ScenarioUpdate,
)
from app.services.scenario_service import ScenarioService
from app.repositories.scenario_repository import ScenarioResultRepository
from app.models.scenario import ScenarioStatus, ScenarioType

logger = logging.getLogger("titan.routers.scenarios")

router = APIRouter(prefix="/scenarios", tags=["Scenario Engine"])


def _service(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> ScenarioService:
    return ScenarioService(db=db, org_id=tenant.org_id, user_id=tenant.user_id)


# ── Helper: build response with latest result ─────────────────────────


def _scenario_response(scenario, results=None) -> ScenarioResponse:
    """Convert ORM Scenario → ScenarioResponse, attaching latest result.
    
    `results` can be passed explicitly to avoid triggering lazy-load on
    async session after commit.
    """
    latest = None
    # Use explicitly provided results, or the already-loaded relationship
    try:
        _results = results if results is not None else list(scenario.results)
    except Exception:
        _results = []
    
    if _results:
        # results are ordered desc by version (see model relationship)
        r = _results[0]
        latest = ScenarioResultSummary(
            id=r.id,
            version=r.version,
            baseline_demand=r.baseline_demand,
            simulated_demand=r.simulated_demand,
            demand_delta_pct=r.demand_delta_pct,
            revenue_impact=r.revenue_impact,
            inventory_impact=r.inventory_impact,
            stockout_risk_pct=r.stockout_risk_pct,
            computation_seconds=r.computation_seconds,
            created_at=r.created_at,
        )
    return ScenarioResponse(
        id=scenario.id,
        organization_id=scenario.organization_id,
        created_by=scenario.created_by,
        name=scenario.name,
        description=scenario.description,
        scenario_type=scenario.scenario_type,
        status=scenario.status,
        version=scenario.version,
        is_active=scenario.is_active,
        product_ids=scenario.product_ids,
        horizon_weeks=scenario.horizon_weeks,
        parameters=scenario.parameters,
        task_id=scenario.task_id,
        created_at=scenario.created_at,
        updated_at=scenario.updated_at,
        last_run_at=scenario.last_run_at,
        latest_result=latest,
    )


# ── CRUD Endpoints ────────────────────────────────────────────────────


@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    data: ScenarioCreate,
    svc: ScenarioService = Depends(_service),
):
    """Create a new What-If scenario."""
    scenario = await svc.create(data)
    return _scenario_response(scenario, results=[])


@router.get("", response_model=ScenarioListResponse)
async def list_scenarios(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    type_filter: Optional[str] = Query(default=None, alias="type"),
    include_archived: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    svc: ScenarioService = Depends(_service),
):
    """List What-If scenarios with optional filters and pagination."""
    scenarios, total = await svc.list(
        status_filter=status_filter,
        type_filter=type_filter,
        include_archived=include_archived,
        page=page,
        per_page=per_page,
    )
    total_pages = math.ceil(total / per_page) if per_page else 1
    return ScenarioListResponse(
        scenarios=[_scenario_response(s) for s in scenarios],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: int,
    svc: ScenarioService = Depends(_service),
):
    """Get a single scenario with its latest result."""
    scenario = await svc.get(scenario_id)
    return _scenario_response(scenario)


@router.patch("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: int,
    data: ScenarioUpdate,
    svc: ScenarioService = Depends(_service),
):
    """Update scenario parameters. Increments version and resets status to DRAFT."""
    scenario = await svc.update(scenario_id, data)
    return _scenario_response(scenario, results=[])


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    scenario_id: int,
    svc: ScenarioService = Depends(_service),
):
    """Archive (soft-delete) a scenario."""
    await svc.delete(scenario_id)


# ── Simulation Endpoints ──────────────────────────────────────────────


@router.post("/{scenario_id}/run", response_model=ScenarioResultDetail)
async def run_scenario(
    scenario_id: int,
    svc: ScenarioService = Depends(_service),
):
    """Execute a scenario simulation and return the full result.

    Phase 3A: runs synchronously.
    Phase 3B: will dispatch to Celery and return a task_id.
    """
    result = await svc.run(scenario_id)
    return ScenarioResultDetail(
        id=result.id,
        version=result.version,
        baseline_demand=result.baseline_demand,
        simulated_demand=result.simulated_demand,
        demand_delta_pct=result.demand_delta_pct,
        revenue_impact=result.revenue_impact,
        inventory_impact=result.inventory_impact,
        stockout_risk_pct=result.stockout_risk_pct,
        computation_seconds=result.computation_seconds,
        detail=result.detail,
        error=result.error,
        created_at=result.created_at,
    )


@router.get("/{scenario_id}/results", response_model=list[ScenarioResultSummary])
async def list_scenario_results(
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """List all versioned results for a scenario (history)."""
    result_repo = ScenarioResultRepository(db, tenant.org_id)
    results = await result_repo.list_for_scenario(scenario_id)
    return [
        ScenarioResultSummary(
            id=r.id,
            version=r.version,
            baseline_demand=r.baseline_demand,
            simulated_demand=r.simulated_demand,
            demand_delta_pct=r.demand_delta_pct,
            revenue_impact=r.revenue_impact,
            inventory_impact=r.inventory_impact,
            stockout_risk_pct=r.stockout_risk_pct,
            computation_seconds=r.computation_seconds,
            created_at=r.created_at,
        )
        for r in results
    ]


@router.get("/{scenario_id}/results/{version}", response_model=ScenarioResultDetail)
async def get_scenario_result(
    scenario_id: int,
    version: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get the full result detail for a specific scenario version."""
    result_repo = ScenarioResultRepository(db, tenant.org_id)
    result = await result_repo.get_by_scenario_version(scenario_id, version)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No result found for scenario {scenario_id} version {version}",
        )
    return ScenarioResultDetail(
        id=result.id,
        version=result.version,
        baseline_demand=result.baseline_demand,
        simulated_demand=result.simulated_demand,
        demand_delta_pct=result.demand_delta_pct,
        revenue_impact=result.revenue_impact,
        inventory_impact=result.inventory_impact,
        stockout_risk_pct=result.stockout_risk_pct,
        computation_seconds=result.computation_seconds,
        detail=result.detail,
        error=result.error,
        created_at=result.created_at,
    )


@router.get("/{scenario_id}/explain")
async def explain_scenario(
    scenario_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Return SHAP-based delta explainability for a completed scenario.

    Runs both baseline and modified inference with feature capture enabled,
    computes per-feature delta-SHAP values (simulated − baseline) for each
    forecast week, and returns backend-computed driver_summary aggregates.

    The response is idempotent — no state is written to the database.

    Returns
    -------
    200  explainer_ready=true  — full week-by-week and aggregate SHAP data
    200  explainer_ready=false — SHAP computation failed (graceful, no 500)
    400  Scenario not completed yet
    404  Scenario not found
    """
    from app.repositories.scenario_repository import ScenarioRepository
    from app.repositories.forecast_repo import ModelVersionRepository
    from app.ml.scenario_engine import ScenarioEngine
    from app.models.scenario import ScenarioStatus

    scenario_repo = ScenarioRepository(db, tenant.org_id)
    scenario = await scenario_repo.get_by_id(scenario_id)

    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario {scenario_id} not found",
        )

    if scenario.status != ScenarioStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Scenario {scenario_id} is not completed (status={scenario.status.value}). "
                "Run the simulation first."
            ),
        )

    mv_repo = ModelVersionRepository(db, tenant.org_id)
    active_mv, artifact_path = await mv_repo.get_active_with_artifact()

    if active_mv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active model version found. Run training first.",
        )

    if artifact_path is None:
        return {
            "explainer_ready": False,
            "reason": "No model artifact on disk. Re-run training to generate the artifact.",
        }

    engine = ScenarioEngine(active_mv, artifact_path)
    if not engine.load():
        return {
            "explainer_ready": False,
            "reason": f"Failed to load model artifact at {artifact_path}.",
        }

    params = dict(scenario.parameters or {})
    horizon = scenario.horizon_weeks or 12

    # Resolve avg_unit_value from DB (same logic as _run_simulation)
    from sqlalchemy import select, func
    from app.models import Product
    caller_unit_value = float(params.get("avg_unit_value", 0) or 0)
    if caller_unit_value <= 0:
        price_stmt = (
            select(func.avg(Product.price))
            .where(Product.organization_id == tenant.org_id)
            .where(Product.is_active == True)
            .where(Product.price.isnot(None))
            .where(Product.price > 0)
        )
        avg_price = (await db.execute(price_stmt)).scalar()
        if avg_price and float(avg_price) > 0:
            params["avg_unit_value"] = round(float(avg_price), 4)

    logger.info(
        "[org:%d] Scenario %d explain requested (horizon=%dw model=%s)",
        tenant.org_id, scenario_id, horizon, active_mv.version_tag,
    )

    explain_result = engine.explain(params, horizon)
    return explain_result

