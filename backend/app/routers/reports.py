"""Reports API routes - export generation."""

from fastapi import APIRouter, Depends, Query
from datetime import datetime

from app.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("")
async def get_reports(
    user=Depends(get_current_user),
):
    """Get list of generated reports."""
    reports = [
        {"id": 1, "name": "Q4 Demand Forecast", "type": "forecast", "format": "CSV", "size": "2.4 MB", "date": "2026-05-12", "status": "completed"},
        {"id": 2, "name": "Weekly Inventory Alert", "type": "inventory", "format": "Excel", "size": "1.8 MB", "date": "2026-05-11", "status": "completed"},
        {"id": 3, "name": "Monthly Sales Summary", "type": "sales", "format": "PDF", "size": "4.1 MB", "date": "2026-05-10", "status": "completed"},
        {"id": 4, "name": "Category Growth Analysis", "type": "category", "format": "CSV", "size": "1.2 MB", "date": "2026-05-09", "status": "completed"},
        {"id": 5, "name": "Reorder Recommendations", "type": "inventory", "format": "Excel", "size": "890 KB", "date": "2026-05-08", "status": "completed"},
    ]
    return {"reports": reports, "total": len(reports)}


@router.post("/generate")
async def generate_report(
    report_type: str = Query(..., regex="^(forecast|inventory|sales|category)$"),
    format: str = Query(default="csv", regex="^(csv|excel|pdf)$"),
    user=Depends(get_current_user),
):
    """Generate a new report."""
    return {
        "id": 6,
        "name": f"{report_type.title()} Report",
        "type": report_type,
        "format": format.upper(),
        "status": "generating",
        "created_at": datetime.utcnow().isoformat(),
        "message": f"Report generation started. Format: {format.upper()}",
    }
