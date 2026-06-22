"""SQLAlchemy Models for the Titan Supply Chain AI platform.

Enterprise-grade models with multi-tenant isolation (organization_id on every table),
audit logging, ML model versioning, and persistent inventory tracking.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey,
    Text, Boolean, Enum as SQLEnum, Index, JSON, BigInteger,
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum

# Scenario models imported so init_db() creates their tables
from app.models.scenario import Scenario, ScenarioResult, ScenarioStatus, ScenarioType  # noqa: F401

# Anomaly model imported so init_db() creates its table
from app.models.anomaly import Anomaly, AnomalyType, AnomalySeverity  # noqa: F401


def utcnow():
    return datetime.now(timezone.utc)


# ── Enums ────────────────────────────────────────────────────────────


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    ANALYST = "analyst"
    VIEWER = "viewer"


class AlertSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertType(str, enum.Enum):
    # Original alert types (uppercase in DB)
    LOW_STOCK = "LOW_STOCK"
    REORDER = "REORDER"
    OVERSTOCK = "OVERSTOCK"
    STOCKOUT = "STOCKOUT"
    # Rule-engine generated types (Phase 5E-C — lowercase in DB)
    ANOMALY_DETECTED = "anomaly_detected"
    MODEL_ACCURACY_DEGRADED = "model_accuracy_degraded"
    FORECAST_MISS = "forecast_miss"


class InventoryStatus(str, enum.Enum):
    HEALTHY = "healthy"
    LOW = "low"
    CRITICAL = "critical"
    OVERSTOCK = "overstock"


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


# ── Organization & Workspace (Multi-Tenancy) ────────────────────────


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    logo_url = Column(String(500), nullable=True)
    subscription_tier = Column(
        SQLEnum(SubscriptionTier), default=SubscriptionTier.FREE, nullable=False
    )
    settings = Column(JSON, default=dict, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="organization", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="organization", cascade="all, delete-orphan")
    warehouses = relationship("Warehouse", back_populates="organization", cascade="all, delete-orphan")
    model_versions = relationship("ModelVersion", back_populates="organization", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)
    settings = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    organization = relationship("Organization", back_populates="workspaces")


# ── User ─────────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    organization = relationship("Organization", back_populates="users")
    uploaded_files = relationship("UploadedFile", back_populates="user")
    reports = relationship("Report", back_populates="user")


# ── Product ──────────────────────────────────────────────────────────


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    sku = Column(String(50), nullable=False)
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    organization = relationship("Organization", back_populates="products")
    sales = relationship("Sale", back_populates="product")
    forecasts = relationship("Forecast", back_populates="product")
    inventory_alerts = relationship("InventoryAlert", back_populates="product")
    inventory_records = relationship("Inventory", back_populates="product")

    __table_args__ = (
        Index("ix_products_org_category", "organization_id", "category"),
        Index("ix_products_org_sku", "organization_id", "sku", unique=True),
    )


# ── Sale ─────────────────────────────────────────────────────────────


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    product = relationship("Product", back_populates="sales")
    warehouse = relationship("Warehouse", back_populates="sales")

    __table_args__ = (
        Index("ix_sales_org_product_date", "organization_id", "product_id", "date"),
    )


# ── Warehouse ────────────────────────────────────────────────────────


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    capacity = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    organization = relationship("Organization", back_populates="warehouses")
    sales = relationship("Sale", back_populates="warehouse")
    inventory_alerts = relationship("InventoryAlert", back_populates="warehouse")
    inventory_records = relationship("Inventory", back_populates="warehouse")


# ── Inventory (Persistent Stock Levels) ──────────────────────────────


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    current_stock = Column(Integer, nullable=False, default=0)
    safety_stock = Column(Integer, nullable=False, default=0)
    reorder_point = Column(Integer, nullable=False, default=0)
    max_capacity = Column(Integer, nullable=True)
    lead_time_days = Column(Integer, nullable=True, default=14)
    status = Column(SQLEnum(InventoryStatus), default=InventoryStatus.HEALTHY, nullable=False)
    health_score = Column(Integer, default=100)
    last_restocked_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    product = relationship("Product", back_populates="inventory_records")
    warehouse = relationship("Warehouse", back_populates="inventory_records")

    __table_args__ = (
        Index("ix_inventory_org_product", "organization_id", "product_id"),
        Index("ix_inventory_org_status", "organization_id", "status"),
    )


# ── Forecast ─────────────────────────────────────────────────────────


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    forecast_date = Column(DateTime(timezone=True), nullable=False)
    predicted_demand = Column(Float, nullable=False)
    actual_demand = Column(Float, nullable=True)
    confidence_lower = Column(Float, nullable=True)
    confidence_upper = Column(Float, nullable=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True)
    model_version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    product = relationship("Product", back_populates="forecasts")
    model_ver = relationship("ModelVersion", back_populates="forecasts")

    __table_args__ = (
        Index("ix_forecasts_org_product_date", "organization_id", "product_id", "forecast_date"),
    )


# ── Inventory Alert ──────────────────────────────────────────────────


class InventoryAlert(Base):
    __tablename__ = "inventory_alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    alert_type = Column(SQLEnum(AlertType), nullable=False)
    severity = Column(SQLEnum(AlertSeverity), nullable=False)
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Phase 5E-C: Alert lifecycle & rule engine fields (all nullable — no migration)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rule_key = Column(String(192), nullable=True, index=True)   # dedup key
    source_event_id = Column(String(32), nullable=True)          # originating event_id
    extra_data = Column(JSON, nullable=True)                     # arbitrary context

    product = relationship("Product", back_populates="inventory_alerts")
    warehouse = relationship("Warehouse", back_populates="inventory_alerts")


# ── ML Model Versioning ─────────────────────────────────────────────


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    version_tag = Column(String(50), nullable=False)
    model_type = Column(String(50), nullable=False, default="xgboost")
    accuracy = Column(Float, nullable=True)
    mae = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    training_samples = Column(Integer, nullable=True)
    feature_importance = Column(JSON, nullable=True)
    convergence = Column(JSON, nullable=True)
    hyperparameters = Column(JSON, nullable=True)
    feature_schema = Column(JSON, nullable=True)
    dataset_hash = Column(String(64), nullable=True)
    model_path = Column(String(500), nullable=True)
    artifact_size_bytes = Column(BigInteger, nullable=True)
    training_duration_seconds = Column(Float, nullable=True)
    data_source = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    organization = relationship("Organization", back_populates="model_versions")
    forecasts = relationship("Forecast", back_populates="model_ver")

    __table_args__ = (
        Index("ix_model_versions_org_active", "organization_id", "is_active"),
    )


# ── Uploaded File ────────────────────────────────────────────────────


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=True)
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    rows_processed = Column(Integer, default=0)
    columns_detected = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="uploaded_files")


# ── Report ───────────────────────────────────────────────────────────


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)  # forecast, inventory, sales, category
    format = Column(String(20), nullable=False)  # csv, excel, pdf
    file_path = Column(String(500), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    status = Column(String(50), default="generating")  # generating, completed, failed
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="reports")


# ── Audit Log ────────────────────────────────────────────────────────


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g. "user.login", "product.create", "model.retrain"
    resource_type = Column(String(50), nullable=True)  # e.g. "product", "forecast"
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_audit_logs_org_action", "organization_id", "action"),
        Index("ix_audit_logs_org_created", "organization_id", "created_at"),
    )
