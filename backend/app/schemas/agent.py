from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import AgentType, AgentRunStatus


class AgentResponse(BaseModel):
    id: str
    name: str
    type: AgentType
    description: str
    capabilities: List[str]
    allowed_tools: List[str]
    status: str
    is_implemented: bool

    model_config = ConfigDict(from_attributes=True)


class AgentRunResponse(BaseModel):
    id: str
    agent_id: str
    mission_id: str
    task_id: Optional[str] = None
    status: AgentRunStatus
    model: str
    input_context: Optional[Dict[str, Any]] = None
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanMissionResponse(BaseModel):
    mission_id: str
    plan: Dict[str, Any]
    tasks_created: int
