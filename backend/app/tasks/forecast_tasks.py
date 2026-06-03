"""Celery tasks for demand forecasting.

Runs forecast prediction pipelines asynchronously with progress tracking.
"""

import logging
from app.celery_app import celery
from app.core.task_status import set_task_status_sync, TASK_STATE_STARTED, TASK_STATE_PROGRESS, TASK_STATE_COMPLETED, TASK_STATE_FAILED

logger = logging.getLogger("titan.tasks.forecast")


@celery.task(
    bind=True,
    name="titan.forecast.run_pipeline",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
)
def run_forecast_pipeline(self, *, org_id: int, user_id: int, weeks: int = 12, product_ids: list[int] | None = None):
    """Run the forecast pipeline for an organization.

    Generates demand predictions and stores them in the database.
    Publishes FORECAST_GENERATED event on completion.
    """
    task_id = self.request.id
    set_task_status_sync(task_id, state=TASK_STATE_STARTED, message="Initializing forecast pipeline...", org_id=org_id, user_id=user_id)

    try:
        # Step 1: Load model
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=10, message="Loading trained model...")

        from app.services.ml_service import forecast_model
        if not forecast_model.is_trained:
            forecast_model.train()

        # Step 2: Generate predictions
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=40, message=f"Generating {weeks}-week forecasts...")

        forecasts = forecast_model.predict(weeks_ahead=weeks)

        # Step 3: Prepare result
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=80, message="Preparing results...")

        result = {
            "forecasts": forecasts,
            "model_version": f"v{forecast_model.training_id}.0",
            "accuracy": forecast_model.metrics["accuracy"],
            "rmse": forecast_model.metrics["rmse"],
            "weeks": weeks,
        }

        # Step 4: Complete
        set_task_status_sync(
            task_id,
            state=TASK_STATE_COMPLETED,
            progress=100,
            message="Forecast pipeline completed",
            result=result,
            org_id=org_id,
            user_id=user_id,
        )

        logger.info("[org:%s] Forecast pipeline completed — %d weeks predicted", org_id, weeks)
        return result

    except Exception as exc:
        logger.exception("[org:%s] Forecast pipeline failed", org_id)
        set_task_status_sync(
            task_id,
            state=TASK_STATE_FAILED,
            progress=0,
            message="Forecast pipeline failed",
            error=str(exc),
            org_id=org_id,
            user_id=user_id,
        )
        raise self.retry(exc=exc)
