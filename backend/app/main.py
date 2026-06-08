"""
Titan Supply Chain AI — Enterprise Platform
Main FastAPI Application Entry Point

Phase 2.5: Event bus, structured logging, Sentry, middleware, Celery task status.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import init_db
from app.core.exceptions import TitanError

# ── Structured Logging Setup (before anything else) ─────────────────

from app.core.logging import setup_logging

setup_logging(debug=settings.APP_DEBUG, json_output=settings.LOG_JSON)
logger = logging.getLogger("titan.app")

# ── Sentry Integration ──────────────────────────────────────────────

if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
            environment=settings.APP_ENV,
            release=f"titan@2.5.0",
            send_default_pii=False,
        )
        logger.info("✅ Sentry initialized (env=%s)", settings.APP_ENV)
    except Exception as e:
        logger.warning("⚠️ Sentry init failed: %s", e)


# ── Lifespan ────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown events."""
    logger.info("🚀 Starting %s...", settings.APP_NAME)

    # 1. Initialize database tables
    try:
        await init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.warning("⚠️ Database initialization skipped: %s", str(e))

    # 2. Initialize Redis connection (non-blocking)
    try:
        from app.core.cache import get_redis
        await get_redis()
    except Exception as e:
        logger.warning("⚠️ Redis connection skipped: %s", str(e))

    # 3. Register event handlers
    from app.core.event_handlers import register_event_handlers, set_ws_manager
    from app.websocket.manager import ws_manager
    register_event_handlers()
    set_ws_manager(ws_manager)

    # 4. Model integrity check — verify active ModelVersion artifact exists on disk
    try:
        from app.database import async_session
        from app.models import ModelVersion
        from sqlalchemy import select
        import os

        async with async_session() as _db:
            result = await _db.execute(
                select(ModelVersion)
                .where(ModelVersion.is_active == True)
                .order_by(ModelVersion.created_at.desc())
                .limit(1)
            )
            active_mv = result.scalar_one_or_none()

        if active_mv is None:
            logger.warning(
                "⚠️ No active ModelVersion found in DB. "
                "First forecast request will train on synthetic data."
            )
        elif not active_mv.model_path:
            logger.warning(
                "⚠️ Active ModelVersion (id=%d, tag=%s) has no model_path set.",
                active_mv.id, active_mv.version_tag,
            )
        elif not os.path.exists(active_mv.model_path):
            logger.warning(
                "⚠️ Active ModelVersion (id=%d, tag=%s) artifact NOT FOUND on disk: %s. "
                "Forecast requests will fall back to in-memory model.",
                active_mv.id, active_mv.version_tag, active_mv.model_path,
            )
        else:
            logger.info(
                "✅ Active model: id=%d  tag=%s  type=%s  source=%s  artifact=%s",
                active_mv.id,
                active_mv.version_tag,
                active_mv.model_type,
                active_mv.data_source,
                active_mv.model_path,
            )
            # Warn if feature metadata is missing (pre-5A artifact)
            if not active_mv.feature_schema:
                logger.warning(
                    "⚠️ Active model has no feature_schema (pre-Phase 5A artifact). "
                    "Retrain or reset to populate metadata."
                )
    except Exception as _e:
        logger.warning("⚠️ Model integrity check skipped: %s", str(_e))

    yield
    logger.info("🛑 Shutting down %s...", settings.APP_NAME)



# ── App ─────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description="Titan Supply Chain AI — Enterprise-Grade Demand Forecasting & Inventory Optimization Platform",
    version="2.5.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── Exception Handlers ──────────────────────────────────────────────


@app.exception_handler(TitanError)
async def titan_error_handler(request: Request, exc: TitanError):
    """Handle all TitanError subclasses with structured JSON responses."""
    return JSONResponse(
        status_code=getattr(exc, "status_code", 500),
        content={"detail": {"message": exc.message, "code": exc.code}},
    )


# ── Middleware Stack (order matters: first added = outermost) ───────

from app.core.middleware import RequestContextMiddleware, LatencyMiddleware

# Latency tracking (outermost — measures full request time)
app.add_middleware(LatencyMiddleware)

# Request context (injects request_id, correlation_id)
app.add_middleware(RequestContextMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Correlation-ID", "X-Response-Time"],
)

# ── Routers ─────────────────────────────────────────────────────────

from app.routers import auth, dashboard, forecast, inventory, products, reports, upload, users, alerts
from app.routers.scenarios import router as scenarios_router
from app.routers.anomalies import router as anomalies_router
from app.websocket.routes import router as ws_router

app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(forecast.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")  # Alerts — secured under /api/v1
app.include_router(scenarios_router, prefix="/api/v1")  # Scenario Engine
app.include_router(anomalies_router, prefix="/api/v1")  # Anomaly Detection
app.include_router(ws_router)  # WebSocket at /ws


# ── Health & Root Endpoints ─────────────────────────────────────────


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "2.5.0",
        "environment": settings.APP_ENV,
    }


@app.get("/api/v1")
async def api_root():
    """API root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": "2.5.0",
        "docs": "/api/docs",
    }


# ── Task Status Endpoint ───────────────────────────────────────────


@app.get("/api/v1/tasks/{task_id}")
async def get_task_status_endpoint(task_id: str):
    """Get the status of an async background task."""
    from app.core.task_status import get_task_status

    status = await get_task_status(task_id)
    if status is None:
        return JSONResponse(
            status_code=404,
            content={"detail": {"message": f"Task {task_id} not found", "code": "NOT_FOUND"}},
        )
    return status
