"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, AlertSeverity, AlertType


# ---- Auth Schemas ----
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2, max_length=255)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Product Schemas ----
class ProductResponse(BaseModel):
    id: int
    name: str
    category: str
    sku: str
    price: float
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    category: str
    sku: str
    price: float
    description: Optional[str] = None


# ---- Forecast Schemas ----
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


# ---- Inventory Alert Schemas ----
class InventoryAlertResponse(BaseModel):
    id: int
    product_id: int
    warehouse_id: Optional[int] = None
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Dashboard KPI Schemas ----
class KPIData(BaseModel):
    total_revenue: float = 0
    total_orders: int = 0
    forecast_accuracy: float = 0
    inventory_health: float = 0
    active_alerts: int = 0
    products_at_risk: int = 0
    reorder_needed: int = 0
    avg_demand: float = 0


class ChartDataPoint(BaseModel):
    date: str
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


# ---- Upload Schema ----
class UploadResponse(BaseModel):
    id: int
    filename: str
    status: str
    rows_processed: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Pagination ----
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    total_pages: int
