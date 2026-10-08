import pytest
from app.models.enums import TaskStatus
from app.models.task import Task
from app.core.dag_engine import DAGEngine
from app.core.exceptions import DependencyCycleError, SelfDependencyError, InvalidDependencyError


def test_self_dependency_detection():
    with pytest.raises(SelfDependencyError):
        DAGEngine.validate_dependency(
            task_id="task_A",
            depends_on_task_id="task_A",
            task_ids={"task_A", "task_B"},
            existing_dependencies=[]
        )


def test_circular_dependency_detection():
    # A depends on B
    existing = [("task_A", "task_B")]
    task_ids = {"task_A", "task_B"}

    # Attempting to make B depend on A should trigger DependencyCycleError
    with pytest.raises(DependencyCycleError):
        DAGEngine.validate_dependency(
            task_id="task_B",
            depends_on_task_id="task_A",
            task_ids=task_ids,
            existing_dependencies=existing
        )


def test_complex_dag_progression():
    """
    Graph Specification:
    A -> B -> C
    A -> D
    B + D -> E
    
    Dependencies represented as (dependent_task, prerequisite_task):
    - B depends on A: ("B", "A")
    - C depends on B: ("C", "B")
    - D depends on A: ("D", "A")
    - E depends on B: ("E", "B")
    - E depends on D: ("E", "D")
    """
    tasks = [
        Task(id="A", mission_id="m1", title="Task A", description="", status=TaskStatus.PENDING),
        Task(id="B", mission_id="m1", title="Task B", description="", status=TaskStatus.PENDING),
        Task(id="C", mission_id="m1", title="Task C", description="", status=TaskStatus.PENDING),
        Task(id="D", mission_id="m1", title="Task D", description="", status=TaskStatus.PENDING),
        Task(id="E", mission_id="m1", title="Task E", description="", status=TaskStatus.PENDING),
    ]
    dependencies = [
        ("B", "A"),
        ("C", "B"),
        ("D", "A"),
        ("E", "B"),
        ("E", "D"),
    ]

    # 1. Initially, only A has 0 prerequisites, so only A should be newly ready
    ready, blocked = DAGEngine.evaluate_task_readiness(tasks, dependencies)
    ready_ids = [t.id for t in ready]
    blocked_ids = [t.id for t in blocked]
    assert ready_ids == ["A"]
    assert set(blocked_ids) == {"B", "C", "D", "E"}

    # 2. Mark A as COMPLETED
    tasks[0].status = TaskStatus.COMPLETED

    # Now evaluating should unlock B and D (both depend only on A)
    ready, blocked = DAGEngine.evaluate_task_readiness(tasks, dependencies)
    ready_ids = [t.id for t in ready]
    assert set(ready_ids) == {"B", "D"}
    assert set(t.id for t in blocked) == {"C", "E"}

    # 3. Mark B as COMPLETED (D is still PENDING)
    tasks[1].status = TaskStatus.COMPLETED

    # Evaluating should unlock C (depends on B). E still blocked because D is not completed!
    ready, blocked = DAGEngine.evaluate_task_readiness(tasks, dependencies)
    ready_ids = [t.id for t in ready]
    assert "C" in ready_ids
    assert "E" not in ready_ids
    assert "E" in [t.id for t in blocked]

    # 4. Mark D as COMPLETED
    tasks[3].status = TaskStatus.COMPLETED

    # Now both B and D are COMPLETED -> E is finally unlocked!
    ready, blocked = DAGEngine.evaluate_task_readiness(tasks, dependencies)
    ready_ids = [t.id for t in ready]
    assert "E" in ready_ids

    # 5. Mark C and E as COMPLETED
    tasks[2].status = TaskStatus.COMPLETED
    tasks[4].status = TaskStatus.COMPLETED

    assert DAGEngine.calculate_progress(tasks) == 100.0


def test_topological_sort_order():
    task_ids = {"A", "B", "C", "D", "E"}
    dependencies = [
        ("B", "A"),
        ("C", "B"),
        ("D", "A"),
        ("E", "B"),
        ("E", "D"),
    ]
    order = DAGEngine.topological_sort(task_ids, dependencies)
    
    # A must come before B and D
    assert order.index("A") < order.index("B")
    assert order.index("A") < order.index("D")
    # B must come before C and E
    assert order.index("B") < order.index("C")
    assert order.index("B") < order.index("E")
    # D must come before E
    assert order.index("D") < order.index("E")


def test_recovery_task_dag_progression_and_acyclicity():
    """
    Regression Test:
    Verify recovery graph:
    A -> B -> C
    B fails -> X (recovery task) is injected.
    Resulting graph:
    A -> B
    X -> B
    B -> C

    Assert:
    1. Resulting graph is strictly acyclic
    2. Topological sort requires both A and X before B, and B before C
    3. B cannot become READY before X completes
    4. X becomes READY upon replanning
    5. Completion of X unlocks B
    6. Completion of B unlocks C
    """
    task_a = Task(id="A", mission_id="m1", title="Task A (Scaffold)", description="", status=TaskStatus.COMPLETED)
    task_b = Task(id="B", mission_id="m1", title="Task B (Build)", description="", status=TaskStatus.PENDING)
    task_c = Task(id="C", mission_id="m1", title="Task C (Deploy)", description="", status=TaskStatus.PENDING)
    task_x = Task(id="X", mission_id="m1", title="Fix & Recover Task X", description="", status=TaskStatus.READY)

    tasks = [task_a, task_b, task_c, task_x]
    task_ids = {"A", "B", "C", "X"}

    # Dependencies: (dependent_task, prerequisite_task)
    # B depends on A
    # B depends on X
    # C depends on B
    dependencies = [
        ("B", "A"),
        ("B", "X"),
        ("C", "B"),
    ]

    # 1. Graph is strictly acyclic
    assert DAGEngine.detect_cycles(task_ids, dependencies) is False

    # 2. Topological sort order
    order = DAGEngine.topological_sort(task_ids, dependencies)
    assert order.index("A") < order.index("B")
    assert order.index("X") < order.index("B")
    assert order.index("B") < order.index("C")

    # 3. With A=COMPLETED and X=READY:
    # B must NOT become ready (still blocked by X)
    ready, blocked = DAGEngine.evaluate_task_readiness(tasks, dependencies)
    ready_ids = [t.id for t in ready]
    assert "B" not in ready_ids
    assert "C" not in ready_ids
    assert set(t.id for t in blocked) == {"B", "C"}

    # 4. Complete X (X=COMPLETED)
    task_x.status = TaskStatus.COMPLETED

    # 5. X completion unlocks B!
    ready, blocked = DAGEngine.evaluate_task_readiness(tasks, dependencies)
    ready_ids = [t.id for t in ready]
    assert "B" in ready_ids
    assert "C" not in ready_ids
    assert [t.id for t in blocked] == ["C"]

    # 6. Start & Complete B (B=COMPLETED)
    task_b.status = TaskStatus.COMPLETED

    # 7. B retry completion unlocks C!
    ready, blocked = DAGEngine.evaluate_task_readiness(tasks, dependencies)
    ready_ids = [t.id for t in ready]
    assert "C" in ready_ids
    assert len(blocked) == 0

    # 8. Complete C (C=COMPLETED)
    task_c.status = TaskStatus.COMPLETED
    assert DAGEngine.calculate_progress(tasks) == 100.0

