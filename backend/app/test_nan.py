import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import settings
from sqlalchemy import text

async def test():
    engine = create_async_engine(settings.DATABASE_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as db:
        r = await db.execute(text("SELECT id FROM anomalies WHERE actual_value = 'NaN'::float OR expected_value = 'NaN'::float OR deviation_pct = 'NaN'::float OR z_score = 'NaN'::float"))
        rows = r.fetchall()
        print(f'NaN Anomalies found: {len(rows)}')
    await engine.dispose()

asyncio.run(test())
