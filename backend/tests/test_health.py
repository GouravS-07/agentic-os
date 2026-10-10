import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Agentic OS"
    assert data["status"] == "online"


@pytest.mark.asyncio
async def test_health_check_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["database"] == "healthy"
    assert "app_name" in data
    assert "environment" in data


@pytest.mark.asyncio
async def test_root_health_endpoint(client: AsyncClient):
    """Verify that root /health aliases /api/v1/health for standard container and developer checks."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["database"] == "healthy"


@pytest.mark.asyncio
async def test_demo_seed_endpoint(client: AsyncClient):
    """Verify that /api/v1/demo/seed populates sample missions, tasks, and memory entries without enum errors."""
    response = await client.post("/api/v1/demo/seed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "seeded"
    assert "Sample missions, tasks, and memory entries seeded successfully" in data["message"]
