"""
AI-Powered E-commerce Demand Forecasting & Inventory Optimization Platform
Main FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import init_db
from app.routers import auth, dashboard, forecast, inventory, products, reports, upload, users

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.APP_DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown events."""
    logger.info("🚀 Starting %s...", settings.APP_NAME)
    # Initialize database tables
    try:
        await init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.warning("⚠️ Database initialization skipped: %s", str(e))
    yield
    logger.info("🛑 Shutting down %s...", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered E-commerce Demand Forecasting & Inventory Optimization Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(forecast.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.APP_ENV,
    }


@app.get("/api/v1")
async def api_root():
    """API root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": "1.0.0",
        "docs": "/api/docs",
    }
