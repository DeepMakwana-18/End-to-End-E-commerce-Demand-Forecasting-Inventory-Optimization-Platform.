"""Reports API routes — DB-backed report management."""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.models import Report
from app.schemas import ReportResponse, ReportCreate
from app.core.base_repository import BaseRepository

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("")
async def get_reports(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get list of generated reports."""
    repo = BaseRepository[Report](db, Report, tenant.org_id)
    reports = await repo.get_all(order_by="created_at", order_desc=True, limit=50)

    result = []
    for r in reports:
        result.append({
            "id": r.id,
            "name": r.name,
            "type": r.report_type,
            "format": r.format.upper(),
            "size": f"{(r.file_size or 0) / 1024:.0f} KB" if r.file_size else "N/A",
            "date": r.created_at.strftime("%Y-%m-%d") if r.created_at else "",
            "status": r.status,
        })

    return {"reports": result, "total": len(result)}


@router.post("/generate")
async def generate_report(
    report_in: ReportCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Generate a new report."""
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    name = report_in.name or f"{report_in.report_type.title()} Report"

    report = Report(
        organization_id=tenant.org_id,
        user_id=tenant.user_id,
        name=name,
        report_type=report_in.report_type,
        format=report_in.format,
        status="generating",
    )

    repo = BaseRepository[Report](db, Report, tenant.org_id)
    report = await repo.create(report)

    # TODO: Queue actual report generation via Celery
    report.status = "completed"
    await db.flush()

    return {
        "id": report.id,
        "name": report.name,
        "type": report.report_type,
        "format": report.format.upper(),
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "message": f"Report generation started. Format: {report.format.upper()}",
    }
