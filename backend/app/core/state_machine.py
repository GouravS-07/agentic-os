from typing import Dict, Set
from datetime import datetime, timezone
from app.models.enums import MissionStatus, TaskStatus
from app.models.mission import Mission
from app.models.task import Task
from app.core.exceptions import InvalidStateTransitionError


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Explicit Valid State Transitions
VALID_MISSION_TRANSITIONS: Dict[MissionStatus, Set[MissionStatus]] = {
    MissionStatus.PLANNING: {MissionStatus.READY, MissionStatus.RUNNING, MissionStatus.WAITING_APPROVAL, MissionStatus.CANCELLED},
    MissionStatus.READY: {MissionStatus.RUNNING, MissionStatus.WAITING_APPROVAL, MissionStatus.CANCELLED},
    MissionStatus.RUNNING: {
        MissionStatus.PAUSED,
        MissionStatus.WAITING_APPROVAL,
        MissionStatus.FAILED,
        MissionStatus.COMPLETED,
        MissionStatus.CANCELLED,
    },
    MissionStatus.PAUSED: {MissionStatus.RUNNING, MissionStatus.CANCELLED},
    MissionStatus.WAITING_APPROVAL: {MissionStatus.RUNNING, MissionStatus.CANCELLED, MissionStatus.FAILED},
    MissionStatus.FAILED: {MissionStatus.PLANNING, MissionStatus.READY, MissionStatus.RUNNING, MissionStatus.WAITING_APPROVAL, MissionStatus.CANCELLED},
    MissionStatus.COMPLETED: set(),
    MissionStatus.CANCELLED: set(),
}

VALID_TASK_TRANSITIONS: Dict[TaskStatus, Set[TaskStatus]] = {
    TaskStatus.PENDING: {TaskStatus.READY, TaskStatus.CANCELLED},
    TaskStatus.READY: {TaskStatus.RUNNING, TaskStatus.PENDING, TaskStatus.CANCELLED},
    TaskStatus.RUNNING: {
        TaskStatus.READY,
        TaskStatus.COMPLETED,
        TaskStatus.FAILED,
        TaskStatus.WAITING_APPROVAL,
        TaskStatus.CANCELLED,
    },
    TaskStatus.WAITING_APPROVAL: {TaskStatus.READY, TaskStatus.RUNNING, TaskStatus.CANCELLED},
    TaskStatus.FAILED: {TaskStatus.READY, TaskStatus.PENDING, TaskStatus.CANCELLED},
    TaskStatus.COMPLETED: set(),
    TaskStatus.CANCELLED: set(),
}


class StateMachine:
    @staticmethod
    def transition_mission(mission: Mission, target_status: MissionStatus) -> Mission:
        current_status = mission.status
        if current_status == target_status:
            return mission

        allowed = VALID_MISSION_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            raise InvalidStateTransitionError(
                entity_type="Mission",
                current_state=current_status.value,
                requested_state=target_status.value,
                allowed_states=[s.value for s in allowed]
            )

        mission.status = target_status
        mission.updated_at = utc_now()

        if target_status in (MissionStatus.COMPLETED, MissionStatus.FAILED, MissionStatus.CANCELLED):
            mission.completed_at = utc_now()
        elif target_status == MissionStatus.RUNNING and mission.completed_at is not None:
            mission.completed_at = None

        return mission

    @staticmethod
    def transition_task(task: Task, target_status: TaskStatus) -> Task:
        current_status = task.status
        if current_status == target_status:
            return task

        allowed = VALID_TASK_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            raise InvalidStateTransitionError(
                entity_type="Task",
                current_state=current_status.value,
                requested_state=target_status.value,
                allowed_states=[s.value for s in allowed]
            )

        task.status = target_status
        task.updated_at = utc_now()

        if target_status == TaskStatus.RUNNING and task.started_at is None:
            task.started_at = utc_now()
        elif target_status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
            task.completed_at = utc_now()

        return task
