"""Dashboard API routes — KPIs, charts, and analytics data.

All data is now sourced from real DB queries, scoped to the user's organization.
Falls back to sensible zeros when no data exists.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import (
    Product, Sale, Forecast, InventoryAlert, Inventory,
    InventoryStatus, AlertSeverity,
)
from app.schemas import KPIData, DashboardChartData, ChartDataPoint
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.core.cache import cache_get, cache_set, make_cache_key
from app.repositories import AlertRepository, InventoryRepository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=KPIData)
async def get_dashboard_kpis(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get executive dashboard KPI metrics from real data."""
    org_id = tenant.org_id

    # Check cache
    cache_key = make_cache_key(org_id, "dashboard", "kpis")
    cached = await cache_get(cache_key)
    if cached:
        return KPIData(**cached)

    # Total revenue & orders from sales
    sales_stmt = (
        select(
            func.coalesce(func.sum(Sale.revenue), 0).label("total_revenue"),
            func.coalesce(func.count(Sale.id), 0).label("total_orders"),
            func.coalesce(func.avg(Sale.quantity), 0).label("avg_demand"),
        )
        .where(Sale.organization_id == org_id)
    )
    sales_result = await db.execute(sales_stmt)
    sales_row = sales_result.one()

    # Product count
    product_count_stmt = (
        select(func.count(Product.id))
        .where(Product.organization_id == org_id)
        .where(Product.is_active == True)
    )
    product_count = (await db.execute(product_count_stmt)).scalar() or 0

    # Inventory health
    inv_repo = InventoryRepository(db, org_id)
    health_summary = await inv_repo.get_health_summary()

    # Active alerts
    alert_repo = AlertRepository(db, org_id)
    active_alerts = await alert_repo.count_active()

    # Products at risk (critical + low inventory)
    at_risk = await inv_repo.count_by_status(InventoryStatus.CRITICAL)
    at_risk += await inv_repo.count_by_status(InventoryStatus.LOW)

    # Reorder needed
    reorder_items = await inv_repo.get_reorder_items()

    # Forecast accuracy
    from app.repositories.forecast_repo import ModelVersionRepository
    mv_repo = ModelVersionRepository(db, org_id)
    active_mv = await mv_repo.get_active()
    accuracy = active_mv.accuracy if active_mv and active_mv.model_path and active_mv.accuracy else 0.0

    kpis = KPIData(
        total_revenue=float(sales_row.total_revenue),
        total_orders=int(sales_row.total_orders),
        forecast_accuracy=accuracy,
        inventory_health=health_summary.get("overall_health", 0),
        active_alerts=active_alerts,
        products_at_risk=at_risk,
        reorder_needed=len(reorder_items),
        avg_demand=float(sales_row.avg_demand),
        total_products=product_count,
    )

    # Cache for 60 seconds
    await cache_set(cache_key, kpis.model_dump(), ttl_seconds=60)
    return kpis


