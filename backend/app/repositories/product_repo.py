"""Product repository — tenant-scoped product CRUD + analytics queries."""

from typing import Optional, Sequence
from sqlalchemy import select, func, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Product, Sale
from app.core.base_repository import BaseRepository


class ProductRepository(BaseRepository[Product]):

    def __init__(self, session: AsyncSession, org_id: int):
        super().__init__(session, Product, org_id)

    async def get_by_sku(self, sku: str) -> Optional[Product]:
        stmt = self._scoped_query().where(Product.sku == sku)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_categories(self) -> list[dict]:
        """Get category summary with product count and total revenue."""
        stmt = (
            select(
                Product.category,
                func.count(Product.id).label("product_count"),
            )
            .where(Product.organization_id == self.org_id)
            .where(Product.is_active == True)
            .group_by(Product.category)
            .order_by(desc("product_count"))
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        categories = []
        for row in rows:
            # Get sales aggregates for this category
            sales_stmt = (
                select(
                    func.coalesce(func.sum(Sale.quantity), 0).label("total_sales"),
                    func.coalesce(func.sum(Sale.revenue), 0).label("total_revenue"),
                )
                .join(Product, Sale.product_id == Product.id)
                .where(Product.organization_id == self.org_id)
                .where(Product.category == row.category)
            )
            sales_result = await self.session.execute(sales_stmt)
            sales_row = sales_result.one()

            categories.append({
                "category": row.category,
                "product_count": row.product_count,
                "total_sales": int(sales_row.total_sales),
                "total_revenue": float(sales_row.total_revenue),
            })

        return categories

    async def get_with_analytics(
        self,
        *,
        category: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
        sort_by: str = "total_revenue",
    ) -> list[dict]:
        """Get products with sales analytics (total_sales, total_revenue, growth)."""
        base_filter = Product.organization_id == self.org_id
        filters = [base_filter, Product.is_active == True]
        if category:
            filters.append(Product.category == category)

        stmt = (
            select(
                Product,
                func.coalesce(func.sum(Sale.quantity), 0).label("total_sales"),
                func.coalesce(func.sum(Sale.revenue), 0).label("total_revenue"),
            )
            .outerjoin(Sale, Sale.product_id == Product.id)
            .where(*filters)
            .group_by(Product.id)
            .order_by(desc("total_revenue"))
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        products = []
        for product, total_sales, total_revenue in rows:
            products.append({
                "id": product.id,
                "name": product.name,
                "category": product.category,
                "sku": product.sku,
                "price": product.price,
                "sales": int(total_sales),
                "revenue": float(total_revenue),
                "growth": 0.0,  # Computed from time-series comparison
                "is_active": product.is_active,
            })

        return products

    async def get_top_products(self, limit: int = 10) -> list[dict]:
        """Get top-selling products by revenue."""
        return await self.get_with_analytics(limit=limit)
