from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.tools.registry import ToolRegistry
from app.models.tool import ToolRun
from app.schemas.tool import ToolResponse, ToolRunResponse

router = APIRouter(prefix="/tools", tags=["Tools"])


@router.get("", response_model=List[ToolResponse])
async def list_tools():
    tools = ToolRegistry.list_all()
    return [
        ToolResponse(
            name=t.name,
            version=t.version,
            description=t.description,
            capabilities=t.capabilities,
            default_risk=t.default_risk,
            required_permissions=t.required_permissions,
        )
        for t in tools
    ]


@router.get("/{tool_name}", response_model=ToolResponse)
async def get_tool(tool_name: str):
    tool = ToolRegistry.get(tool_name)
    return ToolResponse(
        name=tool.name,
        version=tool.version,
        description=tool.description,
        capabilities=tool.capabilities,
        default_risk=tool.default_risk,
        required_permissions=tool.required_permissions,
    )


@router.get("/runs/history", response_model=List[ToolRunResponse])
async def list_tool_runs(
    mission_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ToolRun)
    if mission_id:
        stmt = stmt.where(ToolRun.mission_id == mission_id)
    stmt = stmt.order_by(ToolRun.created_at.desc()).limit(limit)

    res = await db.execute(stmt)
    runs = list(res.scalars().all())
    return [
        ToolRunResponse(
            id=r.id,
            tool_name=r.tool_name,
            agent_run_id=r.agent_run_id,
            task_id=r.task_id,
            mission_id=r.mission_id,
            input_params=r.input_params,
            output_data=r.output_data,
            status=r.status,
            risk_level=r.risk_level,
            permission_result=r.permission_result,
            error=r.error,
            started_at=r.started_at,
            completed_at=r.completed_at,
            duration_ms=r.duration_ms,
            created_at=r.created_at,
        )
        for r in runs
    ]
