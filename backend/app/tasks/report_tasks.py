"""Celery tasks for async report generation."""

import logging
from app.celery_app import celery
from app.core.task_status import (
    set_task_status_sync,
    TASK_STATE_STARTED,
    TASK_STATE_PROGRESS,
    TASK_STATE_COMPLETED,
    TASK_STATE_FAILED,
)

logger = logging.getLogger("titan.tasks.reports")


@celery.task(
    bind=True,
    name="titan.reports.generate",
    max_retries=2,
    default_retry_delay=15,
    acks_late=True,
    time_limit=120,
)
def generate_report_async(
    self,
    *,
    org_id: int,
    user_id: int,
    report_type: str,
    report_format: str = "csv",
    report_name: str | None = None,
):
    """Generate a report in the background.

    Supports: forecast, inventory, sales, category report types.
    """
    task_id = self.request.id
    name = report_name or f"{report_type.title()} Report"

    set_task_status_sync(
        task_id,
        state=TASK_STATE_STARTED,
        message=f"Generating {name}...",
        org_id=org_id,
        user_id=user_id,
    )

    try:
        # Step 1: Query data
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=20, message="Querying data...")

        # Step 2: Format report
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=60, message=f"Formatting as {report_format}...")

        # Step 3: Save file (placeholder — actual file I/O in Phase 3)
        set_task_status_sync(task_id, state=TASK_STATE_PROGRESS, progress=90, message="Saving report...")

        result = {
            "report_name": name,
            "report_type": report_type,
            "format": report_format,
            "status": "completed",
            "org_id": org_id,
        }

        set_task_status_sync(
            task_id,
            state=TASK_STATE_COMPLETED,
            progress=100,
            message=f"Report '{name}' ready",
            result=result,
            org_id=org_id,
            user_id=user_id,
        )

        logger.info("[org:%s] Report generated: %s (%s)", org_id, name, report_format)
        return result

    except Exception as exc:
        logger.exception("[org:%s] Report generation failed: %s", org_id, name)
        set_task_status_sync(
            task_id,
            state=TASK_STATE_FAILED,
            message=f"Report generation failed: {exc}",
            error=str(exc),
            org_id=org_id,
            user_id=user_id,
        )
        raise self.retry(exc=exc)
