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
    csv_text: str
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

    if active_model and active_model.model_path:
        # Load from disk if available
        forecast_model.load(active_model.model_path)
    elif not forecast_model.is_trained:
        forecast_model.train()

    forecasts = forecast_model.predict(weeks_ahead=weeks)

    return {
        "forecasts": forecasts,
        "historical": forecast_model.historical_data,
        "model_version": active_model.version_tag if active_model else f"v{forecast_model.training_id}.0 (XGBoost)",
        "accuracy": forecast_model.metrics["accuracy"],
        "rmse": forecast_model.metrics["rmse"],
        "training_samples": forecast_model.metrics["training_samples"],
        "training_id": forecast_model.training_id,
        "data_source": forecast_model.data_source,
        "last_trained": forecast_model.metrics["last_trained"],
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
    """Get forecasts aggregated by category."""
    from app.repositories.product_repo import ProductRepository
    product_repo = ProductRepository(db, tenant.org_id)
    categories = await product_repo.get_categories()

    result = []
    for cat in categories:
        result.append({
            "category": cat["category"],
            "current_demand": cat["total_sales"],
            "predicted_demand": int(cat["total_sales"] * 1.1),  # Placeholder until per-category ML
            "change_pct": 10.0,
        })

    return {"categories": result}


@router.get("/model-info")
async def get_model_info(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get ML model metadata and performance metrics."""
    # Check for persisted model version
    mv_repo = ModelVersionRepository(db, tenant.org_id)
    active_model = await mv_repo.get_active()

    if active_model:
        return {
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

    # Fallback to in-memory model
    if not forecast_model.is_trained:
        forecast_model.train()

    metrics = forecast_model.metrics
    return {
        "model_type": "XGBRegressor",
        "version": "v2.0",
        "accuracy": metrics["accuracy"],
        "mae": metrics["mae"],
        "rmse": metrics["rmse"],
        "mape": round((metrics["mae"] / 1000) * 100, 1) if metrics["mae"] else 5.3,
        "features_used": 5,
        "training_samples": metrics["training_samples"],
        "last_trained": metrics["last_trained"],
        "feature_importance": metrics.get("feature_importance", {}),
        "convergence": metrics.get("convergence", []),
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

    Returns a task_id immediately.  Poll GET /api/v1/tasks/{task_id}
    for progress, or subscribe to WebSocket events for live updates.
    """
    if not tenant.can_manage_ml:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Insufficient permissions to retrain model")

    from app.tasks.retraining_tasks import retrain_model_async

    task = retrain_model_async.delay(
        org_id=tenant.org_id,
        user_id=tenant.user_id,
        csv_text=req.csv_text,
        filename=req.filename,
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
    """Reset model to synthetic/default data."""
    forecast_model.train(source_name="synthetic")
    forecasts = forecast_model.predict(weeks_ahead=12)

    version_tag = f"v{forecast_model.training_id}.0"
    
    from app.config import settings
    import os
    model_filename = f"model_org_{tenant.org_id}_{version_tag}.pkl".replace(" ", "_")
    model_path = os.path.join(settings.ML_MODEL_PATH, model_filename)
    forecast_model.save(model_path)

    mv_repo = ModelVersionRepository(db, tenant.org_id)
    await mv_repo.deactivate_all()
    mv = ModelVersion(
        organization_id=tenant.org_id,
        version_tag=version_tag,
        model_type="XGBRegressor",
        accuracy=forecast_model.metrics["accuracy"],
        mae=forecast_model.metrics["mae"],
        rmse=forecast_model.metrics["rmse"],
        training_samples=forecast_model.metrics["training_samples"],
        data_source=forecast_model.data_source,
        feature_importance=forecast_model.metrics.get("feature_importance", {}),
        is_active=True,
        model_path=model_path
    )
    db.add(mv)
    await db.commit()

    return {
        "status": "reset",
        "forecasts": forecasts,
        "historical": forecast_model.historical_data,
        "model_version": version_tag,
        "accuracy": forecast_model.metrics["accuracy"],
        "rmse": forecast_model.metrics["rmse"],
        "training_samples": forecast_model.metrics["training_samples"],
        "training_id": forecast_model.training_id,
        "data_source": forecast_model.data_source,
        "last_trained": forecast_model.metrics["last_trained"],
    }
