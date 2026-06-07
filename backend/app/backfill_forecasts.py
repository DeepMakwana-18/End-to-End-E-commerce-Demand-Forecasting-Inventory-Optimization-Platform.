import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import async_session
from app.repositories.forecast_repo import ModelVersionRepository
from app.services.ml_service import forecast_model
from sqlalchemy import delete
from app.models import Forecast
from dateutil import parser

async def backfill():
    async with async_session() as db:
        mv_repo = ModelVersionRepository(db, 1)
        active_model = await mv_repo.get_active()

        if not active_model:
            print("No active model found!")
            return

        print(f"Loading model from {active_model.model_path}")
        forecast_model.load(active_model.model_path)
        forecasts = forecast_model.predict(weeks_ahead=12)

        print("Deleting old org-level forecasts...")
        await db.execute(delete(Forecast).where(Forecast.organization_id == 1, Forecast.product_id == None))
        
        hist_records = []
        print(f"Inserting {len(forecast_model.historical_data)} historical actuals...")
        for row in forecast_model.historical_data:
            dt = parser.parse(row["date"])
            hist_records.append(Forecast(
                organization_id=1,
                product_id=None,
                forecast_date=dt,
                predicted_demand=0.0,
                actual_demand=float(row["demand"]),
                model_version_id=active_model.id,
                model_version=active_model.version_tag,
            ))

        print(f"Inserting {len(forecasts)} future predictions...")
        for row in forecasts:
            dt = parser.parse(row["date"])
            hist_records.append(Forecast(
                organization_id=1,
                product_id=None,
                forecast_date=dt,
                predicted_demand=float(row["predicted_demand"]),
                actual_demand=None,
                confidence_lower=float(row.get("lower_bound", 0.0)),
                confidence_upper=float(row.get("upper_bound", 0.0)),
                model_version_id=active_model.id,
                model_version=active_model.version_tag,
            ))

        if hist_records:
            db.add_all(hist_records)
            await db.commit()
            print("Successfully backfilled forecasts into DB!")

asyncio.run(backfill())
