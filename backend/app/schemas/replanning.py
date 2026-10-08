from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from app.models.enums import FailureCategory, Recoverability, ReplanStrategy, AgentType


class FailureAnalysisResult(BaseModel):
    category: FailureCategory
    likely_cause: str = Field(..., description="Root cause explanation")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    affected_task_id: str
    recoverability: Recoverability
    suggested_action: ReplanStrategy
    details: Optional[Dict[str, Any]] = None


class RecoveryTaskSpec(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    assigned_agent_type: AgentType = Field(default=AgentType.EXECUTOR)
    priority: int = Field(default=2, ge=1, le=4)
    dependencies: List[str] = Field(default_factory=list, description="Task IDs this recovery task depends on")


class ReplanDecision(BaseModel):
    action: Literal["retry", "create_recovery_task", "modify_plan", "change_agent", "request_human", "abort"]
    strategy: ReplanStrategy
    reason: str = Field(..., min_length=1, description="Rationale for replanning decision")
    tasks: List[RecoveryTaskSpec] = Field(default_factory=list, description="New or recovery tasks to add")
    metadata: Optional[Dict[str, Any]] = None


class PlanRevisionResponse(BaseModel):
    id: str
    mission_id: str
    version: int
    parent_version: Optional[int] = None
    strategy: ReplanStrategy
    reason: str
    plan_snapshot: Dict[str, Any]
    created_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanRevisionListResponse(BaseModel):
    items: List[PlanRevisionResponse]
    total: int = Field(default=0)
