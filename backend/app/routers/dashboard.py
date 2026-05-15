"""Dashboard API routes - KPIs, charts, and analytics data."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from datetime import datetime, timedelta
import random
import math

from app.database import get_db
from app.models import (
    Product, Sale, Forecast, InventoryAlert, 
    AlertSeverity, AlertType, InventoryStatus
)
from app.schemas import KPIData, DashboardChartData, ChartDataPoint
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=KPIData)
async def get_dashboard_kpis(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get executive dashboard KPI metrics."""
    # Generate realistic demo KPI data
    return KPIData(
        total_revenue=2847563.42,
        total_orders=18432,
        forecast_accuracy=94.7,
        inventory_health=87.3,
        active_alerts=12,
        products_at_risk=5,
        reorder_needed=8,
        avg_demand=1243.5,
    )


@router.get("/charts", response_model=DashboardChartData)
async def get_dashboard_charts(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get chart data for the executive dashboard."""
    # Generate realistic demo chart data
    today = datetime.utcnow()
    
    # Demand Trend (last 12 weeks)
    demand_trend = []
    for i in range(12):
        date = today - timedelta(weeks=11 - i)
        base = 1200 + (i * 50)
        demand_trend.append(ChartDataPoint(
            date=date.strftime("%Y-%m-%d"),
            value=round(base + random.uniform(-200, 200), 1),
            label=f"Week {i + 1}",
        ))

    # Actual vs Predicted
    actual_vs_predicted = []
    for i in range(12):
        date = today - timedelta(weeks=11 - i)
        actual = 1000 + (i * 80) + random.uniform(-150, 150)
        predicted = actual + random.uniform(-100, 100)
        actual_vs_predicted.append(ChartDataPoint(
            date=date.strftime("%Y-%m-%d"),
            actual=round(actual, 1),
            predicted=round(predicted, 1),
            label=f"Week {i + 1}",
        ))

    # Inventory Health distribution
    inventory_health = [
        ChartDataPoint(label="Healthy", value=65),
        ChartDataPoint(label="Low Stock", value=20),
        ChartDataPoint(label="Critical", value=8),
        ChartDataPoint(label="Overstock", value=7),
    ]

    # Revenue Trend (last 6 months)
    revenue_trend = []
    for i in range(6):
        date = today - timedelta(days=30 * (5 - i))
        revenue_trend.append(ChartDataPoint(
            date=date.strftime("%Y-%m"),
            value=round(400000 + (i * 50000) + random.uniform(-30000, 30000), 0),
            label=date.strftime("%b %Y"),
        ))

    # Category distribution
    categories = [
        ("Electronics", 35), ("Fashion", 25), ("Home & Garden", 18),
        ("Sports", 12), ("Books", 10),
    ]
    category_distribution = [
        ChartDataPoint(label=cat, value=val) for cat, val in categories
    ]

    # Top products
    top_products = [
        ChartDataPoint(label="Wireless Headphones", value=4523),
        ChartDataPoint(label="Smart Watch Pro", value=3891),
        ChartDataPoint(label="USB-C Hub", value=3245),
        ChartDataPoint(label="Laptop Stand", value=2876),
        ChartDataPoint(label="Bluetooth Speaker", value=2543),
    ]

    return DashboardChartData(
        demand_trend=demand_trend,
        actual_vs_predicted=actual_vs_predicted,
        inventory_health=inventory_health,
        revenue_trend=revenue_trend,
        category_distribution=category_distribution,
        top_products=top_products,
    )


@router.get("/alerts")
async def get_recent_alerts(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get recent inventory alerts for the dashboard."""
    # Return demo alert data
    alerts = [
        {
            "id": 1, "product_name": "Wireless Headphones", "alert_type": "reorder",
            "severity": "high", "message": "Stock below reorder point. Current: 45, Reorder Point: 120",
            "created_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
        },
        {
            "id": 2, "product_name": "USB-C Hub", "alert_type": "low_stock",
            "severity": "critical", "message": "Critical stock level reached. Current: 12, Safety Stock: 50",
            "created_at": (datetime.utcnow() - timedelta(hours=5)).isoformat(),
        },
        {
            "id": 3, "product_name": "Laptop Stand", "alert_type": "reorder",
            "severity": "medium", "message": "Approaching reorder point. Current: 89, Reorder Point: 95",
            "created_at": (datetime.utcnow() - timedelta(hours=8)).isoformat(),
        },
        {
            "id": 4, "product_name": "Smart Watch Pro", "alert_type": "overstock",
            "severity": "low", "message": "Overstock detected. Current: 580, Max: 400",
            "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        },
        {
            "id": 5, "product_name": "Bluetooth Speaker", "alert_type": "stockout",
            "severity": "critical", "message": "Stockout imminent. Current: 3, Daily Demand: 15",
            "created_at": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
        },
    ]
    return {"alerts": alerts, "total": len(alerts)}
