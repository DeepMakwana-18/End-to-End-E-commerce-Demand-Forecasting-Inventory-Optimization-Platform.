"""Products API routes — full CRUD with tenant isolation."""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.dependencies import get_tenant_context, require_admin
from app.core.tenant import TenantContext
from app.repositories.product_repo import ProductRepository
from app.core.cache import cache_delete_pattern, make_cache_key

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("")
async def get_products(
    category: Optional[str] = Query(default=None),
    sort_by: str = Query(default="total_revenue"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get all products with sales analytics, scoped to organization."""
    repo = ProductRepository(db, tenant.org_id)
    offset = (page - 1) * per_page

    products = await repo.get_with_analytics(
        category=category, offset=offset, limit=per_page, sort_by=sort_by,
    )
    total = await repo.count(filters={"is_active": True})

    return {"products": products, "total": total, "page": page, "per_page": per_page}


@router.get("/top")
async def get_top_products(
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get top-performing products by revenue."""
    repo = ProductRepository(db, tenant.org_id)
    products = await repo.get_top_products(limit=limit)
    return {"products": products}


@router.get("/categories")
async def get_categories(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get product categories with analytics."""
    repo = ProductRepository(db, tenant.org_id)
    categories = await repo.get_categories()
    return {"categories": categories}


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Create a new product (analyst+ only)."""
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    repo = ProductRepository(db, tenant.org_id)

    # Check SKU uniqueness within org
    existing = await repo.get_by_sku(product_in.sku)
    if existing:
        raise HTTPException(status_code=409, detail=f"SKU '{product_in.sku}' already exists")

    product = Product(
        organization_id=tenant.org_id,
        **product_in.model_dump(),
    )
    product = await repo.create(product)

    await cache_delete_pattern(make_cache_key(tenant.org_id, "dashboard", "*"))
    return ProductResponse.model_validate(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Get a single product by ID."""
    repo = ProductRepository(db, tenant.org_id)
    product = await repo.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse.model_validate(product)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Update a product (analyst+ only)."""
    if not tenant.can_write:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    repo = ProductRepository(db, tenant.org_id)
    updates = product_in.model_dump(exclude_unset=True)
    product = await repo.update(product_id, **updates)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await cache_delete_pattern(make_cache_key(tenant.org_id, "dashboard", "*"))
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """Soft-delete a product (admin only)."""
    if not tenant.is_org_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    repo = ProductRepository(db, tenant.org_id)
    product = await repo.update(product_id, is_active=False)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
