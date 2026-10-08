import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_mission(client: AsyncClient):
    payload = {
        "title": "Build Portfolio Website",
        "description": "Analyze GitHub repos and generate portfolio",
        "priority": 3
    }
    response = await client.post("/api/v1/missions", json=payload)
    assert response.status_code == 201
    mission_data = response.json()
    assert mission_data["title"] == payload["title"]
    assert mission_data["status"] == "PLANNING"
    assert mission_data["progress"] == 0.0
    mission_id = mission_data["id"]

    # Get Mission
    get_res = await client.get(f"/api/v1/missions/{mission_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == mission_id

    # List Missions
    list_res = await client.get("/api/v1/missions")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1


@pytest.mark.asyncio
async def test_mission_lifecycle_transitions(client: AsyncClient):
    # 1. Create Mission
    res = await client.post("/api/v1/missions", json={
        "title": "Deployment Mission",
        "description": "Deploy services to cluster",
        "priority": 2
    })
    mission_id = res.json()["id"]

    # 2. Starting without tasks in PLANNING state should fail
    start_res = await client.post(f"/api/v1/missions/{mission_id}/start")
    assert start_res.status_code == 400

    # 3. Add a task
    task_res = await client.post(f"/api/v1/missions/{mission_id}/tasks", json={
        "title": "Verify cluster connection",
        "description": "Ping kubernetes cluster"
    })
    assert task_res.status_code == 201

    # 4. Now Start Mission -> transitions to RUNNING and task becomes READY
    start_res = await client.post(f"/api/v1/missions/{mission_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "RUNNING"

    # 5. Pause Mission
    pause_res = await client.post(f"/api/v1/missions/{mission_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "PAUSED"

    # 6. Resume Mission
    resume_res = await client.post(f"/api/v1/missions/{mission_id}/start")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "RUNNING"

    # 7. Cancel Mission
    cancel_res = await client.post(f"/api/v1/missions/{mission_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_mission_list_to_detail_navigation_contract(client: AsyncClient):
    """
    Regression Test:
    GET /missions -> obtain mission -> navigate using returned mission.id ->
    GET /missions/{id}, /tasks, /replans, /memory -> verify exact match and 200 OK.
    """
    # 1. Create a mission
    create_res = await client.post("/api/v1/missions", json={
        "title": "Navigation Contract Verification",
        "description": "Ensure full UUID is preserved and sub-resources resolve cleanly",
        "priority": 2
    })
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]
    assert len(created_id) == 36

    # 2. List missions
    list_res = await client.get("/api/v1/missions")
    assert list_res.status_code == 200
    data = list_res.json()
    assert "items" in data
    found = next((m for m in data["items"] if m["id"] == created_id), None)
    assert found is not None
    assert found["id"] == created_id
    assert found["title"] == "Navigation Contract Verification"

    # 3. Navigate using returned mission.id to all mission detail sub-endpoints
    get_res = await client.get(f"/api/v1/missions/{found['id']}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["id"] == created_id
    assert detail["title"] == "Navigation Contract Verification"

    tasks_res = await client.get(f"/api/v1/missions/{found['id']}/tasks")
    assert tasks_res.status_code == 200
    assert isinstance(tasks_res.json(), list)

    replans_res = await client.get(f"/api/v1/missions/{found['id']}/replans")
    assert replans_res.status_code == 200
    assert isinstance(replans_res.json(), list)

    mem_res = await client.get(f"/api/v1/missions/{found['id']}/memory")
    assert mem_res.status_code == 200
    assert isinstance(mem_res.json(), list)


@pytest.mark.asyncio
async def test_demo_scenario_completed_mission_open_from_list(client: AsyncClient):
    """
    Regression Test:
    Verify the complete demo mission created by /api/v1/demo/scenarios/complete-loop
    can be found in the missions list and opened via its full ID.
    """
    # 1. Run complete loop demo scenario
    demo_res = await client.post("/api/v1/demo/scenarios/complete-loop")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    mission_id = demo_data["mission"]["id"]
    assert len(mission_id) == 36
    assert demo_data["mission"]["status"] == "COMPLETED"

    # 2. Retrieve via GET /missions
    list_res = await client.get("/api/v1/missions")
    assert list_res.status_code == 200
    missions_list = list_res.json()["items"]
    target_mission = next((m for m in missions_list if m["id"] == mission_id), None)
    assert target_mission is not None
    assert target_mission["status"] == "COMPLETED"
    assert target_mission["progress"] == 100.0

    # 3. Retrieve all mission detail pages / sub-resources
    get_res = await client.get(f"/api/v1/missions/{target_mission['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == mission_id
    assert get_res.json()["status"] == "COMPLETED"

    tasks_res = await client.get(f"/api/v1/missions/{target_mission['id']}/tasks")
    assert tasks_res.status_code == 200
    assert len(tasks_res.json()) >= 3

    replans_res = await client.get(f"/api/v1/missions/{target_mission['id']}/replans")
    assert replans_res.status_code == 200
    revisions = replans_res.json()
    assert len(revisions) >= 1
    assert revisions[0]["mission_id"] == mission_id

    mem_res = await client.get(f"/api/v1/missions/{target_mission['id']}/memory")
    assert mem_res.status_code == 200
    assert isinstance(mem_res.json(), list)


@pytest.mark.asyncio
async def test_plan_version_progression_across_replans_regression(client: AsyncClient):
    """
    Regression Test:
    1. Create mission -> verify plan_version = 1, replan_count = 0
    2. GET /api/v1/missions/{id} -> reports plan_version = 1
    3. Trigger Replan #1 -> verify PlanRevision v2 exists, mission.plan_version = 2
    4. GET /api/v1/missions/{id} -> reports plan_version = 2
    5. Trigger Replan #2 -> verify PlanRevision v3 exists, mission.plan_version = 3
    6. GET /api/v1/missions/{id} -> reports plan_version = 3
    7. GET /api/v1/missions/{id}/replans -> returns revisions v2 and v3
    """
    # 1. Create Mission
    create_res = await client.post("/api/v1/missions", json={
        "title": "Plan Versioning Lifecycle",
        "description": "Verify plan version progression across sequential replans",
        "priority": 2,
    })
    assert create_res.status_code == 201
    mission_id = create_res.json()["id"]

    # 2. Initial state verification
    get_res_1 = await client.get(f"/api/v1/missions/{mission_id}")
    assert get_res_1.status_code == 200
    m_data_1 = get_res_1.json()
    assert m_data_1["plan_version"] == 1
    assert m_data_1["replan_count"] == 0

    # Add task and start mission
    task_res = await client.post(f"/api/v1/missions/{mission_id}/tasks", json={
        "title": "Task Alpha",
        "description": "Primary compilation step",
    })
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    await client.post(f"/api/v1/missions/{mission_id}/start")
    await client.post(f"/api/v1/tasks/{task_id}/start")
    await client.post(f"/api/v1/tasks/{task_id}/fail", json={
        "error_message": "Missing dependency: sharp-native",
        "retry": False,
    })

    # 3. Trigger Replan #1
    replan_1_res = await client.post(
        f"/api/v1/missions/{mission_id}/replan?task_id={task_id}&reason=First+replan+dependency+resolution"
    )
    assert replan_1_res.status_code == 200

    # 4. Verify GET /missions/{id} reports plan_version = 2
    get_res_2 = await client.get(f"/api/v1/missions/{mission_id}")
    assert get_res_2.status_code == 200
    m_data_2 = get_res_2.json()
    assert m_data_2["plan_version"] == 2
    assert m_data_2["replan_count"] == 1

    # Verify PlanRevision v2 via GET /replans
    replans_res_1 = await client.get(f"/api/v1/missions/{mission_id}/replans")
    assert replans_res_1.status_code == 200
    revs_1 = replans_res_1.json()
    assert len(revs_1) == 1
    assert revs_1[0]["version"] == 2
    assert revs_1[0]["parent_version"] == 1

    # 5. Trigger Replan #2
    replan_2_res = await client.post(
        f"/api/v1/missions/{mission_id}/replan?task_id={task_id}&reason=Second+replan+additional+fix"
    )
    assert replan_2_res.status_code == 200

    # 6. Verify GET /missions/{id} reports plan_version = 3
    get_res_3 = await client.get(f"/api/v1/missions/{mission_id}")
    assert get_res_3.status_code == 200
    m_data_3 = get_res_3.json()
    assert m_data_3["plan_version"] == 3
    assert m_data_3["replan_count"] == 2

    # 7. Verify both revisions via GET /replans
    replans_res_2 = await client.get(f"/api/v1/missions/{mission_id}/replans")
    assert replans_res_2.status_code == 200
    revs_2 = replans_res_2.json()
    assert len(revs_2) == 2
    assert revs_2[0]["version"] == 2
    assert revs_2[1]["version"] == 3
    assert revs_2[1]["parent_version"] == 2


