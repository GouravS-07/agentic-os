from datetime import datetime
from sqlalchemy import Column, String, Text, Enum as SQLEnum, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.enums import ToolRunStatus, RiskLevel, PermissionAction


class ToolRun(BaseModel):
    __tablename__ = "tool_runs"

    tool_name = Column(String(100), nullable=False, index=True)
    agent_run_id = Column(
        String(36),
        ForeignKey("agent_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    task_id = Column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    mission_id = Column(
        String(36),
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    input_params = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    status = Column(
        SQLEnum(ToolRunStatus, name="tool_run_status_enum"),
        default=ToolRunStatus.REQUESTED,
        nullable=False,
        index=True
    )
    risk_level = Column(
        SQLEnum(RiskLevel, name="risk_level_enum"),
        default=RiskLevel.LOW,
        nullable=False
    )
    permission_result = Column(
        SQLEnum(PermissionAction, name="permission_action_enum"),
        default=PermissionAction.ALLOW,
        nullable=False
    )
    error = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    run_metadata = Column(JSON, default=dict, nullable=False)

    # Relationships
    agent_run = relationship("AgentRun")
    mission = relationship("Mission")
    task = relationship("Task")
