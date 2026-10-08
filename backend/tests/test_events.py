import pytest
import asyncio
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import AsyncMock

from app.models.enums import (
    EventType,
    MissionStatus,
    TaskStatus,
    ApprovalStatus,
    RiskLevel,
    AgentType,
)
from app.models.event import Event
from app.models.mission import Mission
from app.models.task import Task
from app.events.bus import InMemoryEventBus
from app.services.event_service import EventService
from app.services.mission_service import MissionService
from app.services.task_service import TaskService
from app.services.approval_service import ApprovalService
from app.runtime.agent_runtime import AgentRuntime
from app.schemas.mission import MissionCreate
from app.schemas.task import TaskCreate
from app.ws.manager import ConnectionManager
from app.core.security import authenticate_websocket_user, verify_mission_authorization, UserContext
from fastapi import HTTPException
from app.main import app


@pytest.mark.asyncio
async def test_event_bus_pub_sub_and_isolation():
    """Test EventBus pub/sub, pattern routing, and subscriber error isolation."""
    bus = InMemoryEventBus()
    received_system = []
    received_mission = []
    
    async def good_handler(event_data):
        received_system.append(event_data)
        
    async def broken_handler(event_data):
        raise RuntimeError("Subscriber explosion!")
        
    async def mission_handler(event_data):
        received_mission.append(event_data)

    await bus.subscribe("*", good_handler)
    await bus.subscribe("*", broken_handler)
    await bus.subscribe("mission:m1", mission_handler)

    test_event_1 = {
        "event_type": "MISSION_CREATED",
        "mission_id": "m1",
        "payload": {"title": "Test 1"}
    }
    
    # Should not raise exception despite broken_handler
    await bus.publish(channel="mission:m1", event=test_event_1)
    
    assert len(received_system) == 1
    assert len(received_mission) == 1
    assert received_system[0]["payload"]["title"] == "Test 1"

    # Clean up
    await bus.unsubscribe("*", good_handler)
    await bus.unsubscribe("*", broken_handler)
    await bus.unsubscribe("mission:m1", mission_handler)


@pytest.mark.asyncio
async def test_event_service_monotonic_sequence_and_sanitization(db_session: AsyncSession):
    """Test atomic monotonic sequence numbers per mission and sensitive payload scrubbing."""
    mission = await MissionService.create_mission(
        MissionCreate(title="Test Secret Mission", description="Inspect secrets"),
        session=db_session
    )

    # Record event with sensitive data
    ev1 = await EventService.record_event(
        event_type=EventType.TOOL_STARTED,
        correlation_id=mission.id,
        mission_id=mission.id,
        source="test_runner",
        payload={
            "api_key": "sk-proj-super-secret-key-12345",
            "password": "Password123!",
            "public_param": "hello world",
            "nested": {
                "auth_token": "bearer-token-abc",
                "normal_field": 42
            }
        },
        session=db_session
    )

    ev2 = await EventService.record_event(
        event_type=EventType.TOOL_COMPLETED,
        correlation_id=mission.id,
        mission_id=mission.id,
        source="test_runner",
        payload={"result": "ok"},
        session=db_session
    )

    # Monotonic sequence numbers: MISSION_CREATED (1), ev1 (2), ev2 (3)
    assert ev1.sequence_number == 2
    assert ev2.sequence_number == 3

    # Sanitization verification
    assert ev1.payload["api_key"] == "[REDACTED]"
    assert ev1.payload["password"] == "[REDACTED]"
    assert ev1.payload["public_param"] == "hello world"
    assert ev1.payload["nested"]["auth_token"] == "[REDACTED]"
    assert ev1.payload["nested"]["normal_field"] == 42


@pytest.mark.asyncio
async def test_events_rest_api_and_replay(client: AsyncClient):
    """Test GET /api/v1/events and replay query via GET /api/v1/missions/{id}/events?after_sequence=N."""
    # 1. Create a mission
    create_resp = await client.post(
        "/api/v1/missions",
        json={"title": "Replay Mission", "description": "Testing replay events", "priority": 1}
    )
    assert create_resp.status_code == 201
    mission_id = create_resp.json()["id"]

    # 2. Add some tasks
    t1_resp = await client.post(
        f"/api/v1/missions/{mission_id}/tasks",
        json={"title": "Replay Task 1", "description": "Step 1", "priority": 1}
    )
    assert t1_resp.status_code == 201

    t2_resp = await client.post(
        f"/api/v1/missions/{mission_id}/tasks",
        json={"title": "Replay Task 2", "description": "Step 2", "priority": 1}
    )
    assert t2_resp.status_code == 201

    # 3. List all events globally
    events_resp = await client.get("/api/v1/events")
    assert events_resp.status_code == 200
    events_data = events_resp.json()
    assert events_data["total"] >= 3
    assert len(events_data["items"]) >= 3

    # 4. List mission specific events
    mission_events_resp = await client.get(f"/api/v1/missions/{mission_id}/events")
    assert mission_events_resp.status_code == 200
    m_events = mission_events_resp.json()
    assert len(m_events) == 3
    seqs = [e["sequence_number"] for e in m_events]
    assert seqs == [1, 2, 3]

    # 5. Test replay query: after_sequence=1
    replay_resp = await client.get(f"/api/v1/missions/{mission_id}/events?after_sequence=1")
    assert replay_resp.status_code == 200
    replay_data = replay_resp.json()
    assert len(replay_data) == 2
    assert [e["sequence_number"] for e in replay_data] == [2, 3]

    # 6. Test single event retrieval
    first_event_id = m_events[0]["id"]
    single_resp = await client.get(f"/api/v1/events/{first_event_id}")
    assert single_resp.status_code == 200
    assert single_resp.json()["id"] == first_event_id
    assert single_resp.json()["event_type"] == "MISSION_CREATED"


