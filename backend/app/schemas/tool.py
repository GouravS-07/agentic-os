from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import RiskLevel, PermissionAction, ToolRunStatus


class ToolResponse(BaseModel):
    name: str
    version: str
    description: str
    capabilities: List[str]
    default_risk: RiskLevel
    required_permissions: List[str]

    model_config = ConfigDict(from_attributes=True)


class ToolRunResponse(BaseModel):
    id: str
    tool_name: str
    agent_run_id: str
    task_id: Optional[str] = None
    mission_id: str
    input_params: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    status: ToolRunStatus
    risk_level: RiskLevel
    permission_result: PermissionAction
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
