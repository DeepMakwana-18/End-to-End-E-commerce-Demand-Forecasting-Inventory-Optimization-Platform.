"""Anomaly detection Pydantic schemas.

Used by the API layer to validate requests and serialize responses.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.anomaly import AnomalyType, AnomalySeverity


# ── Response Schemas ─────────────────────────────────────────────────


class AnomalyResponse(BaseModel):
    """Full anomaly record returned by the API."""

    id: int
    organization_id: int
    product_id: Optional[int] = None

    anomaly_type: AnomalyType
    severity: AnomalySeverity

    detected_at: datetime
    event_date: Optional[str] = None

    z_score: Optional[float] = None
    deviation_pct: Optional[float] = None
    expected_value: Optional[float] = None
    actual_value: Optional[float] = None

    explanation: Optional[str] = None

    is_resolved: bool
    resolved_at: Optional[datetime] = None

    created_at: datetime

    model_config = {"from_attributes": True}


class AnomalyListResponse(BaseModel):
    """Paginated list of anomalies."""

    anomalies: List[AnomalyResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ── Detection Request Schema ──────────────────────────────────────────


class AnomalyDetectRequest(BaseModel):
    """Trigger anomaly detection for this organisation.

    Parameters
    ----------
    lookback_weeks : int
        Number of historical weeks to use for rolling statistics (default 12).
    z_threshold_low : float
        Z-score to classify as LOW severity (default 2.0).
    z_threshold_medium : float
        Z-score to classify as MEDIUM severity (default 3.0).
    z_threshold_critical : float
        Z-score to classify as CRITICAL severity (default 4.0).
    types : list[AnomalyType] | None
        Only run selected detector types (default: all).
    """

    lookback_weeks: int = Field(default=12, ge=4, le=520)
    z_threshold_low: float = Field(default=2.0, ge=0.0, le=10.0)
    z_threshold_medium: float = Field(default=3.0, ge=0.0, le=10.0)
    z_threshold_critical: float = Field(default=4.0, ge=0.0, le=10.0)
    types: Optional[List[AnomalyType]] = None
    comprehensive_sweep: bool = Field(default=False)


class AnomalyDetectResponse(BaseModel):
    """Summary of a detection run."""

    detected: int
    demand_spikes: int
    demand_drops: int
    inventory_shocks: int
    forecast_misses: int
    critical: int
    medium: int
    low: int
    computation_seconds: float


# ── Resolve Request ───────────────────────────────────────────────────


class AnomalyResolveRequest(BaseModel):
    """Mark one or more anomalies as resolved."""

    anomaly_ids: List[int] = Field(..., min_length=1)


# ── Summary Schema ────────────────────────────────────────────────────


class AnomalySummary(BaseModel):
    """Compact stats for dashboard widgets."""

    total_active: int
    critical_count: int
    medium_count: int
    low_count: int
    demand_spikes: int
    demand_drops: int
    inventory_shocks: int
    forecast_misses: int
    latest_detected_at: Optional[datetime] = None


# ── Anomaly Context Schema ────────────────────────────────────────────


class AnomalyContextPoint(BaseModel):
    """A single data point in the anomaly context series."""

    date: str                          # ISO date string
    actual: Optional[float] = None    # Real observed demand / inventory value
    baseline: Optional[float] = None  # Rolling mean at this point (expected)
    confidence_lower: Optional[float] = None   # Lower confidence band
    confidence_upper: Optional[float] = None   # Upper confidence band
    is_anomaly: bool = False           # True only for the anomaly event point


class AnomalyContextResponse(BaseModel):
    """Historical context for a single anomaly — used by Investigation Drawer."""

    anomaly_id: int
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    product_price: Optional[float] = None

    # The raw anomaly numbers
    actual_value: Optional[float] = None
    expected_value: Optional[float] = None
    z_score: Optional[float] = None
    deviation_pct: Optional[float] = None

    # Detection confidence derived from z-score (0-100)
    confidence: Optional[float] = None

    # Time series: 12 weeks before + anomaly week + 4 weeks after
    series: List[AnomalyContextPoint] = []

    # Real business impact from product price + deviation
    revenue_impact: Optional[float] = None
    inventory_impact: Optional[float] = None
    stockout_risk_pct: Optional[float] = None
    forecast_confidence_impact: Optional[float] = None
    # True when revenue_impact was derived from org-wide weighted avg price (no product)
    revenue_impact_is_estimated: bool = False
    # The unit price used for the impact calculation (exact product price or org weighted avg)
    unit_price_used: Optional[float] = None

