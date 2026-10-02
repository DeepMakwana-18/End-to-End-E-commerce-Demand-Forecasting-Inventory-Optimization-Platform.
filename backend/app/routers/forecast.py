"""Forecast API routes — demand predictions with DB persistence and model versioning."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import io
import pandas as pd

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.services.ml_service import forecast_model
from app.models import Forecast, ModelVersion
from app.repositories.forecast_repo import ForecastRepository, ModelVersionRepository

router = APIRouter(prefix="/forecast", tags=["Forecasting"])


class RetrainRequest(BaseModel):
    csv_text: str | None = None   # Optional — if absent, backend reloads from disk
    filename: str = "uploaded.csv"


@router.get("")
async def get_forecasts(
    weeks: int = Query(default=12, ge=1, le=52),
    category: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get demand forecasts with confidence intervals."""
    mv_repo = ModelVersionRepository(db, tenant.org_id)
    active_model = await mv_repo.get_active()

    if not active_model or not active_model.model_path:
        # No model trained for this org — return empty state
        return {
            "forecasts": [],
            "historical": [],
            "model_version": None,
            "accuracy": None,
            "rmse": None,
            "training_samples": 0,
            "training_id": 0,
            "data_source": None,
            "last_trained": None,
            "has_model": False,
        }

    # Load model for this org (reload if version changed or singleton is blank)
    singleton_tag = f"v{forecast_model.training_id}.0" if forecast_model.is_trained else None
    if not forecast_model.is_trained or singleton_tag != active_model.version_tag:
        forecast_model.load(active_model.model_path)

    if not forecast_model.is_trained:
        return {
            "forecasts": [],
            "historical": [],
            "model_version": None,
            "accuracy": None,
            "rmse": None,
            "training_samples": 0,
            "training_id": 0,
            "data_source": None,
            "last_trained": None,
            "has_model": False,
        }

    forecasts = forecast_model.predict(weeks_ahead=weeks)

    return {
        "forecasts": forecasts,
        "historical": forecast_model.historical_data,
        "model_version": active_model.version_tag,
        "accuracy": forecast_model.metrics["accuracy"],
        "rmse": forecast_model.metrics["rmse"],
        "training_samples": forecast_model.metrics["training_samples"],
        "training_id": forecast_model.training_id,
        "data_source": forecast_model.data_source,
        "last_trained": forecast_model.metrics["last_trained"],
        "has_model": True,
    }


