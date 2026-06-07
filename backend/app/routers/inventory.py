"""Inventory optimization API routes — real DB-backed queries."""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.repositories.inventory_repo import InventoryRepository

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("")
async def get_inventory_items(
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get all inventory items with optimization metrics."""
    repo = InventoryRepository(db, tenant.org_id)
    offset = (page - 1) * per_page
    items = await repo.get_items_with_products(
        status=status, category=category, offset=offset, limit=per_page,
    )
    total = await repo.count()
    return {"items": items, "total": total}


@router.get("/alerts")
async def get_inventory_alerts(
    severity: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get inventory alerts."""
    from app.repositories.alert_repo import AlertRepository
    alert_repo = AlertRepository(db, tenant.org_id)
    alerts = await alert_repo.get_active_alerts(severity=severity)
    return {"alerts": alerts, "total": len(alerts)}


@router.get("/health-summary")
async def get_health_summary(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get inventory health distribution summary."""
    repo = InventoryRepository(db, tenant.org_id)
    return await repo.get_health_summary()


@router.get("/reorder-recommendations")
async def get_reorder_recommendations(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get products that need reordering with real product pricing."""
    from sqlalchemy import select, func
    from app.models import Product

    repo = InventoryRepository(db, tenant.org_id)
    items = await repo.get_reorder_items()

    if not items:
        return {"recommendations": [], "total": 0, "total_order_value": 0}

    # Fetch real product prices for the SKUs that need reordering
    product_ids = [i["id"] for i in items if i.get("id")]  # inventory id
    # get_reorder_items returns inventory rows joined with product — re-query
    # product prices using SKU as the join key
    skus = [i["sku"] for i in items if i.get("sku")]
    price_by_sku: dict[str, float] = {}
    if skus:
        price_stmt = (
            select(Product.sku, Product.price)
            .where(Product.organization_id == tenant.org_id)
            .where(Product.sku.in_(skus))
        )
        price_rows = (await db.execute(price_stmt)).all()
        price_by_sku = {
            row.sku: float(row.price)
            for row in price_rows
            if row.price is not None and float(row.price) > 0
        }

    # Compute total order value using real product prices
    total_value = sum(
        item.get("recommended_qty", 0) * price_by_sku.get(item.get("sku", ""), 0.0)
        for item in items
    )

    return {
        "recommendations": items,
        "total": len(items),
        "total_order_value": round(total_value, 2),
    }


@router.patch("/{inventory_id}")
async def update_inventory(
    inventory_id: int,
    current_stock: Optional[int] = None,
    safety_stock: Optional[int] = None,
    reorder_point: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Update inventory levels for a specific item."""
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    repo = InventoryRepository(db, tenant.org_id)
    updates = {}
    if current_stock is not None:
        updates["current_stock"] = current_stock
    if safety_stock is not None:
        updates["safety_stock"] = safety_stock
    if reorder_point is not None:
        updates["reorder_point"] = reorder_point

    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    item = await repo.update(inventory_id, **updates)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    return {"status": "updated", "id": inventory_id}
