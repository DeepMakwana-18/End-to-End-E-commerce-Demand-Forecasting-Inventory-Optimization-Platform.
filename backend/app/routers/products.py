"""Products API routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/products", tags=["Products"])

DEMO_PRODUCTS = [
    {"id": 1, "name": "Wireless Headphones", "category": "Electronics", "sku": "WH-001", "price": 69.99, "sales": 4523, "revenue": 316610, "growth": 18.5, "rating": 4.8, "is_active": True},
    {"id": 2, "name": "Smart Watch Pro", "category": "Electronics", "sku": "SW-002", "price": 149.99, "sales": 3891, "revenue": 583650, "growth": 12.3, "rating": 4.6, "is_active": True},
    {"id": 3, "name": "USB-C Hub", "category": "Electronics", "sku": "UC-003", "price": 39.99, "sales": 3245, "revenue": 129800, "growth": 22.1, "rating": 4.5, "is_active": True},
    {"id": 4, "name": "Laptop Stand", "category": "Accessories", "sku": "LS-004", "price": 59.99, "sales": 2876, "revenue": 172560, "growth": 8.7, "rating": 4.7, "is_active": True},
    {"id": 5, "name": "Bluetooth Speaker", "category": "Electronics", "sku": "BS-005", "price": 79.99, "sales": 2543, "revenue": 203440, "growth": -3.2, "rating": 4.3, "is_active": True},
    {"id": 6, "name": "Mechanical Keyboard", "category": "Peripherals", "sku": "MK-006", "price": 119.99, "sales": 2210, "revenue": 265200, "growth": 15.6, "rating": 4.9, "is_active": True},
    {"id": 7, "name": "Webcam HD", "category": "Peripherals", "sku": "WC-007", "price": 59.99, "sales": 1987, "revenue": 119220, "growth": -8.1, "rating": 4.1, "is_active": True},
    {"id": 8, "name": "Monitor Arm", "category": "Accessories", "sku": "MA-008", "price": 79.99, "sales": 1654, "revenue": 132320, "growth": 5.4, "rating": 4.4, "is_active": True},
]


@router.get("")
async def get_products(
    category: str = Query(default=None),
    sort_by: str = Query(default="sales"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get all products with analytics."""
    products = DEMO_PRODUCTS
    if category:
        products = [p for p in products if p["category"].lower() == category.lower()]
    return {"products": products, "total": len(products), "page": page, "per_page": per_page}


@router.get("/top")
async def get_top_products(
    limit: int = Query(default=10, ge=1, le=50),
    user=Depends(get_current_user),
):
    """Get top-performing products by sales."""
    sorted_products = sorted(DEMO_PRODUCTS, key=lambda x: x["sales"], reverse=True)[:limit]
    return {"products": sorted_products}


@router.get("/categories")
async def get_categories(
    user=Depends(get_current_user),
):
    """Get product categories with analytics."""
    cats = {}
    for p in DEMO_PRODUCTS:
        c = p["category"]
        if c not in cats:
            cats[c] = {"category": c, "product_count": 0, "total_sales": 0, "total_revenue": 0}
        cats[c]["product_count"] += 1
        cats[c]["total_sales"] += p["sales"]
        cats[c]["total_revenue"] += p["revenue"]
    return {"categories": list(cats.values())}


@router.get("/{product_id}")
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get a single product by ID."""
    for p in DEMO_PRODUCTS:
        if p["id"] == product_id:
            return p
    return {"error": "Product not found"}, 404
