"""Celery application factory.

Configures Celery with Redis as broker and result backend.
Auto-discovers task modules under app.tasks.
"""

from celery import Celery

from app.config import settings


celery = Celery("titan")

celery.config_from_object(
    {
        # Broker (Redis)
        "broker_url": settings.REDIS_URL,
        "result_backend": settings.REDIS_URL,
        # Serialization
        "task_serializer": "json",
        "result_serializer": "json",
        "accept_content": ["json"],
        # Reliability
        "task_acks_late": True,
        "task_reject_on_worker_lost": True,
        "worker_prefetch_multiplier": 1,
        # Tracking
        "task_track_started": True,
        "result_expires": 3600,  # 1 hour
        # Timezone
        "timezone": "UTC",
        "enable_utc": True,
        # Retry defaults
        "task_default_retry_delay": 30,
        "task_max_retries": 3,
        # Connection
        "broker_connection_retry_on_startup": True,
    }
)

# Explicit task module registration
# (autodiscover_tasks only finds files named "tasks.py" by default)
celery.conf.update(
    include=[
        "app.tasks.forecast_tasks",
        "app.tasks.retraining_tasks",
        "app.tasks.report_tasks",
        "app.tasks.notification_tasks",
    ]
)
