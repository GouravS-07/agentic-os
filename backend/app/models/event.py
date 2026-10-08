from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Enum as SQLEnum, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel, utc_now
from app.models.enums import EventType


class Event(BaseModel):
    __tablename__ = "events"

    event_type = Column(
        SQLEnum(EventType, name="event_type_enum"),
        nullable=False,
        index=True
    )
    mission_id = Column(
        String(36),
        ForeignKey("missions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    task_id = Column(
        String(36),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    agent_id = Column(
        String(36),
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    agent_run_id = Column(
        String(36),
        ForeignKey("agent_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    tool_run_id = Column(
        String(36),
        ForeignKey("tool_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    approval_id = Column(
        String(36),
        ForeignKey("approvals.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    correlation_id = Column(
        String(64),
        nullable=False,
        index=True
    )
    sequence_number = Column(
        Integer,
        nullable=False,
        index=True
    )
    timestamp = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True
    )
    source = Column(
        String(100),
        default="system",
        nullable=False
    )
    payload = Column(
        JSON,
        default=dict,
        nullable=False
    )

    # Relationships
    mission = relationship("Mission", lazy="select")
    task = relationship("Task", lazy="select")
    agent = relationship("Agent", lazy="select")
    agent_run = relationship("AgentRun", lazy="select")
    tool_run = relationship("ToolRun", lazy="select")
    approval = relationship("Approval", lazy="select")
