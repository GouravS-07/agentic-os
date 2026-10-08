from datetime import datetime
from sqlalchemy import Column, String, Text, Enum as SQLEnum, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel, Base, utc_now
from app.models.enums import TaskStatus


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    task_id = Column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
        index=True
    )
    depends_on_task_id = Column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
        index=True
    )
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Task(BaseModel):
    __tablename__ = "tasks"

    mission_id = Column(
        String(36),
        ForeignKey("missions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(
        SQLEnum(TaskStatus, name="task_status_enum"),
        default=TaskStatus.PENDING,
        nullable=False,
        index=True
    )
    priority = Column(Integer, default=2, nullable=False)
    assigned_agent_id = Column(String(50), nullable=True)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    mission = relationship("Mission", back_populates="tasks")
    
    # Dependencies: tasks that this task depends on (incoming prerequisite edges)
    dependencies = relationship(
        "Task",
        secondary="task_dependencies",
        primaryjoin="Task.id == TaskDependency.task_id",
        secondaryjoin="Task.id == TaskDependency.depends_on_task_id",
        backref="dependents",
        lazy="selectin"
    )
