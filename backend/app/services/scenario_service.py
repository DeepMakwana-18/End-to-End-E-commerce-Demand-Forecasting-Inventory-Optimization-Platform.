"""Scenario service — business logic for What-If simulations.

Responsibilities:
  - Orchestrates scenario CRUD (via repository)
  - Runs real model-based simulation via ScenarioEngine (Phase 3B)
  - Produces a ScenarioResult with baseline vs simulated demand comparison

Simulation dispatch:
  - ScenarioEngine.load()  — loads active .pkl artifact from disk
  - ScenarioEngine.run()   — runs baseline + modified inference, computes all deltas
  Falls back to in-memory singleton when no artifact is on disk.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scenario import Scenario, ScenarioResult, ScenarioStatus
from app.repositories.scenario_repository import ScenarioRepository, ScenarioResultRepository
from app.repositories.forecast_repo import ModelVersionRepository
from app.schemas.scenario import ScenarioCreate, ScenarioUpdate
from app.ml.scenario_engine import (
    ScenarioEngine,
    MARKETING_ELASTICITY,
    PRICE_ELASTICITY,
    _run_baseline,
    _run_modified,
    _compute_stockout_risk,
)

logger = logging.getLogger("titan.scenario")


# ── Simulation Dispatch ───────────────────────────────────────────────


async def _run_simulation(
    scenario: Scenario,
    db: AsyncSession,
    org_id: int,
) -> dict[str, Any]:
    """Load the active model artifact and execute a What-If simulation.

    Phase 3B: primary path uses the persisted .pkl artifact via ScenarioEngine.
    Fallback: in-memory singleton when no artifact is available on disk.

    Returns a result dict matching the ScenarioResult.detail schema.
    """
    mv_repo = ModelVersionRepository(db, org_id)
    active_mv, artifact_path = await mv_repo.get_active_with_artifact()

    params = dict(scenario.parameters or {})
    weeks = scenario.horizon_weeks or 12

    # ── Resolve avg_unit_value from DB if caller did not provide one ──
    # The frontend defaults to $50 which is meaningless for most datasets.
    # We look up the org-wide weighted average unit price from Product.price.
    # A caller-supplied value > 0 always takes precedence (explicit override).
    from sqlalchemy import select, func
    from app.models import Product

    caller_unit_value = float(params.get("avg_unit_value", 0) or 0)
    if caller_unit_value <= 0:
        price_stmt = (
            select(func.avg(Product.price))
            .where(Product.organization_id == org_id)
            .where(Product.is_active == True)
            .where(Product.price.isnot(None))
            .where(Product.price > 0)
        )
        avg_price = (await db.execute(price_stmt)).scalar()
        if avg_price and float(avg_price) > 0:
            params["avg_unit_value"] = round(float(avg_price), 4)
            logger.info(
                "[org:%d] avg_unit_value resolved from Product.price: %.2f",
                org_id, params["avg_unit_value"],
            )
        else:
            # Ultimate fallback: weighted avg from Sale table
            from app.models import Sale
            sale_stmt = select(
                func.sum(Sale.revenue).label("total_rev"),
                func.sum(Sale.quantity).label("total_qty"),
            ).where(Sale.organization_id == org_id)
            sale_row = (await db.execute(sale_stmt)).first()
            total_rev = float(sale_row.total_rev or 0) if sale_row else 0.0
            total_qty = float(sale_row.total_qty or 0) if sale_row else 0.0
            params["avg_unit_value"] = round(total_rev / total_qty, 4) if total_qty > 0 else 50.0
            logger.info(
                "[org:%d] avg_unit_value resolved from Sale revenue/qty: %.2f",
                org_id, params["avg_unit_value"],
            )

    if active_mv is None:
        raise RuntimeError(
            "No active model version found for this organisation. "
            "Run a model training first."
        )

    # ── Primary Path: use ScenarioEngine with persisted artifact ─────
    if artifact_path is not None:
        engine = ScenarioEngine(active_mv, artifact_path)
        if not engine.load():
            raise RuntimeError(
                f"Failed to load model artifact at {artifact_path}. "
                "The file may be corrupt — re-run training to regenerate it."
            )
        return engine.run(params, weeks)

    # ── Fallback: in-memory singleton ────────────────────────────────
    logger.warning(
        "[org:%d] Model v%s has no artifact on disk (path=%r). "
        "Falling back to in-memory singleton.",
        org_id,
        active_mv.version_tag,
        active_mv.model_path,
    )
    from app.services.ml_service import forecast_model

    if not forecast_model.is_trained:
        forecast_model.train()

    state = {
        "model": forecast_model.model,
        "last_date": forecast_model.last_date,
        "last_demand": forecast_model.last_demand,
        "last_4_demand": forecast_model.last_4_demand,
        "last_demands": forecast_model.last_demands,
        "std_dev": forecast_model.std_dev,
        "seasonal_amplitude": forecast_model.seasonal_amplitude,
    }

    marketing_spend_pct = float(params.get("marketing_spend_pct", 0.0))
    price_change_pct = float(params.get("price_change_pct", 0.0))
    lead_time_days = float(params.get("lead_time_days", 14.0))
    safety_stock_multiplier = float(params.get("safety_stock_multiplier", 1.0))
    # avg_unit_value is already resolved above from DB; use it directly
    avg_unit_value = float(params.get("avg_unit_value", 50.0))

    marketing_effect = 1.0 + (marketing_spend_pct / 100) * MARKETING_ELASTICITY
    price_effect = 1.0 + (price_change_pct / 100) * PRICE_ELASTICITY
    demand_multiplier = max(0.05, marketing_effect * price_effect)
    lead_time_adjustment = lead_time_days - 14.0

    baseline_points, _ = _run_baseline(state, weeks)
    simulated_points, _ = _run_modified(state, weeks, demand_multiplier, lead_time_adjustment)
    baseline_demand = sum(p["predicted_demand"] for p in baseline_points)
    simulated_demand = sum(p["demand"] for p in simulated_points)
    demand_delta = simulated_demand - baseline_demand
    demand_delta_pct = round(demand_delta / baseline_demand * 100, 2) if baseline_demand > 0 else 0.0
    revenue_impact = round(demand_delta * avg_unit_value, 2)
    inventory_impact = round(demand_delta, 1)
    stockout_risk_pct = _compute_stockout_risk(
        baseline_points, simulated_points, safety_stock_multiplier, lead_time_days
    )

    recommendations = [
        "Simulation ran using in-memory model (artifact not found on disk). "
        "Re-run training to persist the artifact for more accurate scenarios."
    ]
    if demand_delta_pct > 10:
        recommendations.append(
            f"Demand increase of {demand_delta_pct:.1f}% — consider raising safety stock."
        )
    elif demand_delta_pct < -10:
        recommendations.append(
            f"Demand decrease of {abs(demand_delta_pct):.1f}% — reduce reorder quantities."
        )

    return {
        "summary": {
            "baseline_demand": round(baseline_demand, 1),
            "simulated_demand": round(simulated_demand, 1),
            "demand_delta_pct": demand_delta_pct,
            "revenue_impact": revenue_impact,
            "inventory_impact": inventory_impact,
            "stockout_risk_pct": stockout_risk_pct,
        },
        "baseline": [
            {
                "week": p["week"], "date": p["date"], "demand": p["predicted_demand"],
                "confidence_lower": p["confidence_lower"], "confidence_upper": p["confidence_upper"],
            }
            for p in baseline_points
        ],
        "simulated": [
            {k: v for k, v in p.items() if k != "_raw"}
            for p in simulated_points
        ],
        "recommendations": recommendations,
        "params_applied": {
            "marketing_spend_pct": marketing_spend_pct,
            "price_change_pct": price_change_pct,
            "lead_time_days": lead_time_days,
            "safety_stock_multiplier": safety_stock_multiplier,
            "demand_multiplier": round(demand_multiplier, 4),
        },
        "model_info": {
            "version_tag": active_mv.version_tag,
            "source": "in-memory-fallback",
        },
    }


# ── Service ───────────────────────────────────────────────────────────


class ScenarioService:
    """Orchestrates scenario lifecycle: CRUD → simulation → result persistence."""

    def __init__(self, db: AsyncSession, org_id: int, user_id: int):
        self.db = db
        self.org_id = org_id
        self.user_id = user_id
        self.repo = ScenarioRepository(db, org_id)
        self.result_repo = ScenarioResultRepository(db, org_id)

    # ── CRUD ─────────────────────────────────────────────────────────

    async def create(self, data: ScenarioCreate) -> Scenario:
        """Create a new scenario in DRAFT status."""
        scenario = Scenario(
            organization_id=self.org_id,
            created_by=self.user_id,
            name=data.name,
            description=data.description,
            scenario_type=data.scenario_type,
            status=ScenarioStatus.DRAFT,
            version=1,
            product_ids=data.product_ids,
            horizon_weeks=data.horizon_weeks,
            parameters=data.parameters,
        )
        scenario = await self.repo.create(scenario)
        await self.db.commit()
        await self.db.refresh(scenario)
        logger.info("[org:%d] Scenario created: id=%d name=%r", self.org_id, scenario.id, scenario.name)
        return scenario

    async def get(self, scenario_id: int) -> Scenario:
        """Get a scenario with its latest result, 404 if not found."""
        scenario = await self.repo.get_with_latest_result(scenario_id)
        if scenario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found",
            )
        return scenario

    async def list(
        self,
        *,
        status_filter: Optional[str] = None,
        type_filter: Optional[str] = None,
        include_archived: bool = False,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[Scenario], int]:
        """List scenarios with filters and pagination."""
        offset = (page - 1) * per_page
        scenarios, total = await self.repo.list_scenarios(
            status=ScenarioStatus(status_filter) if status_filter else None,
            scenario_type=type_filter,
            include_archived=include_archived,
            offset=offset,
            limit=per_page,
        )
        return list(scenarios), total

    async def update(self, scenario_id: int, data: ScenarioUpdate) -> Scenario:
        """Update scenario parameters and increment version."""
        scenario = await self.repo.get_by_id(scenario_id)
        if scenario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found",
            )

        updates = data.model_dump(exclude_none=True)
        if updates:
            scenario.version += 1
            for field, value in updates.items():
                setattr(scenario, field, value)
            scenario.updated_at = datetime.now(timezone.utc)
            scenario.status = ScenarioStatus.DRAFT

        await self.db.flush()
        await self.db.commit()
        await self.db.refresh(scenario)
        logger.info(
            "[org:%d] Scenario updated: id=%d v%d",
            self.org_id, scenario.id, scenario.version,
        )
        return scenario

    async def delete(self, scenario_id: int) -> bool:
        """Soft-delete (archive) a scenario."""
        archived = await self.repo.archive(scenario_id)
        if not archived:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found",
            )
        await self.db.commit()
        return True

    # ── Simulation ────────────────────────────────────────────────────

    async def run(self, scenario_id: int) -> ScenarioResult:
        """Execute the scenario simulation synchronously and persist the result."""
        scenario = await self.repo.get_by_id(scenario_id)
        if scenario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scenario {scenario_id} not found",
            )

        await self.repo.set_status(scenario_id, ScenarioStatus.RUNNING)
        await self.db.flush()

        t0 = time.perf_counter()
        try:
            detail = await _run_simulation(scenario, self.db, self.org_id)
            elapsed = round(time.perf_counter() - t0, 3)
            summary = detail["summary"]

            result = ScenarioResult(
                scenario_id=scenario.id,
                organization_id=self.org_id,
                version=scenario.version,
                baseline_demand=summary["baseline_demand"],
                simulated_demand=summary["simulated_demand"],
                demand_delta_pct=summary["demand_delta_pct"],
                revenue_impact=summary["revenue_impact"],
                inventory_impact=summary["inventory_impact"],
                stockout_risk_pct=summary["stockout_risk_pct"],
                detail=detail,
                computation_seconds=elapsed,
            )
            self.db.add(result)

            scenario.status = ScenarioStatus.COMPLETED
            scenario.last_run_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.commit()
            await self.db.refresh(result)

            logger.info(
                "[org:%d] Scenario %d v%d completed in %.2fs — delta=%.1f%%",
                self.org_id,
                scenario.id,
                scenario.version,
                elapsed,
                summary["demand_delta_pct"],
            )
            return result

        except Exception as exc:
            logger.exception("[org:%d] Scenario %d simulation failed", self.org_id, scenario_id)
            await self.repo.set_status(scenario_id, ScenarioStatus.FAILED)
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Simulation failed: {exc}",
            )
