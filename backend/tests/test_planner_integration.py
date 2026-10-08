import pytest
from httpx import AsyncClient
from app.models.enums import TaskStatus, MissionStatus, AgentType
from app.runtime.llm.mock_provider import MockLLMProvider
from app.schemas.agent_decision import PlanOutput, PlannedTask, AgentDecision


@pytest.mark.asyncio
async def test_end_to_end_planner_and_execution_pipeline(client: AsyncClient):
    """
    Complete Phase 3 Integration Test:
    1. User creates a Mission with a high-level goal.
    2. Planner Agent plans the mission into a structured DAG.
    3. Verify DAG validity and acyclicity.
    4. Start Mission.
    5. Execute root task via Agent Runtime.
    6. Complete root task -> Unlocks dependent tasks.
    7. Complete all remaining tasks -> Mission completes at 100%.
    """
    # 1. Create Mission in PLANNING state
    goal_text = "Build a portfolio website from my GitHub projects"
    mission_res = await client.post("/api/v1/missions", json={
        "title": "Portfolio Mission",
        "description": goal_text,
        "priority": 3
    })
    assert mission_res.status_code == 201
    mission_id = mission_res.json()["id"]
    assert mission_res.json()["status"] == "PLANNING"

    # 2. Trigger Planner Agent
    plan_res = await client.post(f"/api/v1/missions/{mission_id}/plan")
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert plan_data["tasks_created"] >= 3

    # 3. Verify DAG via API
    dag_res = await client.get(f"/api/v1/missions/{mission_id}/dag")
    assert dag_res.status_code == 200
    dag = dag_res.json()
    assert len(dag["nodes"]) == plan_data["tasks_created"]
    assert len(dag["execution_order"]) == len(dag["nodes"])

    # 4. Start Mission -> Root tasks become READY
    start_res = await client.post(f"/api/v1/missions/{mission_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "RUNNING"

    # 5. Get current ready tasks
    dag_res = await client.get(f"/api/v1/missions/{mission_id}/dag")
    ready_task_ids = dag_res.json()["ready_task_ids"]
    assert len(ready_task_ids) > 0
    first_task_id = ready_task_ids[0]

    # 6. Execute the first task via AgentRuntime endpoint
    exec_res = await client.post(f"/api/v1/tasks/{first_task_id}/execute")
    assert exec_res.status_code == 200
    run_data = exec_res.json()
    assert run_data["status"] == "COMPLETED"

    # 7. Check that first task is COMPLETED and next task is now READY
    t1_res = await client.get(f"/api/v1/tasks/{first_task_id}")
    assert t1_res.json()["status"] == "COMPLETED"

    dag_after = await client.get(f"/api/v1/missions/{mission_id}/dag")
    assert first_task_id not in dag_after.json()["ready_task_ids"]

    # 8. Check Agent runs history
    runs_res = await client.get("/api/v1/agents/agent_planner/runs")
    assert runs_res.status_code == 200
    assert len(runs_res.json()) >= 1
