"""Anomaly Detection API routes.

Endpoints:
  GET    /api/v1/anomalies           — list active anomalies (paginated, filtered)
  GET    /api/v1/anomalies/summary   — dashboard KPI summary
  GET    /api/v1/anomalies/{id}      — single anomaly detail
  POST   /api/v1/anomalies/detect    — trigger detection run
  POST   /api/v1/anomalies/resolve   — bulk resolve anomalies
"""

from __future__ import annotations

import logging
import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.models.anomaly import AnomalyType, AnomalySeverity
from app.schemas.anomaly import (
    AnomalyDetectRequest,
    AnomalyDetectResponse,
    AnomalyListResponse,
    AnomalyResponse,
    AnomalyResolveRequest,
    AnomalySummary,
    AnomalyContextResponse,
)
from app.services.anomaly_service import AnomalyService

logger = logging.getLogger("titan.routers.anomalies")

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection"])


def _service(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
) -> AnomalyService:
    return AnomalyService(db=db, org_id=tenant.org_id)


# ── List ─────────────────────────────────────────────────────────────


@router.get("", response_model=AnomalyListResponse, summary="List anomalies")
async def list_anomalies(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=1000),
    severity: Optional[AnomalySeverity] = Query(default=None),
    anomaly_type: Optional[AnomalyType] = Query(default=None),
    product_id: Optional[int] = Query(default=None),
    include_resolved: bool = Query(default=False),
    svc: AnomalyService = Depends(_service),
) -> AnomalyListResponse:
    """Return paginated, filtered list of anomalies for this organisation."""
    return await svc.list_anomalies(
        page=page,
        per_page=per_page,
        severity=severity,
        anomaly_type=anomaly_type,
        product_id=product_id,
        include_resolved=include_resolved,
    )


# ── Summary ───────────────────────────────────────────────────────────


@router.get("/summary", response_model=AnomalySummary, summary="Anomaly dashboard summary")
async def get_summary(
    svc: AnomalyService = Depends(_service),
) -> AnomalySummary:
    """Return aggregated anomaly counts for the dashboard widget."""
    return await svc.get_summary()


# ── Single Anomaly ────────────────────────────────────────────────────


@router.get("/{anomaly_id}", response_model=AnomalyResponse, summary="Get anomaly by ID")
async def get_anomaly(
    anomaly_id: int,
    svc: AnomalyService = Depends(_service),
) -> AnomalyResponse:
    """Get a single anomaly record. Returns 404 if not found or not in tenant scope."""
    result = await svc.get_by_id(anomaly_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly {anomaly_id} not found",
        )
    return result


# ── Detect ────────────────────────────────────────────────────────────


@router.post(
    "/detect",
    response_model=AnomalyDetectResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger anomaly detection",
)
async def detect_anomalies(
    req: AnomalyDetectRequest,
    svc: AnomalyService = Depends(_service),
) -> AnomalyDetectResponse:
    """Run the anomaly detection engine for this organisation.

    Uses rolling z-score on demand, inventory, and forecast data.
    All detected anomalies are persisted to the database.

    Returns a summary of what was found.
    """
    try:
        return await svc.detect(req)
    except Exception as exc:
        logger.exception("[org] Anomaly detection failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection failed: {exc}",
        )


# ── Resolve ───────────────────────────────────────────────────────────


@router.post(
    "/resolve",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Resolve anomalies",
)
async def resolve_anomalies(
    req: AnomalyResolveRequest,
    svc: AnomalyService = Depends(_service),
) -> dict:
    """Mark one or more anomalies as resolved.

    Returns the count of records actually updated.
    """
    updated = await svc.resolve(req)
    return {
        "resolved": updated,
        "message": f"{updated} anomaly record(s) marked as resolved",
    }


# ── Context ───────────────────────────────────────────────────────────


@router.get(
    "/{anomaly_id}/context",
    response_model=AnomalyContextResponse,
    summary="Get anomaly investigation context",
)
async def get_anomaly_context(
    anomaly_id: int,
    svc: AnomalyService = Depends(_service),
) -> AnomalyContextResponse:
    """Fetch real historical demand/inventory time-series context for one anomaly.

    Returns:
    - Historical Forecast series (12 weeks before + anomaly week + 4 weeks after)
    - Rolling baseline derived from actual demand history
    - Confidence bands from forecast model (confidence_lower / confidence_upper)
    - Anomaly point flagged in the series
    - Real revenue impact computed from product.price × unit deviation
    - Inventory & stockout risk impacts
    """
    ctx = await svc.get_context(anomaly_id)
    if ctx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly {anomaly_id} not found or not in tenant scope",
        )
    return ctx

