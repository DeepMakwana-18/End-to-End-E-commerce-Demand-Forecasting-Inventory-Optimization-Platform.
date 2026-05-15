"""Inventory optimization API routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])

DEMO_ITEMS = [
    {"id": 1, "name": "Wireless Headphones", "sku": "WH-001", "category": "Electronics", "current_stock": 45, "safety_stock": 80, "reorder_point": 120, "recommended_qty": 200, "lead_time": 2, "status": "critical", "health_score": 32},
    {"id": 2, "name": "Smart Watch Pro", "sku": "SW-002", "category": "Electronics", "current_stock": 580, "safety_stock": 150, "reorder_point": 200, "recommended_qty": 0, "lead_time": 3, "status": "overstock", "health_score": 55},
    {"id": 3, "name": "USB-C Hub", "sku": "UC-003", "category": "Electronics", "current_stock": 12, "safety_stock": 50, "reorder_point": 80, "recommended_qty": 150, "lead_time": 1, "status": "critical", "health_score": 15},
    {"id": 4, "name": "Laptop Stand", "sku": "LS-004", "category": "Accessories", "current_stock": 89, "safety_stock": 60, "reorder_point": 95, "recommended_qty": 100, "lead_time": 2, "status": "low", "health_score": 68},
    {"id": 5, "name": "Bluetooth Speaker", "sku": "BS-005", "category": "Electronics", "current_stock": 3, "safety_stock": 40, "reorder_point": 65, "recommended_qty": 180, "lead_time": 2, "status": "critical", "health_score": 5},
    {"id": 6, "name": "Mechanical Keyboard", "sku": "MK-006", "category": "Peripherals", "current_stock": 245, "safety_stock": 80, "reorder_point": 120, "recommended_qty": 0, "lead_time": 3, "status": "healthy", "health_score": 92},
    {"id": 7, "name": "Webcam HD", "sku": "WC-007", "category": "Peripherals", "current_stock": 167, "safety_stock": 50, "reorder_point": 80, "recommended_qty": 0, "lead_time": 2, "status": "healthy", "health_score": 88},
    {"id": 8, "name": "Monitor Arm", "sku": "MA-008", "category": "Accessories", "current_stock": 78, "safety_stock": 40, "reorder_point": 70, "recommended_qty": 50, "lead_time": 1, "status": "low", "health_score": 72},
]


@router.get("")
async def get_inventory_items(
    status: str = Query(default=None),
    category: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get all inventory items with optimization metrics."""
    items = DEMO_ITEMS
    if status:
        items = [i for i in items if i["status"] == status]
    if category:
        items = [i for i in items if i["category"].lower() == category.lower()]
    return {"items": items, "total": len(items)}


@router.get("/alerts")
async def get_inventory_alerts(
    severity: str = Query(default=None),
    resolved: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get inventory alerts."""
    now = datetime.utcnow()
    alerts = [
        {"id": 1, "product_name": "Bluetooth Speaker", "alert_type": "stockout", "severity": "critical",
         "message": "Stockout imminent. Current: 3, Daily Demand: 15", "created_at": (now - timedelta(hours=1)).isoformat(), "is_resolved": False},
        {"id": 2, "product_name": "USB-C Hub", "alert_type": "low_stock", "severity": "critical",
         "message": "Critical stock level. Current: 12, Safety Stock: 50", "created_at": (now - timedelta(hours=3)).isoformat(), "is_resolved": False},
        {"id": 3, "product_name": "Wireless Headphones", "alert_type": "reorder", "severity": "high",
         "message": "Below reorder point. Current: 45, ROP: 120", "created_at": (now - timedelta(hours=5)).isoformat(), "is_resolved": False},
        {"id": 4, "product_name": "Laptop Stand", "alert_type": "reorder", "severity": "medium",
         "message": "Approaching reorder point. Current: 89, ROP: 95", "created_at": (now - timedelta(hours=8)).isoformat(), "is_resolved": False},
        {"id": 5, "product_name": "Smart Watch Pro", "alert_type": "overstock", "severity": "low",
         "message": "Overstock detected. Current: 580, Max: 400", "created_at": (now - timedelta(days=1)).isoformat(), "is_resolved": False},
    ]
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    return {"alerts": alerts, "total": len(alerts)}


@router.get("/health-summary")
async def get_health_summary(
    user=Depends(get_current_user),
):
    """Get inventory health distribution summary."""
    total = len(DEMO_ITEMS)
    statuses = {}
    for item in DEMO_ITEMS:
        statuses[item["status"]] = statuses.get(item["status"], 0) + 1
    return {
        "total_skus": total,
        "distribution": {s: {"count": c, "percentage": round(c / total * 100, 1)} for s, c in statuses.items()},
        "overall_health": round(sum(i["health_score"] for i in DEMO_ITEMS) / total, 1),
    }


@router.get("/reorder-recommendations")
async def get_reorder_recommendations(
    user=Depends(get_current_user),
):
    """Get products that need reordering."""
    reorder_items = [i for i in DEMO_ITEMS if i["recommended_qty"] > 0]
    return {
        "recommendations": reorder_items,
        "total": len(reorder_items),
        "total_order_value": sum(i["recommended_qty"] * 25 for i in reorder_items),  # approx
    }
