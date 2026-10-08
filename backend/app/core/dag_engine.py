from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict, deque
from app.models.enums import TaskStatus
from app.models.task import Task
from app.core.exceptions import (
    DependencyCycleError,
    SelfDependencyError,
    InvalidDependencyError,
)


class DAGEngine:
    @staticmethod
    def detect_cycles(
        task_ids: Set[str],
        dependencies: List[Tuple[str, str]]
    ) -> bool:
        """
        Detects if a directed graph contains a cycle.
        Edge (u, v) means u depends on v (v -> u in execution flow).
        Returns True if a cycle exists, False otherwise.
        """
        # Build adjacency list: v -> u (v must complete before u can run)
        adj: Dict[str, List[str]] = defaultdict(list)
        in_degree: Dict[str, int] = {t_id: 0 for t_id in task_ids}

        for task_id, depends_on_id in dependencies:
            if task_id in in_degree and depends_on_id in in_degree:
                adj[depends_on_id].append(task_id)
                in_degree[task_id] += 1

        queue = deque([t_id for t_id, deg in in_degree.items() if deg == 0])
        visited_count = 0

        while queue:
            curr = queue.popleft()
            visited_count += 1
            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        return visited_count < len(task_ids)

    @staticmethod
    def validate_dependency(
        task_id: str,
        depends_on_task_id: str,
        task_ids: Set[str],
        existing_dependencies: List[Tuple[str, str]]
    ) -> None:
        """
        Validates whether adding a dependency edge is permissible.
        Raises domain errors if invalid.
        """
        if task_id == depends_on_task_id:
            raise SelfDependencyError(task_id)

        if task_id not in task_ids:
            raise InvalidDependencyError(f"Task '{task_id}' is not in this mission.")

        if depends_on_task_id not in task_ids:
            raise InvalidDependencyError(f"Dependency task '{depends_on_task_id}' is not in this mission.")

        # Check for duplicate
        if (task_id, depends_on_task_id) in existing_dependencies:
            return  # Already exists, idempotent

        # Test cycle by temporarily adding edge
        simulated_dependencies = list(existing_dependencies) + [(task_id, depends_on_task_id)]
        if DAGEngine.detect_cycles(task_ids, simulated_dependencies):
            raise DependencyCycleError(
                f"Adding dependency '{task_id}' -> '{depends_on_task_id}' creates a circular dependency."
            )

    @staticmethod
    def get_task_dependencies_map(
        dependencies: List[Tuple[str, str]]
    ) -> Dict[str, Set[str]]:
        """
        Returns a mapping from task_id -> Set[prerequisite_task_ids]
        """
        deps_map: Dict[str, Set[str]] = defaultdict(set)
        for task_id, depends_on_id in dependencies:
            deps_map[task_id].add(depends_on_id)
        return deps_map

    @staticmethod
    def get_task_dependents_map(
        dependencies: List[Tuple[str, str]]
    ) -> Dict[str, Set[str]]:
        """
        Returns a mapping from prerequisite_task_id -> Set[dependent_task_ids]
        """
        deps_map: Dict[str, Set[str]] = defaultdict(set)
        for task_id, depends_on_id in dependencies:
            deps_map[depends_on_id].add(task_id)
        return deps_map

    @staticmethod
    def evaluate_task_readiness(
        tasks: List[Task],
        dependencies: List[Tuple[str, str]]
    ) -> Tuple[List[Task], List[Task]]:
        """
        Evaluates the task graph and returns:
        - newly_ready_tasks: tasks in PENDING whose all prerequisites are COMPLETED
        - blocked_tasks: tasks in PENDING with at least one incomplete prerequisite
        """
        task_map = {t.id: t for t in tasks}
        deps_map = DAGEngine.get_task_dependencies_map(dependencies)

        newly_ready_tasks: List[Task] = []
        blocked_tasks: List[Task] = []

        for task in tasks:
            if task.status != TaskStatus.PENDING:
                continue

            prereqs = deps_map.get(task.id, set())
            if not prereqs:
                newly_ready_tasks.append(task)
            else:
                all_completed = all(
                    task_map[p_id].status == TaskStatus.COMPLETED
                    for p_id in prereqs
                    if p_id in task_map
                )
                if all_completed:
                    newly_ready_tasks.append(task)
                else:
                    blocked_tasks.append(task)

        return newly_ready_tasks, blocked_tasks

    @staticmethod
    def calculate_progress(tasks: List[Task]) -> float:
        """
        Calculates mission progress based on completed tasks.
        Cancelled tasks are excluded from the total count unless all tasks are cancelled.
        """
        if not tasks:
            return 0.0

        active_tasks = [t for t in tasks if t.status != TaskStatus.CANCELLED]
        if not active_tasks:
            # If all tasks were cancelled
            return 0.0

        completed_count = sum(1 for t in active_tasks if t.status == TaskStatus.COMPLETED)
        return round((completed_count / len(active_tasks)) * 100.0, 2)

    @staticmethod
    def topological_sort(
        task_ids: Set[str],
        dependencies: List[Tuple[str, str]]
    ) -> List[str]:
        """
        Returns task IDs in valid execution order.
        Raises DependencyCycleError if a cycle is present.
        """
        adj: Dict[str, List[str]] = defaultdict(list)
        in_degree: Dict[str, int] = {t_id: 0 for t_id in task_ids}

        for task_id, depends_on_id in dependencies:
            if task_id in in_degree and depends_on_id in in_degree:
                adj[depends_on_id].append(task_id)
                in_degree[task_id] += 1

        queue = deque([t_id for t_id, deg in in_degree.items() if deg == 0])
        ordered: List[str] = []

        while queue:
            curr = queue.popleft()
            ordered.append(curr)
            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(ordered) < len(task_ids):
            raise DependencyCycleError("Graph contains circular dependencies.")

        return ordered
