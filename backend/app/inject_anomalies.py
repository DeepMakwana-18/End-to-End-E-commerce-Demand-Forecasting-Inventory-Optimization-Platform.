import asyncio
import sys
import os

# Add backend dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone
from app.database import async_session
from app.models.anomaly import Anomaly, AnomalyType, AnomalySeverity

async def inject():
    async with async_session() as db:
        anomalies = [
            Anomaly(
                organization_id=1,
                product_id=1,
                anomaly_type=AnomalyType.DEMAND_SPIKE,
                severity=AnomalySeverity.CRITICAL,
                detected_at=datetime.now(timezone.utc),
                event_date="2026-06-01",
                z_score=4.82,
                deviation_pct=48.2,
                expected_value=1000.0,
                actual_value=1482.0,
                explanation="Demand spike on 2026-06-01: actual 1482 units is 48.2% above expected 1000 (z=4.82, severity=critical)",
                is_resolved=False,
            ),
            Anomaly(
                organization_id=1,
                product_id=2,
                anomaly_type=AnomalyType.DEMAND_DROP,
                severity=AnomalySeverity.CRITICAL,
                detected_at=datetime.now(timezone.utc),
                event_date="2026-06-02",
                z_score=-5.12,
                deviation_pct=-62.5,
                expected_value=800.0,
                actual_value=300.0,
                explanation="Demand drop on 2026-06-02: actual 300 units is 62.5% below expected 800 (z=-5.12, severity=critical)",
                is_resolved=False,
            ),
            Anomaly(
                organization_id=1,
                product_id=3,
                anomaly_type=AnomalyType.INVENTORY_SHOCK,
                severity=AnomalySeverity.CRITICAL,
                detected_at=datetime.now(timezone.utc),
                event_date="2026-06-03",
                z_score=-4.55,
                deviation_pct=-45.0,
                expected_value=200.0,
                actual_value=110.0,
                explanation="Inventory shock on 2026-06-03: level 110 deviates 45.0% from rolling average 200 (z=-4.55, severity=critical)",
                is_resolved=False,
            )
        ]
        db.add_all(anomalies)
        await db.commit()
        print("Injected 3 critical anomalies into the DB.")

asyncio.run(inject())
