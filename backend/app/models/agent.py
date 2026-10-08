from datetime import datetime
from sqlalchemy import Column, String, Text, Enum as SQLEnum, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.enums import AgentType, AgentRunStatus


class Agent(BaseModel):
    __tablename__ = "agents"

    name = Column(String(100), nullable=False)
    type = Column(
        SQLEnum(AgentType, name="agent_type_enum"),
        nullable=False,
        unique=True,
        index=True
    )
    description = Column(Text, nullable=False)
    system_prompt = Column(Text, nullable=False)
    capabilities = Column(JSON, default=list, nullable=False)
    allowed_tools = Column(JSON, default=list, nullable=False)
    configuration = Column(JSON, default=dict, nullable=False)
    status = Column(String(50), default="idle", nullable=False)
    is_implemented = Column(Boolean, default=False, nullable=False)

    # Relationships
    runs = relationship("AgentRun", back_populates="agent", cascade="all, delete-orphan", lazy="selectin")


class AgentRun(BaseModel):
    __tablename__ = "agent_runs"

    agent_id = Column(
        String(36),
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    mission_id = Column(
        String(36),
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    task_id = Column(
        String(36),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    status = Column(
        SQLEnum(AgentRunStatus, name="agent_run_status_enum"),
        default=AgentRunStatus.PENDING,
        nullable=False,
        index=True
    )
    input_context = Column(JSON, nullable=True)
    model = Column(String(100), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    output = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    run_metadata = Column(JSON, default=dict, nullable=False)

    # Relationships
    agent = relationship("Agent", back_populates="runs")
    mission = relationship("Mission")
    task = relationship("Task")
