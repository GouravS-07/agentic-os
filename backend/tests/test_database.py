import pytest
from sqlalchemy import text


@pytest.mark.asyncio
async def test_database_connection(client):
    from app.database import get_db
    # Test through dependency override
    from tests.conftest import TestAsyncSessionLocal
    async with TestAsyncSessionLocal() as session:
        result = await session.execute(text("SELECT 1"))
        assert result.scalar() == 1
