"""Anomaly Detection SQLAlchemy model.

Single table: `anomalies`

Design:
  * Fully tenant-scoped (organization_id on every row)
  * 4 anomaly types: demand_spike, demand_drop, inventory_shock, forecast_miss
  * 3 severities: low, medium, critical
  * Human-readable explanation column for UI
  * Indexes for common dashboard + API query patterns
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SQLEnum,
    Float, ForeignKey, Index, Integer, String, Text,
)

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ── Enums ────────────────────────────────────────────────────────────


class AnomalyType(str, enum.Enum):
    DEMAND_SPIKE = "demand_spike"          # Actual demand >> expected
    DEMAND_DROP = "demand_drop"            # Actual demand << expected
    INVENTORY_SHOCK = "inventory_shock"   # Inventory level deviated sharply
    FORECAST_MISS = "forecast_miss"       # Forecast vs actual MAPE exceeded threshold


class AnomalySeverity(str, enum.Enum):
    LOW = "low"           # 2–3 σ deviation
    MEDIUM = "medium"     # 3–4 σ deviation
    CRITICAL = "critical" # > 4 σ deviation


# ── Model ────────────────────────────────────────────────────────────


class Anomaly(Base):
    """A detected anomaly event for one organisation + product.

    Detection uses rolling z-score (rolling_mean + rolling_std).
    Each row represents one anomaly event at a point in time.

    Columns
    -------
    organization_id : int
        Tenant scope — mandatory on every row.
    product_id : int | None
        Optional: some anomaly types (e.g. FORECAST_MISS) may be org-wide.
    anomaly_type : AnomalyType
        Category of the anomaly.
    severity : AnomalySeverity
        Derived from the absolute z-score value.
    detected_at : datetime
        When the anomaly was detected (UTC).
    event_date : date string
        The business date the anomaly refers to (e.g. the week of the spike).
    z_score : float
        Number of standard deviations from rolling mean.
    deviation_pct : float
        % difference between actual and expected values.
    expected_value : float
        Rolling-mean baseline at time of detection.
    actual_value : float
        Observed value that triggered the anomaly.
    explanation : str
        Human-readable one-line explanation for the UI.
    is_resolved : bool
        Whether the anomaly has been acknowledged / resolved.
    resolved_at : datetime | None
        Timestamp of resolution.
    """

    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Tenant scope
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional product scope
    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Classification
    anomaly_type = Column(SQLEnum(AnomalyType), nullable=False, index=True)
    severity = Column(SQLEnum(AnomalySeverity), nullable=False, default=AnomalySeverity.LOW)

    # When detected and what business date it refers to
    detected_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    event_date = Column(String(20), nullable=True)  # ISO date string: "2024-03-15"

    # Detection statistics
    z_score = Column(Float, nullable=True)          # Raw z-score (signed)
    deviation_pct = Column(Float, nullable=True)    # % deviation from expected
    expected_value = Column(Float, nullable=True)   # Rolling mean at detection
    actual_value = Column(Float, nullable=True)     # Observed value

    # Human-readable explanation
    explanation = Column(Text, nullable=True)

    # Resolution tracking
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        Index("ix_anomalies_org_type", "organization_id", "anomaly_type"),
        Index("ix_anomalies_org_severity", "organization_id", "severity"),
        Index("ix_anomalies_org_detected", "organization_id", "detected_at"),
        Index("ix_anomalies_org_product", "organization_id", "product_id"),
        Index("ix_anomalies_org_resolved", "organization_id", "is_resolved"),
    )

    def __repr__(self) -> str:
        return (
            f"<Anomaly id={self.id} type={self.anomaly_type} "
            f"severity={self.severity} z={self.z_score:.2f}>"
        )
