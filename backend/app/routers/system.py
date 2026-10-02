from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_tenant_context
from app.core.tenant import TenantContext
from app.models import ModelVersion, Inventory, Product, InventoryAlert, UploadedFile

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/status")
async def get_system_status(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_tenant_context),
):
    """
    Get the canonical business state for the entire application.
    This serves as the single source of truth for all frontend empty states.
    """
    # 1. Dataset Exists
    dataset_exists = await db.scalar(
        select(func.count(UploadedFile.id))
        .where(UploadedFile.organization_id == tenant.org_id)
        .where(UploadedFile.status == "completed")
    )
    dataset_exists = (dataset_exists or 0) > 0

    # 2. Products Exist
    products_exist = await db.scalar(
        select(func.count(Product.id))
        .where(Product.organization_id == tenant.org_id)
    )
    products_exist = (products_exist or 0) > 0

    # 3. Inventory Exists
    inventory_exists = await db.scalar(
        select(func.count(Inventory.id))
        .where(Inventory.organization_id == tenant.org_id)
    )
    inventory_exists = (inventory_exists or 0) > 0

    # 4. Categories Exist (distinct categories from products)
    categories_exist = await db.scalar(
        select(func.count(func.distinct(Product.category)))
        .where(Product.organization_id == tenant.org_id)
    )
    categories_exist = (categories_exist or 0) > 0

    # 5. Alerts Exist
    alerts_exist = await db.scalar(
        select(func.count(InventoryAlert.id))
        .where(InventoryAlert.organization_id == tenant.org_id)
    )
    alerts_exist = (alerts_exist or 0) > 0

    # 6. Model Exists (and contract)
    mv = await db.scalar(
        select(ModelVersion)
        .where(ModelVersion.organization_id == tenant.org_id)
        .where(ModelVersion.is_active == True)
        .where(ModelVersion.model_path != None)
        .order_by(ModelVersion.created_at.desc())
        .limit(1)
    )

    if mv:
        model_info = {
            "has_model": True,
            "model_version": mv.version_tag,
            "accuracy": mv.accuracy,
            "rmse": mv.rmse,
            "training_samples": mv.training_samples,
            "feature_importance": mv.feature_importance or {},
            "trained_at": mv.created_at.isoformat() if mv.created_at else None,
        }
    else:
        model_info = {
            "has_model": False,
            "model_version": None,
            "accuracy": None,
            "rmse": None,
            "training_samples": 0,
            "feature_importance": {},
            "trained_at": None,
        }

    return {
        "dataset_exists": dataset_exists,
        "products_exist": products_exist,
        "inventory_exists": inventory_exists,
        "categories_exist": categories_exist,
        "alerts_exist": alerts_exist,
        "model_info": model_info
    }