@router.get("/explain")
async def explain_forecast(
    weeks: int = Query(default=12, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Generate per-week SHAP explanations for the upcoming forecast.

    Returns one explanation object per requested week containing:
      - prediction            : seasonally-adjusted model output (matches /forecast)
      - prediction_raw        : raw model output before seasonal adjustment (SHAP basis)
      - seasonal_adjustment   : seasonal component applied (raw → prediction)
      - base_value            : SHAP expected value (E[f(x)])
      - feature_vector        : the exact input features for that week
      - shap_values           : per-feature SHAP contributions
      - top_drivers           : contributors sorted by absolute magnitude

    Also returns:
      - model_version         : active model version tag
      - driver_summary        : per-feature aggregate SHAP impact across all weeks
    """
    import numpy as np
    from datetime import timedelta
    from app.services.ml_service import FEATURE_NAMES
    from app.services.shap_service import ShapService

    # ── Ensure model is loaded ────────────────────────────────────────────────
    mv_repo = ModelVersionRepository(db, tenant.org_id)
    active_model = await mv_repo.get_active()

    if not active_model or not active_model.model_path:
        return {"error": "No trained model for this organisation.", "weeks": [], "explainer_ready": False, "has_model": False}

    # Only reload from disk when version changed or singleton is blank.
    singleton_tag = f"v{forecast_model.training_id}.0" if forecast_model.is_trained else None
    if not forecast_model.is_trained or singleton_tag != active_model.version_tag:
        forecast_model.load(active_model.model_path)

    if not forecast_model.is_trained:
        return {"error": "Model not ready", "weeks": [], "explainer_ready": False}

    model_version = active_model.version_tag if active_model else f"v{forecast_model.training_id}.0"

    # ── Build feature vectors for each forecast week ──────────────────
    # Mirrors the predict() logic so feature values are identical
    feature_vectors: list[dict] = []
    raw_predictions: list[float] = []
    seasonal_adjustments: list[float] = []

    current_date = forecast_model.last_date
    recent = list(forecast_model.last_demands)

    for i in range(weeks):
        current_date += timedelta(weeks=1)
        week = current_date.isocalendar()[1]
        month = current_date.month
        year = current_date.year

        lag_1 = float(recent[-1]) if len(recent) >= 1 else float(forecast_model.last_demand)
        lag_4 = float(recent[-4]) if len(recent) >= 4 else float(forecast_model.last_4_demand)

        fvec = {
            "week": int(week),
            "month": int(month),
            "year": int(year),
            "lag_1": round(lag_1, 4),
            "lag_4": round(lag_4, 4),
            "date": current_date.strftime("%Y-%m-%d"),
        }
        feature_vectors.append(fvec)

        # Replicate raw model prediction (no seasonal offset) — SHAP basis
        X_pred = pd.DataFrame([{k: fvec[k] for k in FEATURE_NAMES}])
        raw_pred = float(forecast_model.model.predict(X_pred)[0])
        raw_predictions.append(raw_pred)

        # Seasonal component (same formula as predict())
        seasonal_factor = forecast_model.seasonal_amplitude * float(
            np.sin(2 * np.pi * week / 52)
        )
        seasonal_adjustments.append(round(seasonal_factor, 4))

        # Advance the lag window with seasonally-adjusted value (same as predict())
        adjusted = max(0.0, raw_pred + seasonal_factor)
        recent.append(adjusted)

    # ── Run SHAP explainer ────────────────────────────────────────────
    try:
        explanations = ShapService.explain_forecast(
            model=forecast_model.model,
            historical_data=forecast_model.historical_data,
            feature_vectors=feature_vectors,
            predictions=raw_predictions,
            feature_names=FEATURE_NAMES,
        )
        # Enrich each week with seasonal-adjusted prediction and seasonal_adjustment delta
        for i, exp in enumerate(explanations):
            raw = exp["prediction"]
            adj = seasonal_adjustments[i]
            exp["prediction"] = round(max(0.0, raw + adj), 2)  # matches /forecast
            exp["prediction_raw"] = round(raw, 2)
            exp["seasonal_adjustment"] = adj
        explainer_ready = True
    except Exception as exc:
        import logging
        logging.getLogger("titan.routers.forecast").error(
            "SHAP explain failed: %s", exc, exc_info=True
        )
        # Return predictions without SHAP rather than a hard 500
        explanations = [
            {
                "week": i + 1,
                "date": fv["date"],
                "prediction": round(max(0.0, raw_predictions[i] + seasonal_adjustments[i]), 2),
                "prediction_raw": round(raw_predictions[i], 2),
                "seasonal_adjustment": seasonal_adjustments[i],
                "base_value": None,
                "feature_vector": {k: fv[k] for k in FEATURE_NAMES},
                "shap_values": {},
                "top_drivers": [],
            }
            for i, fv in enumerate(feature_vectors)
        ]
        explainer_ready = False

    # ── Build driver_summary aggregation (matches scenario explain shape) ──
    driver_summary = []
    if explainer_ready and explanations:
        from collections import defaultdict
        feature_deltas: dict[str, list[float]] = defaultdict(list)
        for exp in explanations:
            for feat, val in (exp.get("shap_values") or {}).items():
                feature_deltas[feat].append(float(val))
        for feat in FEATURE_NAMES:
            deltas = feature_deltas.get(feat, [])
            if not deltas:
                continue
            mean_delta = sum(deltas) / len(deltas)
            mean_abs = sum(abs(d) for d in deltas) / len(deltas)
            driver_summary.append({
                "feature": feat,
                "mean_shap": round(mean_delta, 4),
                "mean_abs_shap": round(mean_abs, 4),
                "direction": "positive" if mean_delta >= 0 else "negative",
                "weeks_positive": sum(1 for d in deltas if d > 0),
                "weeks_negative": sum(1 for d in deltas if d < 0),
                "weeks_neutral": sum(1 for d in deltas if d == 0),
            })
        driver_summary.sort(key=lambda x: x["mean_abs_shap"], reverse=True)

    return {
        "weeks": explanations,
        "model_version": model_version,
        "model_type": type(forecast_model.model).__name__,
        "feature_names": FEATURE_NAMES,
        "explainer_ready": explainer_ready,
        "data_source": forecast_model.data_source,
        "driver_summary": driver_summary,
    }


@router.get("/product/{product_id}")
async def get_product_forecast(
    product_id: int,
    weeks: int = Query(default=8, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get forecast for a specific product from DB."""
    repo = ForecastRepository(db, tenant.org_id)
    forecasts = await repo.get_latest_forecasts(product_id=product_id, limit=weeks)

    result = []
    for i, f in enumerate(reversed(list(forecasts))):
        result.append({
            "week": i + 1,
            "date": f.forecast_date.strftime("%Y-%m-%d") if f.forecast_date else "",
            "predicted_demand": f.predicted_demand,
            "confidence_lower": f.confidence_lower or 0,
            "confidence_upper": f.confidence_upper or 0,
        })

    return {"product_id": product_id, "forecasts": result}


@router.get("/categories")
async def get_category_forecasts(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get demand forecasts aggregated by category.

    When forecasts are linked to products (seeded dataset), returns real
    per-category breakdowns. When forecasts have no product_id (uploaded
    CSV datasets), returns an org-level aggregate row.
    No hardcoded values are used in either path.
    """
    from app.models import Forecast, Product
    from sqlalchemy import select, func

    org_id = tenant.org_id

    # Step 1: find the latest actual date
    latest_date = (await db.execute(
        select(func.max(Forecast.forecast_date))
        .where(Forecast.organization_id == org_id)
        .where(Forecast.actual_demand.isnot(None))
    )).scalar()

    if latest_date is None:
        return {"categories": [], "note": "No historical forecast data available"}

    # Step 2: find the earliest future predicted date
    future_date = (await db.execute(
        select(func.min(Forecast.forecast_date))
        .where(Forecast.organization_id == org_id)
        .where(Forecast.actual_demand.is_(None))
        .where(Forecast.predicted_demand.isnot(None))
    )).scalar()

    # Step 3: check whether forecasts are product-linked
    has_product_id = (await db.execute(
        select(func.count(Forecast.id))
        .where(Forecast.organization_id == org_id)
        .where(Forecast.product_id.isnot(None))
        .where(Forecast.actual_demand.isnot(None))
    )).scalar() or 0

    result = []

    if has_product_id > 0:
        # ── Product-linked forecasts: per-category breakdown ──────────────
        # Current demand: latest actual date, grouped by product category
        current_rows = (await db.execute(
            select(
                Product.category,
                func.coalesce(func.sum(Forecast.actual_demand), 0).label("current_demand"),
            )
            .join(Product, Forecast.product_id == Product.id)
            .where(Forecast.organization_id == org_id)
            .where(Forecast.actual_demand.isnot(None))
            .where(Forecast.forecast_date == latest_date)
            .group_by(Product.category)
        )).all()
        current_by_cat = {row.category: float(row.current_demand) for row in current_rows}

        # Predicted demand: next forecast date grouped by category
        lookup_date = future_date if future_date is not None else latest_date
        is_future = future_date is not None
        pred_stmt = (
            select(
                Product.category,
                func.coalesce(func.sum(Forecast.predicted_demand), 0).label("predicted_demand"),
            )
            .join(Product, Forecast.product_id == Product.id)
            .where(Forecast.organization_id == org_id)
            .where(Forecast.forecast_date == lookup_date)
            .group_by(Product.category)
        )
        if is_future:
            pred_stmt = pred_stmt.where(Forecast.actual_demand.is_(None))
        pred_by_cat = {row.category: float(row.predicted_demand) for row in (await db.execute(pred_stmt)).all()}

        all_categories = sorted(set(list(current_by_cat) + list(pred_by_cat)))
        for cat in all_categories:
            current = current_by_cat.get(cat, 0.0)
            predicted = pred_by_cat.get(cat, 0.0)
            if current <= 0 and predicted <= 0:
                continue
            change_pct = round((predicted - current) / current * 100, 1) if current > 0 else 100.0
            result.append({
                "category": cat,
                "current_demand": round(current, 1),
                "predicted_demand": round(predicted, 1),
                "change_pct": change_pct,
            })

    else:
        # ── Org-level forecasts (uploaded CSV, no product_id) ──────────
        # Compute org-wide aggregate using the last 4 actual weeks vs next 4 predicted weeks
        from datetime import timedelta

        # Last 4 weeks of actuals
        w4_start = latest_date - timedelta(weeks=4)
        current_sum = (await db.execute(
            select(func.coalesce(func.sum(Forecast.actual_demand), 0))
            .where(Forecast.organization_id == org_id)
            .where(Forecast.actual_demand.isnot(None))
            .where(Forecast.forecast_date > w4_start)
            .where(Forecast.forecast_date <= latest_date)
        )).scalar() or 0.0

        # Next 4 weeks of predictions
        if future_date is not None:
            w4_future_end = future_date + timedelta(weeks=4)
            predicted_sum = (await db.execute(
                select(func.coalesce(func.sum(Forecast.predicted_demand), 0))
                .where(Forecast.organization_id == org_id)
                .where(Forecast.actual_demand.is_(None))
                .where(Forecast.predicted_demand.isnot(None))
                .where(Forecast.forecast_date >= future_date)
                .where(Forecast.forecast_date < w4_future_end)
            )).scalar() or 0.0
        else:
            # No future rows: use predicted_demand from the latest actual rows
            predicted_sum = (await db.execute(
                select(func.coalesce(func.sum(Forecast.predicted_demand), 0))
                .where(Forecast.organization_id == org_id)
                .where(Forecast.forecast_date > w4_start)
                .where(Forecast.forecast_date <= latest_date)
            )).scalar() or 0.0

        current = float(current_sum)
        predicted = float(predicted_sum)
        if current > 0 or predicted > 0:
            change_pct = round((predicted - current) / current * 100, 1) if current > 0 else 0.0
            result.append({
                "category": "All Products (Org-Level)",
                "current_demand": round(current, 1),
                "predicted_demand": round(predicted, 1),
                "change_pct": change_pct,
            })

    return {
        "categories": result,
        "data_date": str(latest_date)[:10] if latest_date else None,
        "forecast_date": str(future_date)[:10] if future_date else None,
        "product_linked": has_product_id > 0,
    }


@router.get("/model-info")
async def get_model_info(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get ML model metadata and performance metrics."""
    # Check for persisted model version
    mv_repo = ModelVersionRepository(db, tenant.org_id)
    active_model = await mv_repo.get_active()

    if active_model and active_model.model_path:
        return {
            "has_model": True,
            "model_type": active_model.model_type,
            "version": active_model.version_tag,
            "accuracy": active_model.accuracy,
            "mae": active_model.mae,
            "rmse": active_model.rmse,
            "features_used": 5,
            "training_samples": active_model.training_samples,
            "last_trained": active_model.created_at.isoformat() if active_model.created_at else None,
            "feature_importance": active_model.feature_importance or {},
            "convergence": active_model.convergence or [],
            "data_source": active_model.data_source,
        }

    # If no active model exists for this tenant, return has_model: False with null metrics
    return {
        "has_model": False,
        "model_type": None,
        "version": None,
        "accuracy": None,
        "mae": None,
        "rmse": None,
        "features_used": 0,
        "training_samples": 0,
        "last_trained": None,
        "feature_importance": {},
        "convergence": [],
        "data_source": None,
    }


@router.get("/training-history")
async def get_training_history(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get ML model training history."""
    mv_repo = ModelVersionRepository(db, tenant.org_id)
    versions = await mv_repo.get_training_history(limit=20)
    return {
        "versions": [
            {
                "id": v.id,
                "version_tag": v.version_tag,
                "model_type": v.model_type,
                "accuracy": v.accuracy,
                "mae": v.mae,
                "rmse": v.rmse,
                "training_samples": v.training_samples,
                "data_source": v.data_source,
                "is_active": v.is_active,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ]
    }


@router.post("/retrain")
async def retrain_model(
    req: RetrainRequest,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Retrain the ML model asynchronously via Celery.

    If csv_text is provided in the body, retrains on that data.
    If csv_text is absent/null, reloads the CSV stored on disk from the last upload
    (path stored in ModelVersion.hyperparameters["csv_path"]).
    Returns a task_id — poll GET /api/v1/tasks/{task_id} for progress.
    """
    if not tenant.can_manage_ml:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Insufficient permissions to retrain model")

    csv_text = req.csv_text
    filename = req.filename

    if not csv_text:
        import os
        mv_repo = ModelVersionRepository(db, tenant.org_id)
        active_mv = await mv_repo.get_active()

        if active_mv and active_mv.hyperparameters:
            stored_csv_path = active_mv.hyperparameters.get("csv_path")
            stored_filename = active_mv.hyperparameters.get("csv_filename", "uploaded.csv")

            if stored_csv_path and os.path.exists(stored_csv_path):
                try:
                    with open(stored_csv_path, "r", encoding="utf-8") as _f:
                        csv_text = _f.read()
                    filename = stored_filename
                except Exception as _exc:
                    from fastapi import HTTPException
                    raise HTTPException(
                        status_code=500,
                        detail=f"Could not read stored dataset ({stored_csv_path}): {_exc}",
                    )
            elif active_mv.data_source and active_mv.data_source.startswith("uploaded:"):
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"The active model ({active_mv.version_tag}) was trained on "
                        f"{active_mv.data_source} but the dataset file is not on disk. "
                        "Please re-upload the original CSV to retrain."
                    ),
                )
            else:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "The active model is a synthetic baseline. "
                        "Upload a CSV file first, or use Reset to regenerate the synthetic baseline."
                    ),
                )
        else:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail="No active model or stored dataset found. Upload a CSV file to retrain.",
            )

    from app.tasks.retraining_tasks import retrain_model_async

    task = retrain_model_async.delay(
        org_id=tenant.org_id,
        user_id=tenant.user_id,
        csv_text=csv_text,
        filename=filename,
    )

    return {
        "status": "queued",
        "task_id": task.id,
        "message": "Model retraining started. Poll /api/v1/tasks/{task_id} for progress.",
    }


@router.post("/reset")
async def reset_model(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Reset model to synthetic/default data (async via Celery).

    Returns immediately with a task_id. Poll GET /api/v1/tasks/{task_id}
    for progress. The worker will train on synthetic data, persist a new
    ModelVersion, write Forecast rows, and trigger an anomaly scan.
    """
    if not tenant.can_manage_ml:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=403, detail="Insufficient permissions to reset model")

    from app.tasks.retraining_tasks import reset_model_async

    task = reset_model_async.delay(
        org_id=tenant.org_id,
        user_id=tenant.user_id,
    )

    return {
        "status": "queued",
        "task_id": task.id,
        "message": (
            "Model reset to synthetic baseline queued \u2014 "
            f"poll GET /api/v1/tasks/{task.id} for progress."
        ),
    }
