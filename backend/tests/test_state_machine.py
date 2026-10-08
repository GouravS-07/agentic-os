import pytest
from app.models.enums import MissionStatus, TaskStatus
from app.models.mission import Mission
from app.models.task import Task
from app.core.state_machine import StateMachine
from app.core.exceptions import InvalidStateTransitionError


def test_valid_mission_transitions():
    mission = Mission(id="m1", title="Test", description="Test", status=MissionStatus.PLANNING)
    
    # PLANNING -> READY
    StateMachine.transition_mission(mission, MissionStatus.READY)
    assert mission.status == MissionStatus.READY

    # READY -> RUNNING
    StateMachine.transition_mission(mission, MissionStatus.RUNNING)
    assert mission.status == MissionStatus.RUNNING
    assert mission.completed_at is None

    # RUNNING -> PAUSED
    StateMachine.transition_mission(mission, MissionStatus.PAUSED)
    assert mission.status == MissionStatus.PAUSED

    # PAUSED -> RUNNING
    StateMachine.transition_mission(mission, MissionStatus.RUNNING)
    assert mission.status == MissionStatus.RUNNING

    # RUNNING -> COMPLETED
    StateMachine.transition_mission(mission, MissionStatus.COMPLETED)
    assert mission.status == MissionStatus.COMPLETED
    assert mission.completed_at is not None


def test_invalid_mission_transitions():
    mission = Mission(id="m1", title="Test", description="Test", status=MissionStatus.PLANNING)
    
    # PLANNING -> COMPLETED directly should fail
    with pytest.raises(InvalidStateTransitionError) as exc:
        StateMachine.transition_mission(mission, MissionStatus.COMPLETED)
    assert exc.value.current_state == "PLANNING"
    assert exc.value.requested_state == "COMPLETED"

    # COMPLETED is terminal
    mission.status = MissionStatus.COMPLETED
    with pytest.raises(InvalidStateTransitionError):
        StateMachine.transition_mission(mission, MissionStatus.RUNNING)


def test_valid_task_transitions():
    task = Task(id="t1", mission_id="m1", title="Task 1", description="Desc", status=TaskStatus.PENDING)

    # PENDING -> READY
    StateMachine.transition_task(task, TaskStatus.READY)
    assert task.status == TaskStatus.READY

    # READY -> RUNNING
    StateMachine.transition_task(task, TaskStatus.RUNNING)
    assert task.status == TaskStatus.RUNNING
    assert task.started_at is not None

    # RUNNING -> COMPLETED
    StateMachine.transition_task(task, TaskStatus.COMPLETED)
    assert task.status == TaskStatus.COMPLETED
    assert task.completed_at is not None


def test_invalid_task_transitions():
    task = Task(id="t1", mission_id="m1", title="Task 1", description="Desc", status=TaskStatus.PENDING)

    # PENDING -> RUNNING directly without becoming READY
    with pytest.raises(InvalidStateTransitionError):
        StateMachine.transition_task(task, TaskStatus.RUNNING)

    # PENDING -> COMPLETED directly
    with pytest.raises(InvalidStateTransitionError):
        StateMachine.transition_task(task, TaskStatus.COMPLETED)
