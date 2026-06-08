"""Scenario Engine — model-based What-If simulation.

Replaces the Phase 3A placeholder with a real inference pipeline:

  1. Load active ModelVersion from DB
  2. Load persisted .pkl artifact from disk
  3. Run baseline inference via XGBoostForecastModel.predict()
  4. Apply scenario modifiers:
       • marketing_spend_pct  → demand elasticity multiplier
       • price_change_pct     → price-demand elasticity
       • lead_time_days       → stockout risk window adjustment
       • safety_stock_multiplier → inventory buffer headroom
  5. Re-run modified inference week-by-week
  6. Compute deltas: demand, revenue, inventory, stockout risk

Design rules:
  - Does NOT retrain the model
  - Does NOT create synthetic models
  - Uses only the active persisted artifact
  - All computation is synchronous (Celery dispatch is Phase 3C)
  - Stateless: creates a temporary XGBoostForecastModel from the pkl;
    never mutates the global singleton
"""

from __future__ import annotations

import logging
import os
import pickle
from copy import deepcopy
from datetime import datetime, timedelta
from typing import Any, Optional

import numpy as np
import pandas as pd

from app.models import ModelVersion

logger = logging.getLogger("titan.ml.scenario_engine")


# ── Modifier Defaults ─────────────────────────────────────────────────

# Elasticities (unit: % demand change per % variable change)
MARKETING_ELASTICITY = 0.3    # +1% marketing spend → +0.3% demand
PRICE_ELASTICITY = -0.6       # +1% price           → -0.6% demand

# Stockout risk: weeks where simulated demand exceeds (safety stock + reorder) threshold
# We use demand > baseline_95th_pct as a proxy for stockout pressure
STOCKOUT_PERCENTILE = 90


# ── Artifact Loading ─────────────────────────────────────────────────

def _load_model_state(artifact_path: str) -> dict[str, Any] | None:
    """Load raw pkl state dict from disk. Returns None on failure."""
    if not artifact_path or not os.path.exists(artifact_path):
        logger.warning("Artifact not found at path: %s", artifact_path)
        return None
    try:
        with open(artifact_path, "rb") as f:
            state = pickle.load(f)
        logger.info("Loaded model artifact from %s", artifact_path)
        return state
    except Exception as exc:
        logger.error("Failed to load artifact %s: %s", artifact_path, exc)
        return None


# ── Inference Helpers ─────────────────────────────────────────────────

