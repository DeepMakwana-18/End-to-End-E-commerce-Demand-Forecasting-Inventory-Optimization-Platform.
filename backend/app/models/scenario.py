"""Scenario Engine SQLAlchemy models.

Two tables:
  - Scenario        — user-authored What-If parameter set
  - ScenarioResult  — computed result snapshot for a given Scenario version

Design principles:
  * Every row is scoped to organization_id (tenant isolation).
  * Scenarios are versioned: each edit increments version and keeps immutable history.
  * Results are keyed by (scenario_id, version) so old runs are preserved.
  * Simulation parameters are stored as JSON — flexible, schema-free.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Enum as SQLEnum,
    Float, ForeignKey, Index, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ── Enums ────────────────────────────────────────────────────────────


class ScenarioStatus(str, enum.Enum):
    DRAFT = "draft"          # Created but not yet run
    RUNNING = "running"      # Simulation in progress
    COMPLETED = "completed"  # Results available
    FAILED = "failed"        # Simulation errored
    ARCHIVED = "archived"    # Soft-deleted


class ScenarioType(str, enum.Enum):
    DEMAND_SHOCK = "demand_shock"          # Sudden demand spike/drop
    SUPPLY_DISRUPTION = "supply_disruption"  # Lead time or supply constraint change
    PRICE_CHANGE = "price_change"          # Price elasticity simulation
    SEASONAL_SHIFT = "seasonal_shift"      # Shift seasonality curve
    CUSTOM = "custom"                      # Free-form parameter set


# ── Scenario ─────────────────────────────────────────────────────────


class Scenario(Base):
    """A What-If simulation authored by a user.

    Parameters are stored in a JSON column so the engine can evolve
    the schema without DB migrations for each new scenario type.

    Versioning:
        When a scenario is edited, the version is incremented and
        the previous version's result is preserved in ScenarioResult.
    """

    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Identity
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    scenario_type = Column(SQLEnum(ScenarioType), nullable=False, default=ScenarioType.CUSTOM)
    status = Column(SQLEnum(ScenarioStatus), nullable=False, default=ScenarioStatus.DRAFT)

    # Versioning — incremented on every parameter change
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True)  # False = archived

    # Simulation scope — which products / date range
    product_ids = Column(JSON, nullable=True)   # list[int] | null means all products
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    horizon_weeks = Column(Integer, nullable=False, default=12)

    # What-If parameters (flexible JSON)
    # Example for DEMAND_SHOCK:
    #   {"demand_multiplier": 1.3, "affected_skus": ["SKU001"]}
    # Example for PRICE_CHANGE:
    #   {"price_delta_pct": -10, "elasticity": 0.8}
    parameters = Column(JSON, nullable=False, default=dict)

    # Celery task tracking
    task_id = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
    last_run_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    results = relationship(
        "ScenarioResult",
        back_populates="scenario",
        cascade="all, delete-orphan",
        order_by="ScenarioResult.version.desc()",
    )
    creator = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index("ix_scenarios_org_status", "organization_id", "status"),
        Index("ix_scenarios_org_type", "organization_id", "scenario_type"),
        Index("ix_scenarios_org_active", "organization_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Scenario id={self.id} name={self.name!r} v{self.version} status={self.status}>"


# ── ScenarioResult ───────────────────────────────────────────────────


class ScenarioResult(Base):
    """Computed result snapshot for one run of a Scenario.

    Keyed by (scenario_id, version) — each version of a scenario
    can produce exactly one result.  Old results are preserved when
    a scenario is re-parametrised and re-run.

    Summary metrics are stored as dedicated columns for fast filtering
    and dashboard queries.  Full detail (time series, product breakdown)
    lives in the JSON `detail` column.
    """

    __tablename__ = "scenario_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_id = Column(
        Integer,
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Which version of the scenario produced this result
    version = Column(Integer, nullable=False, default=1)

    # Summary metrics (denormalised for fast reads)
    baseline_demand = Column(Float, nullable=True)     # Total baseline 12-week demand
    simulated_demand = Column(Float, nullable=True)    # Total simulated 12-week demand
    demand_delta_pct = Column(Float, nullable=True)    # % change from baseline
    revenue_impact = Column(Float, nullable=True)      # Estimated revenue Δ
    inventory_impact = Column(Float, nullable=True)    # Estimated stock Δ (units)
    stockout_risk_pct = Column(Float, nullable=True)   # % products at stockout risk

    # Full computation detail
    # {
    #   "baseline": [{week, date, demand}, ...],
    #   "simulated": [{week, date, demand}, ...],
    #   "products": [{product_id, baseline_demand, simulated_demand, delta_pct}, ...],
    #   "recommendations": ["Increase safety stock for SKU001 by 15%", ...]
    # }
    detail = Column(JSON, nullable=True)

    # Error details (populated when status=failed)
    error = Column(Text, nullable=True)

    # Compute metadata
    computation_seconds = Column(Float, nullable=True)
    model_version_id = Column(
        Integer,
        ForeignKey("model_versions.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    scenario = relationship("Scenario", back_populates="results")

    __table_args__ = (
        Index("ix_scenario_results_scenario_version", "scenario_id", "version"),
        Index("ix_scenario_results_org", "organization_id"),
    )

    def __repr__(self) -> str:
        return f"<ScenarioResult id={self.id} scenario_id={self.scenario_id} v{self.version}>"
