from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from app.models.enums import AgentType


class PlannedTask(BaseModel):
    title: str = Field(..., min_length=1, description="Task title")
    description: str = Field(..., min_length=1, description="Detailed task instructions")
    assigned_agent_type: AgentType = Field(default=AgentType.EXECUTOR, description="Recommended agent role")
    priority: int = Field(default=2, ge=1, le=4)
    dependencies: List[int] = Field(
        default_factory=list,
        description="0-indexed list of prerequisite task indices in this plan"
    )


class PlanOutput(BaseModel):
    goal: str = Field(..., min_length=1, description="Understood mission goal")
    summary: str = Field(..., min_length=1, description="Execution strategy summary")
    tasks: List[PlannedTask] = Field(..., min_length=1, description="Ordered list of tasks")


class AgentDecision(BaseModel):
    """
    Structured decision produced by an Agent before execution.
    The agent NEVER directly executes anything; it submits a structured decision.
    """
    action: Literal["complete", "tool_request", "replan", "fail"] = Field(
        ...,
        description="The decision action type"
    )
    result: Optional[Dict[str, Any]] = Field(
        None,
        description="Output payload if action is 'complete'"
    )
    tool: Optional[str] = Field(
        None,
        description="Tool name if action is 'tool_request'"
    )
    arguments: Optional[Dict[str, Any]] = Field(
        None,
        description="Tool arguments if action is 'tool_request'"
    )
    reason: Optional[str] = Field(
        None,
        description="Explanation or failure reason"
    )
