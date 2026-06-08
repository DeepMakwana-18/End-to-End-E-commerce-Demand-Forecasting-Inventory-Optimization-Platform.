"""
Retrain the model on synthetic seasonal data with real variance so
lag features are actually predictive (producing nonzero SHAP delta on scenarios).
"""
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

async def main():
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker

    # Generate 104-week seasonal demand series with trend + seasonality
    np.random.seed(42)
    start = datetime(2022, 1, 3)
    n_weeks = 104
    dates = [start + timedelta(weeks=i) for i in range(n_weeks)]
    demand = []
    for i, dt in enumerate(dates):
        week = dt.isocalendar()[1]
        # Strong seasonal signal + upward trend + noise
        seasonal = 5000 * np.sin(2 * np.pi * week / 52) + 20000
        trend = i * 150
        noise = np.random.normal(0, 1500)
        demand.append(max(100, seasonal + trend + noise))

    df = pd.DataFrame({
        'date': [d.strftime('%Y-%m-%d') for d in dates],
        'demand': [round(d, 0) for d in demand]
    })

    csv_text = df.to_csv(index=False)
    print(f"Generated {len(df)} rows of seasonal demand data")
    print(f"Demand range: {df['demand'].min():.0f} to {df['demand'].max():.0f}")

    # Trigger retrain via HTTP
    import httpx
    # Get token
    r = await httpx.AsyncClient().post(
        'http://localhost:8001/api/v1/auth/login',
        json={'email': 'admin@titan.demo', 'password': 'admin123'}
    )
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    retrain_r = await httpx.AsyncClient(timeout=120).post(
        'http://localhost:8001/api/v1/forecast/retrain',
        json={'csv_text': csv_text, 'filename': 'seasonal_shap_test.csv'},
        headers=headers
    )
    print("Retrain response:", retrain_r.json())


asyncio.run(main())