@router.get("/charts", response_model=DashboardChartData)
async def get_dashboard_charts(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get chart data from real database aggregations.

    Demand trend is sourced from the Forecasts table, anchored to the
    dataset's own date range (not datetime.now()), so uploaded historical
    datasets are always visible regardless of when the app is running.
    """
    org_id = tenant.org_id

    cache_key = make_cache_key(org_id, "dashboard", "charts")
    cached = await cache_get(cache_key)
    if cached:
        return DashboardChartData(**cached)

    # ── Determine dataset anchor date from Forecasts table ──────────
    # Use MAX(forecast_date) where actual_demand IS NOT NULL so we anchor
    # to real data, not future predicted rows.
    from sqlalchemy import text
    anchor_stmt = (
        select(func.max(Forecast.forecast_date))
        .where(Forecast.organization_id == org_id)
        .where(Forecast.actual_demand.isnot(None))
    )
    anchor_result = await db.execute(anchor_stmt)
    anchor_date = anchor_result.scalar()

    # ── Demand Trend (weekly, last 12 weeks anchored to dataset end) ──
    demand_trend = []
    if anchor_date is not None:
        # Make timezone-aware if it is not
        if hasattr(anchor_date, 'tzinfo') and anchor_date.tzinfo is None:
            from datetime import timezone as _tz
            anchor_date = anchor_date.replace(tzinfo=_tz.utc)

        for i in range(12):
            week_start = anchor_date - timedelta(weeks=11 - i)
            week_end = week_start + timedelta(weeks=1)
            stmt = (
                select(func.coalesce(func.sum(Forecast.actual_demand), 0))
                .where(Forecast.organization_id == org_id)
                .where(Forecast.actual_demand.isnot(None))
                .where(Forecast.forecast_date >= week_start)
                .where(Forecast.forecast_date < week_end)
            )
            result = await db.execute(stmt)
            val = result.scalar() or 0
            demand_trend.append(ChartDataPoint(
                date=week_start.strftime("%Y-%m-%d"),
                value=float(val),
                label=f"Week {i + 1}",
            ))

    # ── Revenue Trend (monthly, last 6 months anchored to Sales data) ──
    # IMPORTANT: The Forecasts anchor (demand CSV end = 2025-01-05) differs from
    # the Sales date range (2025-12-09 to 2026-06-02). Using the Forecasts anchor
    # for revenue produces 6 months of zeros because no Sales records fall in that
    # window. Revenue trend MUST anchor to MAX(Sale.date) from its own table.
    revenue_anchor_stmt = (
        select(func.max(Sale.date))
        .where(Sale.organization_id == org_id)
    )
    revenue_anchor_result = await db.execute(revenue_anchor_stmt)
    revenue_anchor = revenue_anchor_result.scalar()

    revenue_trend = []
    if revenue_anchor is not None:
        if hasattr(revenue_anchor, 'tzinfo') and revenue_anchor.tzinfo is None:
            from datetime import timezone as _tz
            revenue_anchor = revenue_anchor.replace(tzinfo=_tz.utc)

        for i in range(6):
            month_start = (revenue_anchor.replace(day=1) - timedelta(days=30 * (5 - i))).replace(day=1)
            next_month = (month_start + timedelta(days=32)).replace(day=1)
            stmt = (
                select(func.coalesce(func.sum(Sale.revenue), 0))
                .where(Sale.organization_id == org_id)
                .where(Sale.date >= month_start)
                .where(Sale.date < next_month)
            )
            result = await db.execute(stmt)
            val = result.scalar() or 0
            revenue_trend.append(ChartDataPoint(
                date=month_start.strftime("%Y-%m"),
                value=float(val),
                label=month_start.strftime("%b %Y"),
            ))


    # ── Actual vs Predicted (from Forecasts table, last 12 weeks) ───
    actual_vs_predicted = []
    if anchor_date is not None:
        avp_stmt = (
            select(
                Forecast.forecast_date,
                func.sum(Forecast.actual_demand).label("actual"),
                func.sum(Forecast.predicted_demand).label("predicted"),
            )
            .where(Forecast.organization_id == org_id)
            .where(Forecast.actual_demand.isnot(None))
            # NOTE: predicted_demand IS NOT NULL filter removed — historical rows have real
            # in-sample predictions stored (not 0 placeholder) after the retraining fix.
            # Rows without predictions will show predicted=None on the chart which Recharts
            # renders as a gap, which is correct behaviour.
            .where(Forecast.forecast_date >= anchor_date - timedelta(weeks=12))
            .group_by(Forecast.forecast_date)
            .order_by(Forecast.forecast_date.asc())
            .limit(12)
        )
        avp_result = await db.execute(avp_stmt)
        avp_rows = avp_result.all()
        actual_vs_predicted = [
            ChartDataPoint(
                date=row.forecast_date.strftime("%Y-%m-%d") if hasattr(row.forecast_date, 'strftime') else str(row.forecast_date),
                # FIX: populate the typed actual/predicted fields — frontend reads dataKey="actual" and
                # dataKey="predicted"; previously these were mis-mapped to value/label causing blank chart.
                actual=round(float(row.actual or 0), 1),
                predicted=round(float(row.predicted or 0), 1) if row.predicted is not None else None,
                value=round(float(row.actual or 0), 1),    # keep value for backward compat
                label=row.forecast_date.strftime("%Y-%m-%d") if hasattr(row.forecast_date, 'strftime') else str(row.forecast_date),
            )
            for row in avp_rows
        ]

    # ── Inventory Health distribution ────────────────────────────────
    inv_repo = InventoryRepository(db, org_id)
    health_summary = await inv_repo.get_health_summary()
    inv_health_chart = []
    status_labels = {"healthy": "Healthy", "low": "Low Stock", "critical": "Critical", "overstock": "Overstock"}
    for status_key, label in status_labels.items():
        dist = health_summary.get("distribution", {}).get(status_key, {})
        inv_health_chart.append(ChartDataPoint(label=label, value=dist.get("percentage", 0)))

    # ── Category distribution ────────────────────────────────────────
    cat_stmt = (
        select(
            Product.category,
            func.count(Product.id).label("cnt"),
        )
        .where(Product.organization_id == org_id)
        .where(Product.is_active == True)
        .group_by(Product.category)
        .order_by(func.count(Product.id).desc())
        .limit(6)
    )
    cat_result = await db.execute(cat_stmt)
    cat_rows = cat_result.all()
    total_products = sum(r.cnt for r in cat_rows) or 1
    category_distribution = [
        ChartDataPoint(label=row.category, value=round(row.cnt / total_products * 100, 1))
        for row in cat_rows
    ]

    # ── Top products by revenue ──────────────────────────────────────
    top_stmt = (
        select(
            Product.name,
            func.coalesce(func.sum(Sale.revenue), 0).label("rev"),
        )
        .outerjoin(Sale, Sale.product_id == Product.id)
        .where(Product.organization_id == org_id)
        .group_by(Product.id, Product.name)
        .order_by(func.sum(Sale.revenue).desc().nullslast())
        .limit(5)
    )
    top_result = await db.execute(top_stmt)
    top_products = [
        ChartDataPoint(label=row.name, value=float(row.rev))
        for row in top_result.all()
    ]

    charts = DashboardChartData(
        demand_trend=demand_trend,
        actual_vs_predicted=actual_vs_predicted,
        inventory_health=inv_health_chart,
        revenue_trend=revenue_trend,
        category_distribution=category_distribution,
        top_products=top_products,
    )

    await cache_set(cache_key, charts.model_dump(), ttl_seconds=60)
    return charts


@router.get("/alerts")
async def get_recent_alerts(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get recent inventory alerts from the database."""
    alert_repo = AlertRepository(db, tenant.org_id)
    alerts = await alert_repo.get_active_alerts(limit=10)
    return {"alerts": alerts, "total": len(alerts)}
