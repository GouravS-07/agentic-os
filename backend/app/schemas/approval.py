from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import ApprovalStatus, RiskLevel


class ApprovalDecisionRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Optional note or explanation for the human decision")
    decided_by: Optional[str] = Field("user_operator", description="Operator identifier")


class ApprovalResponse(BaseModel):
    id: str
    mission_id: str
    task_id: str
    agent_id: str
    agent_run_id: str
    tool_run_id: str
    tool_name: str
    arguments: Dict[str, Any]
    risk_level: RiskLevel
    reason: str
    status: ApprovalStatus
    requested_at: datetime
    decided_at: Optional[datetime] = None
    expires_at: datetime
    decided_by: Optional[str] = None
    decision_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovalListResponse(BaseModel):
    total: int
    items: List[ApprovalResponse]
