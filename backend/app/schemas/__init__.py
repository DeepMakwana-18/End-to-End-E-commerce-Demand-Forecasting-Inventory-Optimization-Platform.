"""Pydantic schemas for request/response validation.

Enterprise-grade schemas with organization context, pagination, and typed responses.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any, Generic, TypeVar
from datetime import datetime
from app.models import UserRole, AlertSeverity, AlertType, InventoryStatus, SubscriptionTier

T = TypeVar("T")


# ── Pagination ────────────────────────────────────────────────────────


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    total_pages: int


# ── Organization Schemas ──────────────────────────────────────────────


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9\-]+$")


class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None
    subscription_tier: SubscriptionTier
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    logo_url: Optional[str] = None
    settings: Optional[dict] = None


# ── Auth Schemas ──────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2, max_length=255)
    organization_name: str = Field(min_length=2, max_length=255)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"
    organization: "OrganizationResponse"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── User Schemas ──────────────────────────────────────────────────────


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    organization_id: int
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=255)
    role: UserRole = UserRole.VIEWER
    password: str = Field(default="changeme123!", min_length=6)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# ── Product Schemas ───────────────────────────────────────────────────


class ProductResponse(BaseModel):
    id: int
    name: str
    category: str
    sku: str
    price: float
    cost: Optional[float] = None
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=100)
    sku: str = Field(min_length=1, max_length=50)
    price: float = Field(gt=0)
    cost: Optional[float] = None
    description: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    cost: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductAnalytics(BaseModel):
    """Product with computed analytics from sales data."""
    id: int
    name: str
    category: str
    sku: str
    price: float
    total_sales: int = 0
    total_revenue: float = 0
    growth_pct: float = 0
    is_active: bool = True

    class Config:
        from_attributes = True


# ── Inventory Schemas ─────────────────────────────────────────────────


class InventoryResponse(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    product_sku: str = ""
    category: str = ""
    warehouse_id: Optional[int] = None
    current_stock: int
    safety_stock: int
    reorder_point: int
    max_capacity: Optional[int] = None
    lead_time_days: Optional[int] = None
    status: InventoryStatus
    health_score: int
    recommended_qty: int = 0

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    current_stock: Optional[int] = None
    safety_stock: Optional[int] = None
    reorder_point: Optional[int] = None
    max_capacity: Optional[int] = None
    lead_time_days: Optional[int] = None


# ── Forecast Schemas ──────────────────────────────────────────────────


class ForecastResponse(BaseModel):
    id: int
    product_id: int
    forecast_date: datetime
    predicted_demand: float
    actual_demand: Optional[float] = None
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None
    model_version: Optional[str] = None

    class Config:
        from_attributes = True


class ForecastPoint(BaseModel):
    """Single forecast data point (used for chart rendering)."""
    week: int
    date: str
    predicted_demand: float
    confidence_lower: float
    confidence_upper: float


class ForecastResultResponse(BaseModel):
    """Full forecast result with historical data."""
    forecasts: List[ForecastPoint]
    historical: List[dict]
    model_version: str
    accuracy: float
    rmse: float
    training_samples: int
    training_id: int
    data_source: str
    last_trained: Optional[str] = None


# ── Alert Schemas ─────────────────────────────────────────────────────


class InventoryAlertResponse(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    warehouse_id: Optional[int] = None
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    is_resolved: bool
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertResolve(BaseModel):
    resolution_note: Optional[str] = None


# ── Dashboard KPI Schemas ─────────────────────────────────────────────


class KPIData(BaseModel):
    total_revenue: float = 0
    total_orders: int = 0
    forecast_accuracy: float = 0
    inventory_health: float = 0
    active_alerts: int = 0
    products_at_risk: int = 0
    reorder_needed: int = 0
    avg_demand: float = 0
    total_products: int = 0


class ChartDataPoint(BaseModel):
    date: Optional[str] = None
    actual: Optional[float] = None
    predicted: Optional[float] = None
    value: Optional[float] = None
    label: Optional[str] = None


class DashboardChartData(BaseModel):
    demand_trend: List[ChartDataPoint] = []
    actual_vs_predicted: List[ChartDataPoint] = []
    inventory_health: List[ChartDataPoint] = []
    revenue_trend: List[ChartDataPoint] = []
    category_distribution: List[ChartDataPoint] = []
    top_products: List[ChartDataPoint] = []


# ── Upload Schema ─────────────────────────────────────────────────────


class UploadResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: Optional[int] = None
    status: str
    rows_processed: int
    columns_detected: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Report Schema ─────────────────────────────────────────────────────


class ReportResponse(BaseModel):
    id: int
    name: str
    report_type: str
    format: str
    file_size: Optional[int] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    name: Optional[str] = None
    report_type: str = Field(pattern=r"^(forecast|inventory|sales|category)$")
    format: str = Field(default="csv", pattern=r"^(csv|excel|pdf)$")


# ── Model Version Schema ─────────────────────────────────────────────


class ModelVersionResponse(BaseModel):
    id: int
    version_tag: str
    model_type: str
    accuracy: Optional[float] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    training_samples: Optional[int] = None
    feature_importance: Optional[dict] = None
    data_source: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Audit Log Schema ─────────────────────────────────────────────────


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