def _run_baseline(
    state: dict[str, Any],
    weeks: int,
    capture_features: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Run the model in its unmodified state to produce baseline forecast.

    Returns
    -------
    (predictions, feature_rows)
      predictions   — standard list of weekly result dicts
      feature_rows  — list of raw feature dicts (populated when capture_features=True)
    """
    model = state["model"]
    last_date = state["last_date"]
    recent = list(state["last_demands"])
    std_dev = state["std_dev"]
    seasonal_amplitude = state["seasonal_amplitude"]

    predictions: list[dict[str, Any]] = []
    feature_rows: list[dict[str, Any]] = []
    current_date = last_date

    for i in range(weeks):
        current_date += timedelta(weeks=1)
        week = int(current_date.isocalendar()[1])
        month = current_date.month
        year = current_date.year

        lag_1 = recent[-1] if len(recent) >= 1 else state["last_demand"]
        lag_4 = recent[-4] if len(recent) >= 4 else state["last_4_demand"]

        X_pred = pd.DataFrame({
            "week": [week],
            "month": [month],
            "year": [year],
            "lag_1": [lag_1],
            "lag_4": [lag_4],
        })

        raw_value = float(model.predict(X_pred)[0])
        seasonal_factor = seasonal_amplitude * np.sin(2 * np.pi * week / 52)
        pred_value = max(0.0, raw_value + seasonal_factor)

        horizon_factor = 1 + (i * 0.04)
        ci = 1.96 * std_dev * horizon_factor

        predictions.append({
            "week": i + 1,
            "date": current_date.strftime("%Y-%m-%d"),
            "predicted_demand": round(pred_value, 1),
            "confidence_lower": round(max(0.0, pred_value - ci), 1),
            "confidence_upper": round(pred_value + ci, 1),
            # raw model output before seasonal adjustment (used for SHAP math)
            "_raw": raw_value,
        })
        if capture_features:
            feature_rows.append({
                "week": week, "month": month, "year": year,
                "lag_1": lag_1, "lag_4": lag_4,
                "date": current_date.strftime("%Y-%m-%d"),
            })
        recent.append(pred_value)

    return predictions, feature_rows


def _run_modified(
    state: dict[str, Any],
    weeks: int,
    demand_multiplier: float,
    lead_time_adjustment: float,
    capture_features: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Re-run inference with modified lag inputs (feedback loop).

    Modified lag values propagate demand changes into future lags,
    giving a more realistic counterfactual than simply scaling outputs.

    Returns
    -------
    (predictions, feature_rows)
      predictions   — standard list of weekly result dicts
      feature_rows  — list of raw feature dicts (populated when capture_features=True)
    """
    model = state["model"]
    last_date = state["last_date"]
    recent = [v * demand_multiplier for v in state["last_demands"]]
    std_dev = state["std_dev"]
    seasonal_amplitude = state["seasonal_amplitude"]

    predictions: list[dict[str, Any]] = []
    feature_rows: list[dict[str, Any]] = []
    current_date = last_date

    for i in range(weeks):
        current_date += timedelta(weeks=1)
        week = int(current_date.isocalendar()[1])
        month = current_date.month
        year = current_date.year

        lag_1 = recent[-1] if len(recent) >= 1 else state["last_demand"] * demand_multiplier
        lag_4 = recent[-4] if len(recent) >= 4 else state["last_4_demand"] * demand_multiplier

        X_pred = pd.DataFrame({
            "week": [week],
            "month": [month],
            "year": [year],
            "lag_1": [lag_1],
            "lag_4": [lag_4],
        })

        raw_value = float(model.predict(X_pred)[0])
        seasonal_factor = seasonal_amplitude * np.sin(2 * np.pi * week / 52)
        pred_value = max(0.0, raw_value + seasonal_factor)

        # Lead time increase → model doesn't directly use it, but it widens CI
        lt_ci_factor = 1 + max(0, lead_time_adjustment / 14)  # each 2 weeks → +1.0 factor
        horizon_factor = 1 + (i * 0.04)
        ci = 1.96 * std_dev * horizon_factor * lt_ci_factor

        predictions.append({
            "week": i + 1,
            "date": current_date.strftime("%Y-%m-%d"),
            "demand": round(pred_value, 1),
            "confidence_lower": round(max(0.0, pred_value - ci), 1),
            "confidence_upper": round(pred_value + ci, 1),
            # raw model output before seasonal adjustment (used for SHAP math)
            "_raw": raw_value,
        })
        if capture_features:
            feature_rows.append({
                "week": week, "month": month, "year": year,
                "lag_1": lag_1, "lag_4": lag_4,
                "date": current_date.strftime("%Y-%m-%d"),
            })
        recent.append(pred_value)

    return predictions, feature_rows


# ── Stockout Risk ─────────────────────────────────────────────────────

def _compute_stockout_risk(
    baseline_points: list[dict],
    simulated_points: list[dict],
    safety_stock_multiplier: float,
    lead_time_days: float,
) -> float:
    """Estimate % of forecast weeks with elevated stockout risk.

    Logic:
      - Baseline 90th-percentile demand sets the "stress level" threshold
      - Simulated weeks above threshold are "at risk"
      - safety_stock_multiplier buffers the threshold upward
      - Lead time increase widens the at-risk window (rolling sum)
    """
    if not baseline_points:
        return 0.0

    baseline_values = [p["predicted_demand"] for p in baseline_points]
    threshold = float(np.percentile(baseline_values, STOCKOUT_PERCENTILE))

    # safety_stock_multiplier > 1 means more buffer → threshold effectively higher
    adjusted_threshold = threshold * safety_stock_multiplier

    # Lead time risk window: each extra 7 days of lead time = 1 extra at-risk week
    lead_time_extra_weeks = max(0, lead_time_days / 7)

    at_risk = 0
    weeks = len(simulated_points)
    for i, p in enumerate(simulated_points):
        demand = p["demand"]
        # Window of lead_time_extra_weeks ahead also counts
        lookahead_demand = max(
            (simulated_points[j]["demand"] for j in range(i, min(i + max(1, int(lead_time_extra_weeks) + 1), weeks))),
            default=demand,
        )
        if lookahead_demand > adjusted_threshold:
            at_risk += 1

    return round((at_risk / weeks) * 100, 1) if weeks > 0 else 0.0


# ── Main Engine ───────────────────────────────────────────────────────

class ScenarioEngine:
    """Model-based What-If simulation engine.

    Usage:
        engine = ScenarioEngine(active_model_version, artifact_path)
        result = engine.run(parameters, horizon_weeks)
    """

    def __init__(self, model_version: ModelVersion, artifact_path: str | None):
        self.model_version = model_version
        self.artifact_path = artifact_path
        self._state: dict[str, Any] | None = None

    def load(self) -> bool:
        """Load the model artifact from disk. Returns True on success."""
        if not self.artifact_path:
            logger.warning(
                "[org:%d] No artifact path for model v%s",
                self.model_version.organization_id,
                self.model_version.version_tag,
            )
            return False
        self._state = _load_model_state(self.artifact_path)
        return self._state is not None

    def run(self, parameters: dict[str, Any], horizon_weeks: int) -> dict[str, Any]:
        """Execute the What-If simulation.

        Parameters
        ----------
        parameters : dict
            Scenario modifiers:
              - marketing_spend_pct     float  % change in marketing spend
              - price_change_pct        float  % price change (+/-)
              - lead_time_days          float  absolute lead time in days
              - safety_stock_multiplier float  multiplier on safety stock buffer (default 1.0)
              - avg_unit_value          float  revenue proxy per unit (default 50.0)

        horizon_weeks : int
            Number of weeks to forecast.

        Returns
        -------
        dict  Matching ScenarioResult.detail schema.
        """
        if self._state is None:
            raise RuntimeError("Model artifact not loaded. Call .load() first.")

        params = parameters or {}
        weeks = max(1, horizon_weeks)

        # ── Compute Composite Demand Multiplier ───────────────────────
        marketing_spend_pct = float(params.get("marketing_spend_pct", 0.0))
        price_change_pct = float(params.get("price_change_pct", 0.0))

        # Marketing effect: +MARKETING_ELASTICITY per 1% spend
        marketing_effect = 1.0 + (marketing_spend_pct / 100) * MARKETING_ELASTICITY

        # Price effect: +PRICE_ELASTICITY per 1% price change
        price_effect = 1.0 + (price_change_pct / 100) * PRICE_ELASTICITY

        demand_multiplier = marketing_effect * price_effect
        demand_multiplier = max(0.05, demand_multiplier)  # floor at 5% demand to avoid collapse

        # ── Lead Time & Safety Stock ──────────────────────────────────
        lead_time_days = float(params.get("lead_time_days", 14.0))
        lead_time_adjustment = lead_time_days - 14.0  # delta vs baseline 14 days
        safety_stock_multiplier = float(params.get("safety_stock_multiplier", 1.0))
        safety_stock_multiplier = max(0.1, safety_stock_multiplier)

        # ── Avg Unit Value for Revenue ────────────────────────────────
        avg_unit_value = float(params.get("avg_unit_value", 50.0))

        logger.info(
            "[org:%d] Scenario engine: multiplier=%.4f (mkt=%.3f price=%.3f) "
            "lead_time=%.1f ss_mult=%.2f weeks=%d",
            self.model_version.organization_id,
            demand_multiplier,
            marketing_effect,
            price_effect,
            lead_time_days,
            safety_stock_multiplier,
            weeks,
        )

        # ── Baseline Inference ────────────────────────────────────────
        baseline_points, _ = _run_baseline(self._state, weeks)
        baseline_demand = sum(p["predicted_demand"] for p in baseline_points)

        # ── Modified Inference ────────────────────────────────────────
        simulated_points, _ = _run_modified(
            self._state,
            weeks,
            demand_multiplier=demand_multiplier,
            lead_time_adjustment=lead_time_adjustment,
        )
        simulated_demand = sum(p["demand"] for p in simulated_points)

        # ── Deltas ────────────────────────────────────────────────────
        demand_delta = simulated_demand - baseline_demand
        demand_delta_pct = (
            round(demand_delta / baseline_demand * 100, 2)
            if baseline_demand > 0 else 0.0
        )
        revenue_impact = round(demand_delta * avg_unit_value, 2)
        inventory_impact = round(demand_delta, 1)

        # ── Stockout Risk ─────────────────────────────────────────────
        stockout_risk_pct = _compute_stockout_risk(
            baseline_points,
            simulated_points,
            safety_stock_multiplier=safety_stock_multiplier,
            lead_time_days=lead_time_days,
        )

        # ── Recommendations ───────────────────────────────────────────
        recommendations = []
        if demand_delta_pct > 15:
            extra_units = abs(round(inventory_impact * 0.25))
            recommendations.append(
                f"Demand surge of {demand_delta_pct:.1f}% projected — "
                f"raise safety stock by ~{extra_units} units to cover peak weeks."
            )
        elif demand_delta_pct < -15:
            recommendations.append(
                f"Demand contraction of {abs(demand_delta_pct):.1f}% projected — "
                f"reduce reorder quantities by ~{abs(round(inventory_impact * 0.3))} units to avoid overstock."
            )

        if lead_time_adjustment > 7:
            recommendations.append(
                f"Lead time increase of {lead_time_adjustment:.0f} days adds stockout exposure "
                f"— consider dual-sourcing or raising safety stock buffer."
            )
        elif lead_time_adjustment < -7:
            recommendations.append(
                f"Lead time reduction of {abs(lead_time_adjustment):.0f} days — "
                f"safety stock can be reduced proportionally."
            )

        if safety_stock_multiplier < 0.7:
            recommendations.append(
                "Safety stock buffer below 70% of baseline — elevated stockout risk during demand spikes."
            )
        elif safety_stock_multiplier > 1.5:
            recommendations.append(
                f"Safety stock buffer {safety_stock_multiplier:.1f}x baseline — "
                f"excess holding cost of ~{round(inventory_impact * 0.1 * avg_unit_value, 0):.0f} revenue units."
            )

        if stockout_risk_pct > 30:
            recommendations.append(
                f"Stockout risk elevated to {stockout_risk_pct:.0f}% of forecast weeks — "
                f"immediate reorder review recommended."
            )

        if not recommendations:
            recommendations.append(
                "Scenario parameters produce manageable impact — current inventory plan remains adequate."
            )

        # ── Build Model Info Section ──────────────────────────────────
        model_info = {
            "version_tag": self.model_version.version_tag,
            "model_type": self.model_version.model_type,
            "base_accuracy": self.model_version.accuracy,
            "base_rmse": self.model_version.rmse,
            "data_source": self.model_version.data_source,
        }

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
                    "week": p["week"],
                    "date": p["date"],
                    "demand": p["predicted_demand"],
                    "confidence_lower": p["confidence_lower"],
                    "confidence_upper": p["confidence_upper"],
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
                "marketing_effect": round(marketing_effect, 4),
                "price_effect": round(price_effect, 4),
            },
            "model_info": model_info,
        }

    def explain(
        self,
        parameters: dict[str, Any],
        horizon_weeks: int,
    ) -> dict[str, Any]:
        """Run SHAP-based delta explainability for a scenario simulation.

        Executes both baseline and modified inference with feature capture
        enabled, then delegates to ShapService.explain_scenario().

        Returns the full explain dict (or explainer_ready=False on failure).
        Does NOT persist any state to the database.
        """
        if self._state is None:
            return {"explainer_ready": False, "reason": "Model artifact not loaded"}

        FEATURE_NAMES = ["week", "month", "year", "lag_1", "lag_4"]

        params = parameters or {}
        weeks = max(1, horizon_weeks)

        marketing_spend_pct = float(params.get("marketing_spend_pct", 0.0))
        price_change_pct    = float(params.get("price_change_pct", 0.0))
        lead_time_days      = float(params.get("lead_time_days", 14.0))
        lead_time_adjustment = lead_time_days - 14.0

        marketing_effect = 1.0 + (marketing_spend_pct / 100) * MARKETING_ELASTICITY
        price_effect     = 1.0 + (price_change_pct / 100) * PRICE_ELASTICITY
        demand_multiplier = max(0.05, marketing_effect * price_effect)

        try:
            baseline_points, baseline_features = _run_baseline(
                self._state, weeks, capture_features=True
            )
            simulated_points, simulated_features = _run_modified(
                self._state, weeks,
                demand_multiplier=demand_multiplier,
                lead_time_adjustment=lead_time_adjustment,
                capture_features=True,
            )
        except Exception as exc:
            logger.error("ScenarioEngine.explain(): inference failed: %s", exc)
            return {"explainer_ready": False, "reason": str(exc)}

        # Raw pre-seasonal predictions for SHAP math accuracy
        baseline_preds  = [p["_raw"] for p in baseline_points]
        simulated_preds = [p["_raw"] for p in simulated_points]

        historical_data = self._state.get("historical_data", [])

        try:
            from app.services.shap_service import ShapService
            result = ShapService.explain_scenario(
                model=self._state["model"],
                historical_data=historical_data,
                baseline_features=baseline_features,
                simulated_features=simulated_features,
                baseline_predictions=baseline_preds,
                simulated_predictions=simulated_preds,
                feature_names=FEATURE_NAMES,
            )
        except Exception as exc:
            logger.error("ScenarioEngine.explain(): ShapService failed: %s", exc)
            return {"explainer_ready": False, "reason": str(exc)}

        return result
