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


# ── Anomaly SHAP Explain Schemas (Phase 5D) ──────────────────────────


class AnomalyDriverItem(BaseModel):
    """A single SHAP feature contribution for an anomaly explanation."""

    feature: str                   # e.g. "lag_1"
    label: str                     # e.g. "Last-week demand"
    shap_value: float              # raw SHAP contribution (positive or negative)
    feature_value: float           # actual feature value reconstructed at anomaly date
    direction: str                 # "positive" or "negative"
    abs_shap: float                # |shap_value| for sorting/bar width


class AnomalyExplainResponse(BaseModel):
    """SHAP-based root-cause explanation for a single anomaly.

    Computed on-demand from the active model + Forecast table feature
    reconstruction. Never persisted to the database.

    Fields
    ------
    explainer_ready          Whether SHAP succeeded (False = graceful failure).
    reason                   Human-readable failure reason when not ready.
    anomaly_id               ID of the explained anomaly.
    model_version_tag        Version tag of the model used for explanation.
    event_date               ISO date of the anomaly event.
    base_value               SHAP expected value (E[f(x)]).
    predicted_at_anomaly     Model raw prediction at the anomaly feature vector.
    feature_vector           Reconstructed feature dict at anomaly date.
    drivers                  Top positive SHAP contributions (sorted by abs desc).
    suppressors              Top negative SHAP contributions (sorted by abs desc).
    all_shap                 Full feature → SHAP value mapping.
    narrative_summary        Backend-generated plain-English explanation.
    confidence_shap          SHAP-enhanced detection confidence (0-100).
    confidence_source        "z_score" | "shap_enhanced".
    reconstruction_quality   "full" | "partial" | "minimal" — how many features
                             were reconstructed from real data vs fallback.
    used_fallbacks           List of feature names that fell back to expected_value.
    anomaly_type_note        Optional caveat (e.g. for INVENTORY_SHOCK).
    cached                   True if response came from the in-process cache.
    """

    explainer_ready: bool
    reason: Optional[str] = None
    anomaly_id: int
    model_version_tag: Optional[str] = None
    event_date: Optional[str] = None
    base_value: Optional[float] = None
    predicted_at_anomaly: Optional[float] = None
    feature_vector: Optional[dict] = None
    drivers: List[AnomalyDriverItem] = []
    suppressors: List[AnomalyDriverItem] = []
    all_shap: Optional[dict] = None
    narrative_summary: Optional[str] = None
    confidence_shap: Optional[float] = None
    confidence_source: str = "z_score"
    reconstruction_quality: str = "unknown"   # "full" | "partial" | "minimal"
    used_fallbacks: List[str] = []
    anomaly_type_note: Optional[str] = None
    cached: bool = False

    model_config = {"protected_namespaces": ()}



