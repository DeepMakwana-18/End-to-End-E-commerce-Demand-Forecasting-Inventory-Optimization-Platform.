"""Celery tasks for notifications (email, digest)."""

import logging
from app.celery_app import celery
from app.core.task_status import (
    set_task_status_sync,
    TASK_STATE_COMPLETED,
    TASK_STATE_FAILED,
)

logger = logging.getLogger("titan.tasks.notifications")


@celery.task(
    bind=True,
    name="titan.notifications.send_alert_email",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
    time_limit=30,
)
def send_alert_email(self, *, org_id: int, to_email: str, subject: str, body: str):
    """Send an alert notification email.

    Uses SMTP settings from app config.  Gracefully fails if SMTP
    is not configured (dev environment).
    """
    task_id = self.request.id

    try:
        from app.config import settings

        if not settings.SMTP_USER:
            logger.info("[org:%s] Email skipped (SMTP not configured): %s", org_id, subject)
            set_task_status_sync(
                task_id,
                state=TASK_STATE_COMPLETED,
                progress=100,
                message="Email skipped (SMTP not configured)",
                org_id=org_id,
            )
            return {"status": "skipped", "reason": "smtp_not_configured"}

        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_USER
        msg["To"] = to_email
        msg["Subject"] = f"[Titan] {subject}"
        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("[org:%s] Email sent to %s: %s", org_id, to_email, subject)
        set_task_status_sync(
            task_id,
            state=TASK_STATE_COMPLETED,
            progress=100,
            message=f"Email sent to {to_email}",
            org_id=org_id,
        )
        return {"status": "sent", "to": to_email}

    except Exception as exc:
        logger.exception("[org:%s] Email send failed: %s", org_id, subject)
        set_task_status_sync(
            task_id,
            state=TASK_STATE_FAILED,
            error=str(exc),
            org_id=org_id,
        )
        raise self.retry(exc=exc)


@celery.task(
    name="titan.notifications.send_daily_digest",
    max_retries=1,
)
def send_daily_digest(*, org_id: int):
    """Send a daily summary digest to org admins.

    Placeholder — full implementation in Phase 3 when alerting
    intelligence is built out.
    """
    logger.info("[org:%s] Daily digest task triggered (placeholder)", org_id)
    return {"status": "placeholder", "org_id": org_id}
