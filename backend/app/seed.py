"""
Seed script — bootstraps demo data for local development.

Run: python -m app.seed
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, async_session, init_db
from app.models import (
    Organization, Workspace, User, Product, Warehouse,
    Inventory, Sale, InventoryAlert, UserRole,
    InventoryStatus, AlertType, AlertSeverity,
)
from app.core.security import hash_password
from datetime import datetime, timedelta, timezone
import random


async def seed():
    print("🌱 Seeding database...")

    await init_db()

    async with async_session() as session:
        # Check if already seeded
        from sqlalchemy import select, func
        count = (await session.execute(select(func.count(Organization.id)))).scalar()
        if count and count > 0:
            print("⚠️  Database already has data. Skipping seed.")
            return

        # ── Organization ────────────────────────────────────────
        org = Organization(
            name="Titan Demo Corp",
            slug="titan-demo",
            subscription_tier="professional",
        )
        session.add(org)
        await session.flush()
        await session.refresh(org)
        print(f"  ✅ Organization: {org.name} (id={org.id})")

        # ── Workspace ───────────────────────────────────────────
        ws = Workspace(
            organization_id=org.id,
            name="Default Workspace",
            is_default=True,
        )
        session.add(ws)

        # ── Users ───────────────────────────────────────────────
        users_data = [
            ("Admin User", "admin@titan.demo", UserRole.ORG_ADMIN, "admin123!"),
            ("Jane Analyst", "jane@titan.demo", UserRole.ANALYST, "analyst123!"),
            ("Bob Viewer", "bob@titan.demo", UserRole.VIEWER, "viewer123!"),
        ]
        users = []
        for name, email, role, password in users_data:
            u = User(
                organization_id=org.id,
                email=email,
                name=name,
                role=role,
                password_hash=hash_password(password),
            )
            session.add(u)
            users.append(u)
        await session.flush()
        print(f"  ✅ Users: {len(users)} created (admin@titan.demo / admin123!)")

        # ── Warehouses ──────────────────────────────────────────
        warehouses_data = [
            ("East Coast Hub", "New York, NY", 40.7128, -74.0060, 10000),
            ("West Coast Hub", "Los Angeles, CA", 34.0522, -118.2437, 15000),
            ("Central Hub", "Chicago, IL", 41.8781, -87.6298, 8000),
        ]
        warehouses = []
        for name, loc, lat, lng, cap in warehouses_data:
            w = Warehouse(
                organization_id=org.id,
                name=name, location=loc,
                latitude=lat, longitude=lng, capacity=cap,
            )
            session.add(w)
            warehouses.append(w)
        await session.flush()
        print(f"  ✅ Warehouses: {len(warehouses)} created")

        # ── Products ────────────────────────────────────────────
        products_data = [
            ("Wireless Headphones", "Electronics", "WH-001", 69.99, 32.00),
            ("Smart Watch Pro", "Electronics", "SW-002", 149.99, 68.00),
            ("USB-C Hub", "Electronics", "UC-003", 39.99, 15.00),
            ("Laptop Stand", "Accessories", "LS-004", 59.99, 22.00),
            ("Bluetooth Speaker", "Electronics", "BS-005", 79.99, 35.00),
            ("Mechanical Keyboard", "Peripherals", "MK-006", 119.99, 48.00),
            ("Webcam HD", "Peripherals", "WC-007", 59.99, 25.00),
            ("Monitor Arm", "Accessories", "MA-008", 79.99, 30.00),
            ("Noise Cancelling Earbuds", "Electronics", "NCE-009", 129.99, 55.00),
            ("Ergonomic Mouse", "Peripherals", "EM-010", 49.99, 18.00),
        ]
        products = []
        for name, cat, sku, price, cost in products_data:
            p = Product(
                organization_id=org.id,
                name=name, category=cat, sku=sku, price=price, cost=cost,
            )
            session.add(p)
            products.append(p)
        await session.flush()
        for p in products:
            await session.refresh(p)
        print(f"  ✅ Products: {len(products)} created")

        # ── Sales (last 6 months, weekly) ───────────────────────
        now = datetime.now(timezone.utc)
        sales_count = 0
        for product in products:
            for week in range(26):
                date = now - timedelta(weeks=25 - week)
                base_qty = random.randint(10, 80)
                # Add seasonality
                seasonal = int(15 * (1 + 0.5 * (week % 13 - 6.5) / 6.5))
                qty = max(1, base_qty + seasonal)
                revenue = round(qty * product.price, 2)

                sale = Sale(
                    organization_id=org.id,
                    product_id=product.id,
                    warehouse_id=random.choice(warehouses).id,
                    date=date,
                    quantity=qty,
                    revenue=revenue,
                )
                session.add(sale)
                sales_count += 1

        await session.flush()
        print(f"  ✅ Sales: {sales_count} records (26 weeks × {len(products)} products)")

        # ── Inventory ───────────────────────────────────────────
        inventory_configs = [
            (0, 45, 80, 120, 14, InventoryStatus.CRITICAL, 32),
            (1, 580, 150, 200, 21, InventoryStatus.OVERSTOCK, 55),
            (2, 12, 50, 80, 7, InventoryStatus.CRITICAL, 15),
            (3, 89, 60, 95, 14, InventoryStatus.LOW, 68),
            (4, 3, 40, 65, 14, InventoryStatus.CRITICAL, 5),
            (5, 245, 80, 120, 21, InventoryStatus.HEALTHY, 92),
            (6, 167, 50, 80, 14, InventoryStatus.HEALTHY, 88),
            (7, 78, 40, 70, 7, InventoryStatus.LOW, 72),
            (8, 150, 60, 100, 14, InventoryStatus.HEALTHY, 85),
            (9, 95, 45, 75, 14, InventoryStatus.HEALTHY, 80),
        ]
        for idx, stock, safety, rop, lead, stat, health in inventory_configs:
            inv = Inventory(
                organization_id=org.id,
                product_id=products[idx].id,
                warehouse_id=warehouses[idx % len(warehouses)].id,
                current_stock=stock,
                safety_stock=safety,
                reorder_point=rop,
                lead_time_days=lead,
                status=stat,
                health_score=health,
            )
            session.add(inv)

        await session.flush()
        print(f"  ✅ Inventory: {len(inventory_configs)} records")

        # ── Alerts ──────────────────────────────────────────────
        alerts_data = [
            (4, AlertType.STOCKOUT, AlertSeverity.CRITICAL, "Stockout imminent. Current: 3, Daily Demand: 15"),
            (2, AlertType.LOW_STOCK, AlertSeverity.CRITICAL, "Critical stock level. Current: 12, Safety Stock: 50"),
            (0, AlertType.REORDER, AlertSeverity.HIGH, "Below reorder point. Current: 45, ROP: 120"),
            (3, AlertType.REORDER, AlertSeverity.MEDIUM, "Approaching reorder point. Current: 89, ROP: 95"),
            (1, AlertType.OVERSTOCK, AlertSeverity.LOW, "Overstock detected. Current: 580, Max: 400"),
        ]
        for idx, atype, severity, msg in alerts_data:
            alert = InventoryAlert(
                organization_id=org.id,
                product_id=products[idx].id,
                alert_type=atype,
                severity=severity,
                message=msg,
            )
            session.add(alert)

        await session.flush()
        print(f"  ✅ Alerts: {len(alerts_data)} created")

        await session.commit()

    print("🎉 Seed complete!")
    print("   Login: admin@titan.demo / admin123!")


if __name__ == "__main__":
    asyncio.run(seed())
