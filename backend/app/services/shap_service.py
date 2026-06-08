"""SHAP Explainability Service — Phase 5B/5C (Forecast + Scenario Explainability).

Provides on-demand SHAP explanations for forecast predictions and
scenario simulations using shap.TreeExplainer with
HistGradientBoostingRegressor.

Architecture:
  - ShapService is stateless; callers pass the loaded model object.
  - Explainer instances are cached in-process by model identity (id()).
  - Background dataset is built from the model's historical_data list.
  - All public methods return plain dicts safe for JSON serialisation.

Usage (forecast):
    from app.services.shap_service import ShapService

    explanations = ShapService.explain_forecast(
        model=forecast_model.model,
        historical_data=forecast_model.historical_data,
        feature_vectors=feature_matrix,
        predictions=predictions,
        feature_names=FEATURE_NAMES,
    )

Usage (scenario):
    result = ShapService.explain_scenario(
        model=state["model"],
        historical_data=state["historical_data"],
        baseline_features=baseline_rows,      # list of dicts
        simulated_features=simulated_rows,    # list of dicts
        baseline_predictions=baseline_preds,  # list of floats (raw, pre-seasonal)
        simulated_predictions=sim_preds,      # list of floats (raw, pre-seasonal)
        feature_names=FEATURE_NAMES,
    )
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger("titan.services.shap")

# ── Module-level explainer cache ───────────────────────────────────────
# Key: id(model_object), Value: (TreeExplainer, base_value)
_EXPLAINER_CACHE: dict[int, tuple[Any, float]] = {}
_MAX_CACHE_SIZE = 4  # keep at most 4 explainers (one per recent model version)


def _get_or_build_explainer(
    model: Any,
    background_X: pd.DataFrame,
) -> tuple[Any, float]:
    """Return a cached (explainer, base_value) pair or build a new one.

    Uses the Python object id() of the model as the cache key.
    If the cache is full, the oldest entry is evicted (FIFO).
    """
    import shap

    key = id(model)
    if key in _EXPLAINER_CACHE:
        logger.debug("SHAP: cache hit for model id=%d", key)
        return _EXPLAINER_CACHE[key]

    logger.info("SHAP: building TreeExplainer (model=%s, background=%d rows)",
                type(model).__name__, len(background_X))

    try:
        explainer = shap.TreeExplainer(model, background_X)
        # base_value may be a scalar or 1-element array depending on shap version
        base_val = explainer.expected_value
        if hasattr(base_val, "__len__"):
            base_val = float(base_val[0])
        else:
            base_val = float(base_val)
    except Exception as exc:
        logger.error("SHAP: TreeExplainer build failed: %s", exc)
        raise

    # Evict oldest if cache is full
    if len(_EXPLAINER_CACHE) >= _MAX_CACHE_SIZE:
        oldest_key = next(iter(_EXPLAINER_CACHE))
        del _EXPLAINER_CACHE[oldest_key]
        logger.debug("SHAP: evicted cached explainer id=%d", oldest_key)

    _EXPLAINER_CACHE[key] = (explainer, base_val)
    logger.info("SHAP: TreeExplainer cached (base_value=%.2f)", base_val)
    return explainer, base_val


def _build_background(
    historical_data: list[dict],
    feature_names: list[str],
    n_samples: int = 50,
) -> pd.DataFrame:
    """Build a representative background dataset from historical_data list.

    historical_data is a list of {"date": str, "demand": float} dicts
    as stored in the pkl state.  We derive features from the time-sorted
    demand series the same way the model was trained.
    """
    if not historical_data:
        # Return a minimal synthetic background if no history available
        logger.warning("SHAP: no historical_data — using zero background")
        return pd.DataFrame([[1, 1, 2024, 100.0, 100.0]], columns=feature_names)

    demands = [float(r["demand"]) for r in historical_data]
    from datetime import datetime
    dates = [
        datetime.fromisoformat(r["date"]) if isinstance(r["date"], str)
        else r["date"]
        for r in historical_data
    ]

    rows = []
    for i, (dt, demand) in enumerate(zip(dates, demands)):
        lag_1 = demands[i - 1] if i >= 1 else demand
        lag_4 = demands[i - 4] if i >= 4 else demand
        rows.append({
            "week":  dt.isocalendar()[1],
            "month": dt.month,
            "year":  dt.year,
            "lag_1": lag_1,
            "lag_4": lag_4,
        })

    df = pd.DataFrame(rows)[feature_names]

    # Evenly spaced sample to cover seasonal variation
    if len(df) > n_samples:
        indices = np.linspace(0, len(df) - 1, n_samples, dtype=int)
        df = df.iloc[indices]

    return df.reset_index(drop=True)


# ── Public API ─────────────────────────────────────────────────────────

class ShapService:
    """Stateless SHAP explainability service for forecast predictions."""

    @staticmethod
    def explain_forecast(
        *,
        model: Any,
        historical_data: list[dict],
        feature_vectors: list[dict],
        predictions: list[float],
        feature_names: list[str],
    ) -> list[dict]:
        """Generate SHAP explanations for a list of forecast weeks.

        Parameters
        ----------
        model            : trained sklearn estimator (HistGradientBoostingRegressor)
        historical_data  : list of {"date", "demand"} dicts from pkl state
        feature_vectors  : list of dicts, one per forecast week, with feature_names keys
        predictions      : raw model predictions (before seasonal adjustment)
        feature_names    : ordered list of feature column names

        Returns
        -------
        list of week explanation dicts:
            {
              week, date, prediction, base_value,
              feature_vector, shap_values, top_drivers
            }
        """
        if not feature_vectors:
            return []

        # Build / retrieve explainer
        background_X = _build_background(historical_data, feature_names)
        explainer, base_value = _get_or_build_explainer(model, background_X)

        # Build full feature matrix
        X = pd.DataFrame(feature_vectors)[feature_names]

        try:
            import shap
            sv_matrix = explainer.shap_values(X)
        except Exception as exc:
            logger.error("SHAP: shap_values computation failed: %s", exc)
            raise

        results = []
        for i, (fvec, pred, sv_row) in enumerate(
            zip(feature_vectors, predictions, sv_matrix)
        ):
            shap_dict = {
                name: round(float(sv), 4)
                for name, sv in zip(feature_names, sv_row)
            }

            # Sort by absolute contribution → top_drivers list
            top_drivers = sorted(
                [
                    {
                        "feature": name,
                        "value": round(float(sv), 4),
                        "direction": "positive" if sv >= 0 else "negative",
                        "abs_value": abs(float(sv)),
                    }
                    for name, sv in shap_dict.items()
                ],
                key=lambda d: d["abs_value"],
                reverse=True,
            )
            # Remove internal abs_value before returning
            for d in top_drivers:
                del d["abs_value"]

            results.append({
                "week": i + 1,
                "date": fvec.get("date", ""),
                "prediction": round(float(pred), 2),
                "base_value": round(base_value, 4),
                "feature_vector": {
                    k: round(float(v), 4) if isinstance(v, (int, float)) else v
                    for k, v in fvec.items()
                    if k in feature_names
                },
                "shap_values": shap_dict,
                "top_drivers": top_drivers,
            })

        return results

    @staticmethod
    def invalidate_cache(model: Any) -> None:
        """Remove a model's explainer from the cache (call after retraining)."""
        key = id(model)
        if key in _EXPLAINER_CACHE:
            del _EXPLAINER_CACHE[key]
            logger.info("SHAP: cache invalidated for model id=%d", key)

    @staticmethod
    def explain_scenario(
        *,
        model: Any,
        historical_data: list[dict],
        baseline_features: list[dict],
        simulated_features: list[dict],
        baseline_predictions: list[float],
        simulated_predictions: list[float],
        feature_names: list[str],
    ) -> dict:
        """Generate delta-SHAP explanations for a scenario simulation.

        Computes SHAP values for both baseline and modified inference passes
        and returns the per-feature difference (simulated − baseline) for each
        forecast week, plus aggregate driver_summary statistics computed on the
        backend so the frontend does not need to perform any calculations.

        Parameters
        ----------
        model                : trained sklearn estimator
        historical_data      : list of {"date", "demand"} dicts from pkl state
        baseline_features    : list of feature dicts, one per week (baseline run)
        simulated_features   : list of feature dicts, one per week (modified run)
        baseline_predictions : raw model predictions for baseline (pre-seasonal)
        simulated_predictions: raw model predictions for simulated (pre-seasonal)
        feature_names        : ordered list of feature column names

        Returns
        -------
        dict with keys:
          explainer_ready     bool
          feature_names       list[str]
          base_value_baseline float
          base_value_simulated float  (same explainer → same base value)
          weeks               list of per-week dicts
          driver_summary      list of aggregate feature stats sorted by mean_abs_delta desc
        """
        if not baseline_features or not simulated_features:
            return {"explainer_ready": False, "reason": "No feature vectors provided"}

        try:
            background_X = _build_background(historical_data, feature_names)
            explainer, base_value = _get_or_build_explainer(model, background_X)

            import shap
            X_baseline = pd.DataFrame(baseline_features)[feature_names]
            X_simulated = pd.DataFrame(simulated_features)[feature_names]

            sv_baseline = explainer.shap_values(X_baseline)
            sv_simulated = explainer.shap_values(X_simulated)

        except Exception as exc:
            logger.error("SHAP explain_scenario failed: %s", exc)
            return {"explainer_ready": False, "reason": str(exc)}

        # ── Per-week week explanations ─────────────────────────────────────
        weeks_out = []
        n_weeks = min(len(baseline_features), len(simulated_features))

        for i in range(n_weeks):
            fvec_base = baseline_features[i]
            fvec_sim  = simulated_features[i]

            base_shap_dict = {
                name: round(float(sv_baseline[i][j]), 4)
                for j, name in enumerate(feature_names)
            }
            sim_shap_dict = {
                name: round(float(sv_simulated[i][j]), 4)
                for j, name in enumerate(feature_names)
            }
            delta_shap_dict = {
                name: round(sim_shap_dict[name] - base_shap_dict[name], 4)
                for name in feature_names
            }

            # Per-week top drivers sorted by |delta|
            week_drivers = sorted(
                [
                    {
                        "feature": name,
                        "delta": delta_shap_dict[name],
                        "direction": "positive" if delta_shap_dict[name] >= 0 else "negative",
                        "abs_delta": abs(delta_shap_dict[name]),
                    }
                    for name in feature_names
                ],
                key=lambda d: d["abs_delta"],
                reverse=True,
            )
            for d in week_drivers:
                del d["abs_delta"]

            weeks_out.append({
                "week": i + 1,
                "date": fvec_base.get("date", fvec_sim.get("date", "")),
                "baseline_prediction": round(float(baseline_predictions[i]) if i < len(baseline_predictions) else 0.0, 2),
                "simulated_prediction": round(float(simulated_predictions[i]) if i < len(simulated_predictions) else 0.0, 2),
                "base_value": round(base_value, 4),
                "baseline_shap": base_shap_dict,
                "simulated_shap": sim_shap_dict,
                "delta_shap": delta_shap_dict,
                "week_drivers": week_drivers,
            })

        # ── Aggregate driver_summary (across all weeks) ────────────────────
        feature_deltas: dict[str, list[float]] = {name: [] for name in feature_names}
        for w in weeks_out:
            for name in feature_names:
                feature_deltas[name].append(w["delta_shap"][name])

        driver_summary = []
        for name in feature_names:
            deltas = feature_deltas[name]
            if not deltas:
                continue
            mean_d = float(np.mean(deltas))
            mean_abs_d = float(np.mean([abs(d) for d in deltas]))
            weeks_pos = sum(1 for d in deltas if d > 0)
            weeks_neg = sum(1 for d in deltas if d < 0)
            driver_summary.append({
                "feature": name,
                "mean_delta": round(mean_d, 4),
                "mean_abs_delta": round(mean_abs_d, 4),
                "direction": "positive" if mean_d >= 0 else "negative",
                "weeks_positive": weeks_pos,
                "weeks_negative": weeks_neg,
                "weeks_neutral": n_weeks - weeks_pos - weeks_neg,
            })

        # Sort by mean absolute delta descending (most impactful first)
        driver_summary.sort(key=lambda d: d["mean_abs_delta"], reverse=True)

        return {
            "explainer_ready": True,
            "feature_names": feature_names,
            "base_value_baseline": round(base_value, 4),
            "base_value_simulated": round(base_value, 4),
            "weeks": weeks_out,
            "driver_summary": driver_summary,
        }

