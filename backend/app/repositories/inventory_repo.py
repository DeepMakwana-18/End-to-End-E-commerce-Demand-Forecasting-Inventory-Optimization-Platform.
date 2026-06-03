"""Inventory repository — tenant-scoped inventory CRUD + health queries."""

from typing import Optional, Sequence
from sqlalchemy import select, func, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Inventory, Product, InventoryStatus
from app.core.base_repository import BaseRepository


class InventoryRepository(BaseRepository[Inventory]):

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, Inventory, org_id)

    async def get_for_product(self, product_id: int) -> Optional[Inventory]:
        stmt = self._scoped_query().where(Inventory.product_id == product_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_items_with_products(
        self,
        *,
        status: Optional[str] = None,
        category: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[dict]:
        """Get inventory items joined with product details."""
        filters = [Inventory.organization_id == self.org_id]
        if status:
            filters.append(Inventory.status == status)

        stmt = (
            select(Inventory, Product)
            .join(Product, Inventory.product_id == Product.id)
            .where(*filters)
        )
        if category:
            stmt = stmt.where(Product.category == category)

        stmt = stmt.order_by(Inventory.health_score.asc()).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        rows = result.all()

        items = []
        for inv, product in rows:
            recommended_qty = 0
            if inv.current_stock < inv.reorder_point:
                recommended_qty = inv.reorder_point - inv.current_stock + inv.safety_stock

            items.append({
                "id": inv.id,
                "name": product.name,
                "sku": product.sku,
                "category": product.category,
                "current_stock": inv.current_stock,
                "safety_stock": inv.safety_stock,
                "reorder_point": inv.reorder_point,
                "recommended_qty": recommended_qty,
                "lead_time": (inv.lead_time_days or 14) // 7,
                "status": inv.status.value if inv.status else "healthy",
                "health_score": inv.health_score,
            })

        return items

    async def get_health_summary(self) -> dict:
        """Get inventory health distribution for the org."""
        stmt = (
            select(
                Inventory.status,
                func.count(Inventory.id).label("count"),
            )
            .where(Inventory.organization_id == self.org_id)
            .group_by(Inventory.status)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        total = sum(r.count for r in rows)
        distribution = {}
        for row in rows:
            status_val = row.status.value if row.status else "healthy"
            distribution[status_val] = {
                "count": row.count,
                "percentage": round((row.count / total * 100) if total else 0, 1),
            }

        # Get overall health score
        avg_stmt = (
            select(func.avg(Inventory.health_score))
            .where(Inventory.organization_id == self.org_id)
        )
        avg_result = await self.session.execute(avg_stmt)
        avg_health = avg_result.scalar() or 0

        return {
            "total_skus": total,
            "distribution": distribution,
            "overall_health": round(float(avg_health), 1),
        }

    async def get_reorder_items(self) -> list[dict]:
        """Get items that need reordering (current_stock < reorder_point)."""
        stmt = (
            select(Inventory, Product)
            .join(Product, Inventory.product_id == Product.id)
            .where(Inventory.organization_id == self.org_id)
            .where(Inventory.current_stock < Inventory.reorder_point)
            .order_by(Inventory.health_score.asc())
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        items = []
        for inv, product in rows:
            qty = inv.reorder_point - inv.current_stock + inv.safety_stock
            items.append({
                "id": inv.id,
                "name": product.name,
                "sku": product.sku,
                "category": product.category,
                "current_stock": inv.current_stock,
                "safety_stock": inv.safety_stock,
                "reorder_point": inv.reorder_point,
                "recommended_qty": qty,
                "lead_time": (inv.lead_time_days or 14) // 7,
                "status": inv.status.value if inv.status else "low",
                "health_score": inv.health_score,
            })

        return items

    async def count_by_status(self, status: InventoryStatus) -> int:
        stmt = (
            select(func.count(Inventory.id))
            .where(Inventory.organization_id == self.org_id)
            .where(Inventory.status == status)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
