import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_complete_dag_api_workflow(client: AsyncClient):
    """
    End-to-End API test for the DAG scenario:
    A -> B -> C
    A -> D
    B + D -> E
    """
    # 1. Create Mission
    mission_res = await client.post("/api/v1/missions", json={
        "title": "Portfolio Generation Mission",
        "description": "Generate portfolio website",
        "priority": 3
    })
    mission_id = mission_res.json()["id"]

    # 2. Create Tasks
    # Task A (Root)
    res_A = await client.post(f"/api/v1/missions/{mission_id}/tasks", json={
        "title": "Task A: Analyze Repositories",
        "description": "Fetch GitHub profile and projects"
    })
    id_A = res_A.json()["id"]

    # Task B (depends on A)
    res_B = await client.post(f"/api/v1/missions/{mission_id}/tasks", json={
        "title": "Task B: Select Projects",
        "description": "Pick top 3 repositories",
        "dependencies": [id_A]
    })
    id_B = res_B.json()["id"]

    # Task C (depends on B)
    res_C = await client.post(f"/api/v1/missions/{mission_id}/tasks", json={
        "title": "Task C: Write Project Summaries",
        "description": "Draft copy for selected projects",
        "dependencies": [id_B]
    })
    id_C = res_C.json()["id"]

    # Task D (depends on A)
    res_D = await client.post(f"/api/v1/missions/{mission_id}/tasks", json={
        "title": "Task D: Design Layout",
        "description": "Generate component layout structure",
        "dependencies": [id_A]
    })
    id_D = res_D.json()["id"]

    # Task E (depends on B and D)
    res_E = await client.post(f"/api/v1/missions/{mission_id}/tasks", json={
        "title": "Task E: Build Portfolio Application",
        "description": "Assemble and render portfolio",
        "dependencies": [id_B, id_D]
    })
    id_E = res_E.json()["id"]

    # 3. Start Mission
    start_res = await client.post(f"/api/v1/missions/{mission_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "RUNNING"

    # 4. Check DAG status via API
    dag_res = await client.get(f"/api/v1/missions/{mission_id}/dag")
    assert dag_res.status_code == 200
    dag_data = dag_res.json()
    assert id_A in dag_data["ready_task_ids"]
    assert set(dag_data["blocked_task_ids"]) == {id_B, id_C, id_D, id_E}

    # 5. Execute Task A -> COMPLETE
    comp_A = await client.post(f"/api/v1/tasks/{id_A}/complete", json={
        "output_data": {"repos": ["repo1", "repo2", "repo3"]}
    })
    assert comp_A.status_code == 200
    assert comp_A.json()["status"] == "COMPLETED"

    # Verify that B and D are now READY, C and E are still BLOCKED
    dag_res = await client.get(f"/api/v1/missions/{mission_id}/dag")
    dag_data = dag_res.json()
    assert id_B in dag_data["ready_task_ids"]
    assert id_D in dag_data["ready_task_ids"]
    assert set(dag_data["blocked_task_ids"]) == {id_C, id_E}

    # 6. Complete Task B
    comp_B = await client.post(f"/api/v1/tasks/{id_B}/complete", json={
        "output_data": {"selected": ["repo1", "repo2"]}
    })
    assert comp_B.status_code == 200

    # C is now unlocked (READY), but E is STILL BLOCKED because D is incomplete!
    dag_res = await client.get(f"/api/v1/missions/{mission_id}/dag")
    dag_data = dag_res.json()
    assert id_C in dag_data["ready_task_ids"]
    assert id_E not in dag_data["ready_task_ids"]
    assert id_E in dag_data["blocked_task_ids"]

    # 7. Complete Task D
    comp_D = await client.post(f"/api/v1/tasks/{id_D}/complete", json={
        "output_data": {"theme": "dark-command-center"}
    })
    assert comp_D.status_code == 200

    # Now E is finally unlocked (READY)!
    dag_res = await client.get(f"/api/v1/missions/{mission_id}/dag")
    dag_data = dag_res.json()
    assert id_E in dag_data["ready_task_ids"]

    # 8. Complete remaining tasks (C and E)
    await client.post(f"/api/v1/tasks/{id_C}/complete", json={"output_data": {}})
    final_res = await client.post(f"/api/v1/tasks/{id_E}/complete", json={"output_data": {"deployed": True}})
    assert final_res.status_code == 200

    # 9. Verify Mission Progress & Status is COMPLETED
    mission_final = await client.get(f"/api/v1/missions/{mission_id}")
    assert mission_final.status_code == 200
    final_data = mission_final.json()
    assert final_data["progress"] == 100.0
    assert final_data["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_circular_dependency_rejection_via_api(client: AsyncClient):
    # 1. Create Mission
    m_res = await client.post("/api/v1/missions", json={
        "title": "Cycle Test",
        "description": "Test circular dependency rejection"
    })
    m_id = m_res.json()["id"]

    # 2. Create Task 1
    t1_res = await client.post(f"/api/v1/missions/{m_id}/tasks", json={
        "title": "Task 1",
        "description": "First"
    })
    t1_id = t1_res.json()["id"]

    # 3. Create Task 2 depending on Task 1
    t2_res = await client.post(f"/api/v1/missions/{m_id}/tasks", json={
        "title": "Task 2",
        "description": "Second",
        "dependencies": [t1_id]
    })
    t2_id = t2_res.json()["id"]

    # 4. Attempt to add dependency: Task 1 depends on Task 2 (Cycle!)
    add_dep_res = await client.post(f"/api/v1/missions/{m_id}/dependencies", json={
        "task_id": t1_id,
        "depends_on_task_id": t2_id
    })
    assert add_dep_res.status_code == 400
    assert add_dep_res.json()["error"] == "CYCLE_DETECTED"
