from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="operational" if db_status == "healthy" else "degraded",
        app_name=settings.APP_NAME,
        environment=settings.APP_ENV,
        database=db_status,
        llm_provider=settings.LLM_PROVIDER,
        details={
            "debug": settings.DEBUG,
            "workspace_root": settings.WORKSPACE_ROOT,
            "permission_policy": settings.DEFAULT_PERMISSION_POLICY,
        }
    )
