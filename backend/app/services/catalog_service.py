import logging
import json
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models import Product, Inventory, InventoryStatus, Warehouse, Sale

logger = logging.getLogger("titan.catalog_service")

async def sync_catalog_from_upload(db: AsyncSession, org_id: int, df: pd.DataFrame, mappings_str: str | None, detection: dict | None = None):
    """
    Auto-populates the Products and Inventory tables based on the uploaded historical dataset.
    Idempotent operation (skips existing SKUs).
    """
    mapping = {}
    if mappings_str:
        try:
            frontend_mappings = json.loads(mappings_str)
            mapping["sku"] = frontend_mappings.get("product_sku")
            mapping["category"] = frontend_mappings.get("category")
            mapping["revenue"] = frontend_mappings.get("unit_price")
        except Exception as e:
            logger.warning(f"[org:{org_id}] Could not parse mappings_str: {e}")
            
    if not mapping.get("sku") and detection:
        mapping["sku"] = detection.get("mapping", {}).get("sku")
    if not mapping.get("category") and detection:
        mapping["category"] = detection.get("mapping", {}).get("category")
    if not mapping.get("revenue") and detection:
        mapping["revenue"] = detection.get("mapping", {}).get("revenue")

    sku_col = mapping.get("sku")
    category_col = mapping.get("category")
    price_col = mapping.get("revenue")

    if not sku_col or sku_col not in df.columns:
        with open("/app/catalog_debug_skip1.txt", "w") as f:
            f.write(f"sku_col={sku_col}\n")
            f.write(f"df.columns={list(df.columns)}\n")
        logger.warning(f"[org:{org_id}] No SKU column found. sku_col={sku_col}. df.columns={list(df.columns)}. Skipping catalog auto-generation.")
        return

    # To get the most recent price/category, we just take the last occurrence of each SKU in the dataframe
    # Assuming dataframe is somewhat chronological, or we can just drop duplicates.
    unique_products_df = df.drop_duplicates(subset=[sku_col], keep="last")
    
    # Fetch existing SKUs for idempotency
    existing_skus_result = await db.execute(
        select(Product.sku).where(Product.organization_id == org_id)
    )
    existing_skus = {row[0] for row in existing_skus_result.all()}

    new_products_to_add = []
    for _, row in unique_products_df.iterrows():
        sku_val = str(row[sku_col]).strip()
        if not sku_val or sku_val == 'nan' or sku_val in existing_skus:
            continue
            
        cat_val = str(row[category_col]).strip() if category_col and category_col in df.columns and pd.notna(row[category_col]) else "Uncategorized"
        if cat_val == 'nan':
            cat_val = "Uncategorized"
            
        try:
            price_val = float(row[price_col]) if price_col and price_col in df.columns and pd.notna(row[price_col]) else 0.0
        except Exception:
            price_val = 0.0
            
        new_products_to_add.append(
            Product(
                organization_id=org_id,
                name=f"Product {sku_val}",
                category=cat_val,
                sku=sku_val,
                price=price_val,
                is_active=True
            )
        )
        existing_skus.add(sku_val)
        
    if not new_products_to_add:
        logger.info(f"[org:{org_id}] No new products to create.")
    else:
        db.add_all(new_products_to_add)
        await db.flush()
        logger.info(f"[org:{org_id}] Created {len(new_products_to_add)} new products.")
    
    # Ensure warehouse exists
    warehouse_result = await db.execute(
        select(Warehouse).where(Warehouse.organization_id == org_id).limit(1)
    )
    warehouse = warehouse_result.scalar_one_or_none()
    
    if not warehouse:
        warehouse = Warehouse(
            organization_id=org_id,
            name="Main Warehouse",
            location="Headquarters",
            is_active=True
        )
        db.add(warehouse)
        await db.flush()
        logger.info(f"[org:{org_id}] Created default Main Warehouse.")
        
    # Create inventory records (Defaulting to 0 stock as per business rules for missing data)
    inventory_to_add = []
    for p in new_products_to_add:
        inventory_to_add.append(
            Inventory(
                organization_id=org_id,
                product_id=p.id,
                warehouse_id=warehouse.id,
                current_stock=0,
                safety_stock=50,
                reorder_point=100,
                lead_time_days=14,
                status=InventoryStatus.HEALTHY,
                health_score=100
            )
        )
        
    db.add_all(inventory_to_add)
    await db.flush()
    logger.info(f"[org:{org_id}] Created {len(inventory_to_add)} new inventory records.")

    # Ingest historical sales from the dataset
    date_col = detection.get("mapping", {}).get("date") if detection else None
    demand_col = detection.get("mapping", {}).get("demand") if detection else None

    # We need to find the column names if not provided in detection mapping,
    # but the calling function (retraining_tasks.py) renames columns to "date" and "demand",
    # except it passes the RAW dataframe here. Wait, actually retraining_tasks passes
    # the dataframe BEFORE renaming. We must find date_col and demand_col.
    if not date_col:
        date_col = detection.get("date_column") if detection else None
    if not demand_col:
        demand_col = detection.get("demand_column") if detection else None

    if not date_col or not demand_col or date_col not in df.columns or demand_col not in df.columns:
        logger.warning(f"[org:{org_id}] Missing date or demand column (date={date_col}, demand={demand_col}). df columns: {list(df.columns)}. Skipping Sale ingestion.")
        return

    with open("/app/catalog_debug.txt", "w") as f:
        f.write(f"sku_col={sku_col}\n")
        f.write(f"df columns={list(df.columns)}\n")
        f.write(f"date_col={date_col}\n")
        f.write(f"demand_col={demand_col}\n")
        f.write(f"mapping={mapping}\n")

    logger.info(f"[org:{org_id}] Starting sales ingestion. df has {len(df)} rows. date_col={date_col}, demand_col={demand_col}, sku_col={sku_col}, price_col={price_col}")

    # Delete existing sales for this organization to replace with the new dataset
    await db.execute(delete(Sale).where(Sale.organization_id == org_id))

    # Fetch all products to map SKU to Product ID
    products_result = await db.execute(select(Product.id, Product.sku).where(Product.organization_id == org_id))
    sku_to_id = {row.sku: row.id for row in products_result.all()}

    sales_to_add = []
    for _, row in df.iterrows():
        sku_val = str(row[sku_col]).strip()
        pid = sku_to_id.get(sku_val)
        if pid:
            try:
                qty = int(row[demand_col])
                price = float(row[price_col]) if price_col and price_col in df.columns and pd.notna(row[price_col]) else 0.0
                date_val = pd.to_datetime(row[date_col]).to_pydatetime()
                sales_to_add.append(
                    Sale(
                        organization_id=org_id,
                        product_id=pid,
                        warehouse_id=warehouse.id,
                        date=date_val,
                        quantity=qty,
                        revenue=qty * price
                    )
                )
            except Exception as e:
                logger.error(f"[org:{org_id}] Failed to parse sale row: {e}")
                continue

    logger.info(f"[org:{org_id}] Finished parsing. Ready to bulk insert {len(sales_to_add)} sales.")

    # Bulk insert sales in chunks
    chunk_size = 2000
    for i in range(0, len(sales_to_add), chunk_size):
        db.add_all(sales_to_add[i:i + chunk_size])
    
    await db.flush()
    logger.info(f"[org:{org_id}] Ingested {len(sales_to_add)} historical sales records.")
