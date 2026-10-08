from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, Text, Enum as SQLEnum, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import hashlib
import json
from app.models.base import BaseModel, utc_now
from app.models.enums import ApprovalStatus, RiskLevel


def hash_arguments(args: dict) -> str:
    """Computes a deterministic SHA-256 hash of normalized JSON arguments."""
    normalized_json = json.dumps(args, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(normalized_json.encode('utf-8')).hexdigest()


class Approval(BaseModel):
    __tablename__ = "approvals"

    mission_id = Column(
        String(36),
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    task_id = Column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    agent_id = Column(
        String(36),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    agent_run_id = Column(
        String(36),
        ForeignKey("agent_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    tool_run_id = Column(
        String(36),
        ForeignKey("tool_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    tool_name = Column(String(100), nullable=False)
    arguments = Column(JSON, nullable=False)
    arguments_hash = Column(String(64), nullable=False)
    risk_level = Column(
        SQLEnum(RiskLevel, name="risk_level_enum"),
        nullable=False
    )
    reason = Column(Text, nullable=False)
    status = Column(
        SQLEnum(ApprovalStatus, name="approval_status_enum"),
        default=ApprovalStatus.PENDING,
        nullable=False,
        index=True
    )
    requested_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    decided_by = Column(String(100), nullable=True)
    decision_metadata = Column(JSON, default=dict, nullable=False)

    # Relationships
    mission = relationship("Mission")
    task = relationship("Task")
    agent = relationship("Agent")
    agent_run = relationship("AgentRun")
    tool_run = relationship("ToolRun")
