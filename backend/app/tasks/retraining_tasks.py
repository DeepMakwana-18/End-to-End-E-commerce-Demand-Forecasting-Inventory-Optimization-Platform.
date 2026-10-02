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
    upload_record_id: int | None = None,
    date_column: str | None = None,
    demand_column: str | None = None,
    mappings: str | None = None,
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
        from app.services.schema_mapper import detect_columns

        # Step 1: Parse CSV
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=10, message="Parsing CSV data...")

        df = pd.read_csv(io.StringIO(csv_text))

        # ── Column resolution ───────────────────────────────────────────────
        # If the upload router already identified columns (user confirmed or
        # auto-detected with high confidence), use those directly.
        # Otherwise delegate to schema_mapper.detect_columns().
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=15, message="Detecting schema / mapping columns...")

        date_col: str | None = date_column
        demand_col: str | None = demand_column
        
        # Always run detection to get full mapping for catalog_service (SKU, Category, Revenue)
        detection = detect_columns(list(df.columns))
        
        if not date_col:
            date_col = detection.get("date_column")
        if not demand_col:
            demand_col = detection.get("demand_column")

        if not date_col:
            set_task_status_sync(
                task_id,
                state=TASK_STATE_FAILED,
                error=(
                    f"Missing required field: Date. "
                    f"Could not find a date/timestamp column in: {list(df.columns)}. "
                    f"Please map it manually before uploading."
                ),
                org_id=org_id,
                user_id=user_id,
            )
            return {"error": "Missing required field: Date"}

        if not demand_col:
            set_task_status_sync(
                task_id,
                state=TASK_STATE_FAILED,
                error=(
                    f"No quantity/demand column detected. "
                    f"Could not find a sales quantity column in: {list(df.columns)}. "
                    f"Please map it manually before uploading."
                ),
                org_id=org_id,
                user_id=user_id,
            )
            return {"error": "No revenue column detected"}

        logger.info(
            "[org:%s] Schema mapping: date=%r  demand=%r  (from %d columns)",
            org_id, date_col, demand_col, len(df.columns),
        )

        # ── Backlog Item 1: Auto-populate catalog from raw df ───────────────
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=20, message="Syncing product catalog and inventory...")
        try:
            from app.database import async_session
            from app.services.catalog_service import sync_catalog_from_upload
            import asyncio

            async def _do_sync():
                async with async_session() as db:
                    await sync_catalog_from_upload(db, org_id, df, mappings, detection)
                    await db.commit()
            
            asyncio.run(_do_sync())
        except Exception as sync_exc:
            logger.warning("[org:%s] Catalog sync failed: %s", org_id, sync_exc, exc_info=True)

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

        # Persist the raw CSV alongside the pkl so future Retrain calls can
        # reload from disk without the browser needing to re-send the file.
        csv_disk_path = None
        try:
            csv_filename = f"model_org_{org_id}_{version_tag}_dataset.csv".replace(" ", "_")
            csv_disk_path = os.path.join(settings.ML_MODEL_PATH, csv_filename)
            os.makedirs(os.path.dirname(os.path.abspath(csv_disk_path)), exist_ok=True)
            with open(csv_disk_path, "w", encoding="utf-8") as _csv_f:
                _csv_f.write(csv_text)
            logger.info("[org:%s] CSV persisted to %s", org_id, csv_disk_path)
        except Exception as _csv_exc:
            logger.warning("[org:%s] Could not persist CSV to disk: %s", org_id, _csv_exc)
            csv_disk_path = None

        from app.database import async_session
        from app.repositories.forecast_repo import ModelVersionRepository
        from app.models import ModelVersion
        import asyncio

        async def _save_model_version():
            async with async_session() as db:
                repo = ModelVersionRepository(db, org_id)
                await repo.deactivate_all()

                # Pull feature metadata populated by train()
                from app.services.ml_service import MODEL_TYPE
                import pandas as pd
                meta = forecast_model.metadata or {}
                hyper = dict(meta.get("hyperparameters") or {})
                # Store CSV path so POST /forecast/retrain can reload without browser resend
                hyper["csv_path"] = csv_disk_path
                hyper["csv_filename"] = filename

                mv = ModelVersion(
                    organization_id=org_id,
                    version_tag=version_tag,
                    model_type=MODEL_TYPE,                            # actual class name
                    accuracy=metrics["accuracy"],
                    mae=metrics["mae"],
                    rmse=metrics["rmse"],
                    training_samples=metrics["training_samples"],
                    data_source=f"uploaded:{filename}",
                    feature_importance=metrics.get("feature_importance", {}),
                    # FIX: persist convergence data so PipelinePage Training Convergence chart populates
                    convergence=metrics.get("convergence", []),
                    feature_schema=meta.get("feature_schema"),        # populated
                    hyperparameters=hyper,                            # includes csv_path
                    dataset_hash=meta.get("dataset_hash"),            # SHA-256
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

                # FIX: Compute in-sample predictions for historical rows so the
                # Actual vs Predicted chart has two populated data series.
                # Re-create features from historical data and run model.predict on them.
                hist_preds: dict[str, float] = {}
                try:
                    if forecast_model.historical_data:
                        _hdf = pd.DataFrame(forecast_model.historical_data)
                        _hdf["date"] = pd.to_datetime(_hdf["date"])
                        _hdf = _hdf.rename(columns={"demand": "demand"})
                        _hdf = _hdf.sort_values("date").reset_index(drop=True)
                        _feat_df = forecast_model._create_features(_hdf)
                        _X = _feat_df[["week", "month", "year", "lag_1", "lag_4"]]
                        _y_hat = forecast_model.model.predict(_X)
                        for _i, _row in _feat_df.iterrows():
                            _d = _row["date"] if hasattr(_row["date"], "strftime") else pd.Timestamp(_row["date"])
                            hist_preds[_d.strftime("%Y-%m-%d")] = round(float(max(0, _y_hat[_feat_df.index.get_loc(_i)])), 1)
                except Exception as _pred_err:
                    logger.warning("[org:%s] Could not generate historical predictions for AvP chart: %s", org_id, _pred_err)

                # Insert historical actuals (with in-sample predictions where available)
                hist_records = []
                for row in forecast_model.historical_data:
                    dt = parser.parse(row["date"])
                    in_sample_pred = hist_preds.get(dt.strftime("%Y-%m-%d"), 0.0)
                    hist_records.append(Forecast(
                        organization_id=org_id,
                        product_id=None,
                        forecast_date=dt,
                        predicted_demand=in_sample_pred,  # real prediction instead of placeholder 0
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

        # Update UploadedFile status to 'completed' if triggered via upload endpoint
        if upload_record_id is not None:
            try:
                async def _mark_upload_completed():
                    from app.database import async_session
                    from app.models import UploadedFile
                    async with async_session() as _db:
                        rec = await _db.get(UploadedFile, upload_record_id)
                        if rec and rec.organization_id == org_id:
                            rec.status = "completed"
                            rec.rows_processed = metrics.get("training_samples", 0)
                            await _db.commit()
                asyncio.run(_mark_upload_completed())
            except Exception:
                logger.warning("[org:%s] Could not update upload record %s", org_id, upload_record_id, exc_info=True)

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
            message=f"Model retrained: {version_tag} (accuracy: {metrics['accuracy']:.1f}%)",
            result=result,
            org_id=org_id,
            user_id=user_id,
        )

        logger.info(
            "[org:%s] Model retrained: %s accuracy=%.2f%%",
            org_id,
            version_tag,
            metrics["accuracy"],
        )


        # Phase 5E-D: Publish model.retrained via Redis so FastAPI WS bridge picks it up
        try:
            from app.core.redis_pubsub import publish_event
            from app.core.events import EventType
            publish_event(
                EventType.MODEL_RETRAINED,
                org_id=org_id,
                payload={
                    "version_tag": version_tag,
                    "accuracy": metrics["accuracy"],
                    "rmse": metrics["rmse"],
                    "data_source": f"uploaded:{filename}",
                    "task_id": task_id,
                },
            )
            publish_event(
                EventType.TASK_COMPLETED,
                org_id=org_id,
                payload={"task_id": task_id, "status": "completed", "message": f"Model retrained: {version_tag}"},
            )
        except Exception:
            logger.warning("[org:%s] Could not publish retrain events to Redis", org_id, exc_info=True)

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
        # Update UploadedFile status to 'failed'
        if upload_record_id is not None:
            try:
                import asyncio as _asyncio
                async def _mark_upload_failed():
                    from app.database import async_session
                    from app.models import UploadedFile
                    async with async_session() as _db:
                        rec = await _db.get(UploadedFile, upload_record_id)
                        if rec and rec.organization_id == org_id:
                            rec.status = "failed"
                            rec.error_message = str(exc)
                            await _db.commit()
                _asyncio.run(_mark_upload_failed())
            except Exception:
                logger.warning("[org:%s] Could not update upload record %s to failed", org_id, upload_record_id, exc_info=True)
        # Don't retry on data errors
        if "Column detection" in str(exc) or "Insufficient" in str(exc):
            return {"error": str(exc)}
        raise self.retry(exc=exc)


# ── Model Reset Task ───────────────────────────────────────────────────


@celery.task(
    bind=True,
    name="titan.ml.reset_model",
    max_retries=1,
    default_retry_delay=30,
    acks_late=True,
    time_limit=120,   # 2 min hard limit
    soft_time_limit=90,
)
def reset_model_async(
    self,
    *,
    org_id: int,
    user_id: int,
):
    """Reset the ML model to synthetic baseline data (async via Celery).

    Steps:
      1. Train model on synthetic data
      2. Save model artifact to disk
      3. Persist new ModelVersion to DB (deactivating old ones)
      4. Write historical + forecast Forecast rows
      5. Auto-trigger anomaly scan
    """
    task_id = self.request.id
    set_task_status_sync(
        task_id,
        state=TASK_STATE_STARTED,
        message="Resetting model to synthetic baseline...",
        org_id=org_id,
        user_id=user_id,
    )

    try:
        from app.services.ml_service import forecast_model, MODEL_TYPE

        # Step 1: Train on synthetic data
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=20, message="Training synthetic model...")

        forecast_model.train(source_name="synthetic")
        forecasts = forecast_model.predict(weeks_ahead=12)
        metrics = forecast_model.metrics

        # Step 2: Save model artifact
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=60, message="Persisting model to disk...")

        version_tag = f"v{forecast_model.training_id}.0"

        from app.config import settings
        import os
        import asyncio
        model_filename = f"model_org_{org_id}_{version_tag}_synthetic.pkl".replace(" ", "_")
        model_path = os.path.join(settings.ML_MODEL_PATH, model_filename)
        forecast_model.save(model_path)

        # Step 3: Persist ModelVersion and Forecast rows to DB
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=80, message="Persisting model version to DB...")

        from app.database import async_session
        from app.repositories.forecast_repo import ModelVersionRepository
        from app.models import ModelVersion
        import pandas as pd

        async def _save_reset_version():
            async with async_session() as db:
                repo = ModelVersionRepository(db, org_id)
                await repo.deactivate_all()

                meta = forecast_model.metadata or {}
                mv = ModelVersion(
                    organization_id=org_id,
                    version_tag=version_tag,
                    model_type=MODEL_TYPE,
                    accuracy=metrics["accuracy"],
                    mae=metrics["mae"],
                    rmse=metrics["rmse"],
                    training_samples=metrics["training_samples"],
                    data_source="synthetic",
                    feature_importance=metrics.get("feature_importance", {}),
                    # FIX: persist convergence for Training Convergence chart
                    convergence=metrics.get("convergence", []),
                    feature_schema=meta.get("feature_schema"),
                    hyperparameters=meta.get("hyperparameters"),
                    dataset_hash=meta.get("dataset_hash"),
                    is_active=True,
                    model_path=model_path,
                )
                db.add(mv)
                await db.flush()

                # Clear old org-level forecasts (product_id=None rows only)
                from sqlalchemy import delete
                from app.models import Forecast
                from dateutil import parser
                await db.execute(
                    delete(Forecast).where(
                        Forecast.organization_id == org_id,
                        Forecast.product_id == None,  # noqa: E711
                    )
                )

                # FIX: Compute in-sample predictions for historical rows (reset path)
                reset_hist_preds: dict[str, float] = {}
                try:
                    if forecast_model.historical_data:
                        _hdf2 = pd.DataFrame(forecast_model.historical_data)
                        _hdf2["date"] = pd.to_datetime(_hdf2["date"])
                        _hdf2 = _hdf2.sort_values("date").reset_index(drop=True)
                        _feat_df2 = forecast_model._create_features(_hdf2)
                        _X2 = _feat_df2[["week", "month", "year", "lag_1", "lag_4"]]
                        _y_hat2 = forecast_model.model.predict(_X2)
                        for _i2, _row2 in _feat_df2.iterrows():
                            _d2 = _row2["date"] if hasattr(_row2["date"], "strftime") else pd.Timestamp(_row2["date"])
                            reset_hist_preds[_d2.strftime("%Y-%m-%d")] = round(float(max(0, _y_hat2[_feat_df2.index.get_loc(_i2)])), 1)
                except Exception as _pred_err2:
                    logger.warning("[org:%s] Could not generate historical predictions for AvP chart (reset): %s", org_id, _pred_err2)

                # Insert historical actuals
                records = []
                for row in forecast_model.historical_data:
                    dt = parser.parse(row["date"])
                    in_sample_pred2 = reset_hist_preds.get(dt.strftime("%Y-%m-%d"), 0.0)
                    records.append(Forecast(
                        organization_id=org_id,
                        product_id=None,
                        forecast_date=dt,
                        predicted_demand=in_sample_pred2,  # real in-sample prediction
                        actual_demand=float(row["demand"]),
                        model_version_id=mv.id,
                        model_version=version_tag,
                    ))

                # Insert future predictions
                for row in forecasts:
                    dt = parser.parse(row["date"])
                    records.append(Forecast(
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

                if records:
                    db.add_all(records)

                await db.commit()

        try:
            asyncio.run(_save_reset_version())
        except Exception as db_exc:
            logger.error("[org:%s] Failed to save reset model version to DB: %s", org_id, db_exc)

        result = {
            "status": "reset",
            "version_tag": version_tag,
            "accuracy": metrics["accuracy"],
            "mae": metrics["mae"],
            "rmse": metrics["rmse"],
            "training_samples": metrics["training_samples"],
            "data_source": "synthetic",
            "org_id": org_id,
        }

        set_task_status_sync(
            task_id,
            state=TASK_STATE_COMPLETED,
            progress=100,
            message=f"Model reset to synthetic baseline: {version_tag} (accuracy: {metrics['accuracy']:.1f}%)",
            result=result,
            org_id=org_id,
            user_id=user_id,
        )

        logger.info(
            "[org:%s] Model reset complete: %s accuracy=%.2f%%",
            org_id,
            version_tag,
            metrics["accuracy"],
        )

        # Phase 5E-D: Publish model.retrained via Redis for WS clients
        try:
            from app.core.redis_pubsub import publish_event
            from app.core.events import EventType
            publish_event(
                EventType.MODEL_RETRAINED,
                org_id=org_id,
                payload={
                    "version_tag": version_tag,
                    "accuracy": metrics["accuracy"],
                    "rmse": metrics["rmse"],
                    "data_source": "synthetic",
                    "task_id": task_id,
                },
            )
            publish_event(
                EventType.TASK_COMPLETED,
                org_id=org_id,
                payload={"task_id": task_id, "status": "completed", "message": f"Model reset: {version_tag}"},
            )
        except Exception:
            logger.warning("[org:%s] Could not publish reset events to Redis", org_id, exc_info=True)

        # Auto-trigger anomaly scan after reset
        try:
            from app.tasks.anomaly_tasks import run_anomaly_scan
            run_anomaly_scan.apply_async(
                kwargs={
                    "org_id": org_id,
                    "user_id": user_id,
                    "trigger": "reset",
                    "lookback_weeks": 12,
                },
                countdown=5,
            )
            logger.info("[org:%s] Anomaly scan queued after model reset", org_id)
        except Exception:
            logger.warning("[org:%s] Could not queue post-reset anomaly scan", org_id, exc_info=True)

        return result

    except Exception as exc:
        logger.exception("[org:%s] Model reset failed", org_id)
        set_task_status_sync(
            task_id,
            state=TASK_STATE_FAILED,
            progress=0,
            message="Model reset failed",
            error=str(exc),
            org_id=org_id,
            user_id=user_id,
        )
        raise self.retry(exc=exc)
