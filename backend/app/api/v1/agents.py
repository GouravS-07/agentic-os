from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.runtime.agent_registry import AgentRegistry
from app.models.agent import AgentRun
from app.schemas.agent import AgentResponse, AgentRunResponse

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get("", response_model=List[AgentResponse])
async def list_agents():
    agents = AgentRegistry.list_all()
    return [
        AgentResponse(
            id=a.agent_id,
            name=a.name,
            type=a.agent_type,
            description=a.description,
            capabilities=a.capabilities,
            allowed_tools=a.allowed_tools,
            status="idle",
            is_implemented=a.is_implemented,
        )
        for a in agents
    ]


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    agent = AgentRegistry.get(agent_id)
    return AgentResponse(
        id=agent.agent_id,
        name=agent.name,
        type=agent.agent_type,
        description=agent.description,
        capabilities=agent.capabilities,
        allowed_tools=agent.allowed_tools,
        status="idle",
        is_implemented=agent.is_implemented,
    )


@router.get("/{agent_id}/runs", response_model=List[AgentRunResponse])
async def list_agent_runs(
    agent_id: str,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AgentRun).where(AgentRun.agent_id == agent_id).order_by(AgentRun.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    runs = list(res.scalars().all())
    return [
        AgentRunResponse(
            id=r.id,
            agent_id=r.agent_id,
            mission_id=r.mission_id,
            task_id=r.task_id,
            status=r.status,
            model=r.model,
            input_context=r.input_context,
            output=r.output,
            error=r.error,
            retry_count=r.retry_count,
            started_at=r.started_at,
            completed_at=r.completed_at,
            created_at=r.created_at,
        )
        for r in runs
    ]
