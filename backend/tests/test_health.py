import pytest
from httpx import AsyncClient, ASGITransport
import asyncio

from app.main import app
from app.core.security import create_access_token

@pytest.fixture
def test_token():
    # Create a valid token for testing authentication endpoints
    return create_access_token({"sub": "1", "email": "test@example.com", "role": "admin", "org_id": 1, "org_slug": "test"})

@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify the health endpoint works without authentication."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data

@pytest.mark.asyncio
async def test_authentication_required():
    """Verify that protected endpoints require a token."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Without token
        response = await ac.get("/api/v1/dashboard/kpis")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_database_and_redis_connectivity(test_token):
    """
    Verify DB and Redis connectivity by hitting the dashboard KPIs endpoint.
    This endpoint queries the DB and uses Redis for caching/rate-limiting.
    """
    headers = {"Authorization": f"Bearer {test_token}"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/dashboard/kpis", headers=headers)
    
    # 200 OK means it successfully queried the DB and used Redis cache/rate limit
    assert response.status_code == 200
    data = response.json()
    assert "total_revenue" in data
    assert "total_products" in data