@pytest.mark.asyncio
async def test_connection_manager_room_broadcasting():
    """Test ConnectionManager room segmentation, broadcast, and dead socket cleanup."""
    mgr = ConnectionManager()
    
    ws1 = AsyncMock()
    ws2 = AsyncMock()
    ws3 = AsyncMock()
    
    # Connect ws1 & ws2 to system, ws3 to mission:m1
    await mgr.connect(ws1, channel="system")
    await mgr.connect(ws2, channel="system")
    await mgr.connect(ws3, channel="mission:m1")
    
    assert mgr.get_channel_connection_count("system") == 2
    assert mgr.get_channel_connection_count("mission:m1") == 1
    
    # Broadcast to system
    await mgr.broadcast_to_channel("system", {"event_type": "SYSTEM_ALERT"})
    ws1.send_json.assert_awaited_once()
    ws2.send_json.assert_awaited_once()
    ws3.send_json.assert_not_awaited()
    
    # Broadcast to mission:m1
    await mgr.broadcast_to_channel("mission:m1", {"event_type": "TASK_UPDATED"})
    ws3.send_json.assert_awaited_once()
    
    # Test dead socket cleanup on failed send
    ws1.send_json.side_effect = Exception("Socket closed unexpectedly")
    await mgr.broadcast_to_channel("system", {"event_type": "ANOTHER_EVENT"})
    
    # ws1 should be pruned
    assert mgr.get_channel_connection_count("system") == 1
    assert ws1 not in mgr._connections.get("system", set())


@pytest.mark.asyncio
async def test_websocket_authentication_and_mission_authorization(db_session: AsyncSession):
    """
    Test explicit security verification on WebSocket connections:
    1. Rejects invalid authentication tokens.
    2. Rejects connection to non-existent missions.
    3. Rejects unauthorized users attempting to access another user's mission.
    4. Authorizes legitimate operators and owners.
    """
    # Create test mission
    mission = await MissionService.create_mission(
        MissionCreate(title="Auth Test Mission", description="Testing auth gate"),
        session=db_session
    )

    # 1. Test invalid token authentication
    fake_ws = AsyncMock()
    fake_ws.headers = {}
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_websocket_user(fake_ws, token="invalid_token")
    assert exc_info.value.status_code == 401

    # 2. Test valid operator authentication
    admin_user = await authenticate_websocket_user(fake_ws, token="operator_secret")
    assert admin_user.is_admin is True

    # 3. Verify admin access to existing mission succeeds
    verified_mission = await verify_mission_authorization(
        mission_id=mission.id,
        user=admin_user,
        session=db_session,
    )
    assert verified_mission.id == mission.id

    # 4. Verify non-existent mission raises 404
    with pytest.raises(HTTPException) as exc_404:
        await verify_mission_authorization(
            mission_id="non_existent_mission_id_123",
            user=admin_user,
            session=db_session,
        )
    assert exc_404.value.status_code == 404

    # 5. Verify unauthorized guest user is forbidden (403) from streaming mission activity
    guest_user = UserContext(user_id="unauthorized_guest", role="guest", is_admin=False)
    with pytest.raises(HTTPException) as exc_403:
        await verify_mission_authorization(
            mission_id=mission.id,
            user=guest_user,
            session=db_session,
        )
    assert exc_403.value.status_code == 403
    assert "Forbidden" in exc_403.value.detail


@pytest.mark.asyncio
async def test_end_to_end_event_chain_lifecycle(client: AsyncClient):
    """
    Test full lifecycle event generation from Mission Creation -> Planning -> Execution -> Approval -> Completion.
    """
    # 1. Create Mission (MISSION_CREATED)
    mission_resp = await client.post(
        "/api/v1/missions",
        json={"title": "E2E Lifecycle Mission", "description": "Complete lifecycle event trace", "priority": 1}
    )
    assert mission_resp.status_code == 201
    mission_id = mission_resp.json()["id"]

    # 2. Plan Mission (AGENT_RUN_STARTED, TASK_CREATED x3, MISSION_READY, AGENT_RUN_COMPLETED)
    plan_resp = await client.post(f"/api/v1/missions/{mission_id}/plan")
    assert plan_resp.status_code == 200

    # 3. Start Mission (MISSION_STARTED, TASK_READY)
    start_resp = await client.post(f"/api/v1/missions/{mission_id}/start")
    assert start_resp.status_code == 200

    # 4. Fetch recorded events for this mission
    events_resp = await client.get(f"/api/v1/missions/{mission_id}/events")
    assert events_resp.status_code == 200
    events = events_resp.json()
    
    event_types = [e["event_type"] for e in events]
    assert "MISSION_CREATED" in event_types
    assert "AGENT_RUN_STARTED" in event_types
    assert "TASK_CREATED" in event_types
    assert "AGENT_RUN_COMPLETED" in event_types
    assert "MISSION_STARTED" in event_types
    assert "TASK_READY" in event_types

    # Verify monotonic sequencing
    sequences = [e["sequence_number"] for e in events]
    assert sequences == list(range(1, len(events) + 1))

    # Verify correlation_id propagation
    for event in events:
        assert event["correlation_id"] == mission_id
        assert event["timestamp"] is not None
