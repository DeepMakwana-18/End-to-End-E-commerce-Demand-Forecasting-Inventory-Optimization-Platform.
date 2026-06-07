"""Celery tasks for ML model retraining.

Handles background retraining with progress tracking, model persistence,
and event publishing on completion.
"""

import logging
import io
import traceback
from app.celery_app import celery
from app.core.task_status import (
    set_task_status_sync,
    TASK_STATE_STARTED,
    TASK_STATE_PROGRESS,
    TASK_STATE_COMPLETED,
    TASK_STATE_FAILED,
)

logger = logging.getLogger("titan.tasks.retraining")


@celery.task(
    bind=True,
    name="titan.ml.retrain_model",
    max_retries=1,
    default_retry_delay=60,
    acks_late=True,
    time_limit=300,  # 5 min hard limit
    soft_time_limit=240,  # 4 min soft limit
)
def retrain_model_async(
    self,
    *,
    org_id: int,
    user_id: int,
    csv_text: str,
    filename: str = "uploaded.csv",
):
    """Retrain the ML model in the background.

    Steps:
      1. Parse CSV data
      2. Feature engineering
      3. Train model
      4. Evaluate metrics
      5. Persist model version to DB
      6. Publish MODEL_RETRAINED event
    """
    task_id = self.request.id
    set_task_status_sync(
        task_id,
        state=TASK_STATE_STARTED,
        message="Preparing training data...",
        org_id=org_id,
        user_id=user_id,
    )

    try:
        import pandas as pd
        from app.services.ml_service import forecast_model

        # Step 1: Parse CSV
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=10, message="Parsing CSV data...")

        df = pd.read_csv(io.StringIO(csv_text))

        # Auto-detect columns
        date_col = None
        demand_col = None
        for col in df.columns:
            cl = col.strip().lower().replace(" ", "_").replace("-", "_")
            if cl in (
                "date", "order_date", "transaction_date", "week", "ds",
                "order_day", "purchase_date", "sale_date", "created_at",
                "timestamp", "period",
            ):
                date_col = col
            if cl in (
                "demand", "quantity", "quantity_sold", "sales", "units", "y",
                "value", "total_quantity", "qty", "amount", "units_sold",
                "order_quantity", "total_sales", "revenue", "unit_price",
                "total_amount",
            ):
                demand_col = col

        if not date_col or not demand_col:
            set_task_status_sync(
                task_id,
                state=TASK_STATE_FAILED,
                error=f"Could not auto-detect date/demand columns. Found: {list(df.columns)}",
                org_id=org_id,
                user_id=user_id,
            )
            return {"error": "Column detection failed"}

        # Step 2: Feature engineering
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=25, message="Engineering features...")

        df = df.rename(columns={date_col: "date", demand_col: "demand"})
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df["demand"] = pd.to_numeric(df["demand"], errors="coerce")
        df = df.dropna(subset=["date", "demand"]).sort_values("date")
        df = df.set_index("date").resample("W")["demand"].sum().reset_index()
        df = df[df["demand"] > 0]

        if len(df) < 8:
            set_task_status_sync(
                task_id,
                state=TASK_STATE_FAILED,
                error=f"Need at least 8 weeks of data, got {len(df)}",
                org_id=org_id,
                user_id=user_id,
            )
            return {"error": "Insufficient data"}

        # Step 3: Train model
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=50, message="Training XGBoost model...")

        forecast_model.train(df, source_name=f"uploaded:{filename}")

        # Step 4: Evaluate
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=75, message="Evaluating model performance...")

        forecasts = forecast_model.predict(weeks_ahead=12)
        metrics = forecast_model.metrics

        # Step 5: Persist model version (sync DB call)
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=90, message="Persisting model version...")

        version_tag = f"v{forecast_model.training_id}.0"

        from app.config import settings
        import os
        model_filename = f"model_org_{org_id}_{version_tag}.pkl".replace(" ", "_")
        model_path = os.path.join(settings.ML_MODEL_PATH, model_filename)
        forecast_model.save(model_path)

        from app.database import async_session
        from app.repositories.forecast_repo import ModelVersionRepository
        from app.models import ModelVersion
        import asyncio

        async def _save_model_version():
            async with async_session() as db:
                repo = ModelVersionRepository(db, org_id)
                await repo.deactivate_all()
                mv = ModelVersion(
                    organization_id=org_id,
                    version_tag=version_tag,
                    model_type="XGBRegressor",
                    accuracy=metrics["accuracy"],
                    mae=metrics["mae"],
                    rmse=metrics["rmse"],
                    training_samples=metrics["training_samples"],
                    data_source=f"uploaded:{filename}",
                    feature_importance=metrics.get("feature_importance", {}),
                    is_active=True,
                    model_path=model_path
                )
                db.add(mv)
                await db.flush()

                # Clear old org-level forecasts
                from sqlalchemy import delete
                from app.models import Forecast
                from dateutil import parser
                await db.execute(delete(Forecast).where(Forecast.organization_id == org_id, Forecast.product_id == None))

                # Insert historical actuals
                hist_records = []
                for row in forecast_model.historical_data:
                    dt = parser.parse(row["date"])
                    hist_records.append(Forecast(
                        organization_id=org_id,
                        product_id=None,
                        forecast_date=dt,
                        predicted_demand=0.0,  # Required by schema
                        actual_demand=float(row["demand"]),
                        model_version_id=mv.id,
                        model_version=version_tag,
                    ))

                # Insert future predictions
                for row in forecasts:
                    dt = parser.parse(row["date"])
                    hist_records.append(Forecast(
                        organization_id=org_id,
                        product_id=None,
                        forecast_date=dt,
                        predicted_demand=float(row["predicted_demand"]),
                        actual_demand=None,
                        confidence_lower=float(row.get("lower_bound", 0.0)),
                        confidence_upper=float(row.get("upper_bound", 0.0)),
                        model_version_id=mv.id,
                        model_version=version_tag,
                    ))

                if hist_records:
                    db.add_all(hist_records)

                await db.commit()

        try:
            asyncio.run(_save_model_version())
        except Exception as db_exc:
            logger.error(f"Failed to save model version to DB: {db_exc}")

        result = {
            "status": "retrained",
            "version_tag": version_tag,
            "accuracy": metrics["accuracy"],
            "mae": metrics["mae"],
            "rmse": metrics["rmse"],
            "training_samples": metrics["training_samples"],
            "data_source": f"uploaded:{filename}",
            "forecasts": forecasts,
            "historical": forecast_model.historical_data,
            "org_id": org_id,
        }

        # Step 6: Complete
        set_task_status_sync(
            task_id,
            state=TASK_STATE_COMPLETED,
            progress=100,
            message=f"Model retrained: {version_tag} (accuracy: {metrics['accuracy']:.1%})",
            result=result,
            org_id=org_id,
            user_id=user_id,
        )

        logger.info(
            "[org:%s] Model retrained: %s accuracy=%.2f%%",
            org_id,
            version_tag,
            metrics["accuracy"] * 100,
        )

        # Phase 4C: Auto-trigger anomaly scan after successful retrain
        try:
            from app.tasks.anomaly_tasks import run_anomaly_scan
            run_anomaly_scan.apply_async(
                kwargs={
                    "org_id": org_id,
                    "user_id": user_id,
                    "trigger": "retrain",
                    "lookback_weeks": 12,
                },
                countdown=5,  # 5s delay to let DB writes settle
            )
            logger.info("[org:%s] Anomaly scan queued after retrain", org_id)
        except Exception:
            logger.warning("[org:%s] Could not queue post-retrain anomaly scan", org_id, exc_info=True)

        return result

    except Exception as exc:
        logger.exception("[org:%s] Model retraining failed", org_id)
        set_task_status_sync(
            task_id,
            state=TASK_STATE_FAILED,
            progress=0,
            message="Model retraining failed",
            error=str(exc),
            org_id=org_id,
            user_id=user_id,
        )
        # Don't retry on data errors
        if "Column detection" in str(exc) or "Insufficient" in str(exc):
            return {"error": str(exc)}
        raise self.retry(exc=exc)
