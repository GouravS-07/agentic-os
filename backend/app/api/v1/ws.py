from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import json

from app.database import get_db
from app.models.mission import Mission
from app.ws.manager import ws_manager
from app.core.security import authenticate_websocket_user, verify_mission_authorization

logger = logging.getLogger("agentic_os.ws")
router = APIRouter(tags=["WebSockets & Live Activity"])


@router.websocket("/ws/events")
async def websocket_system_events(
    websocket: WebSocket,
    token: str = Query(None),
):
    """
    System-wide real-time WebSocket event stream for activity logs and command center monitoring.
    Requires valid operator authorization.
    """
    try:
        user = await authenticate_websocket_user(websocket, token=token)
    except HTTPException as exc:
        await websocket.close(code=4401, reason=exc.detail)
        return

    await ws_manager.connect(websocket, channel="system")
    try:
        while True:
            # Keep connection open and handle client pings / messages
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, channel="system")
    except Exception as exc:
        logger.debug(f"WS system disconnect: {exc}")
        await ws_manager.disconnect(websocket, channel="system")


@router.websocket("/ws/missions/{mission_id}")
async def websocket_mission_events(
    websocket: WebSocket,
    mission_id: str,
    token: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Mission-specific real-time WebSocket event stream for live DAG updates, task progress, and approval banners.
    Explicitly authenticates the user and verifies authorization to access the specific mission before connecting.
    """
    # 1. Authenticate connected user
    try:
        user = await authenticate_websocket_user(websocket, token=token)
    except HTTPException as exc:
        await websocket.close(code=4401, reason=exc.detail)
        return

    # 2. Verify mission existence and user authorization
    try:
        await verify_mission_authorization(mission_id=mission_id, user=user, session=db)
    except HTTPException as exc:
        close_code = 4404 if exc.status_code == status.HTTP_404_NOT_FOUND else 4403
        await websocket.close(code=close_code, reason=exc.detail)
        return

    channel = f"mission:{mission_id}"
    await ws_manager.connect(websocket, channel=channel)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except Exception:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, channel=channel)
    except Exception as exc:
        logger.debug(f"WS mission disconnect on {mission_id}: {exc}")
        await ws_manager.disconnect(websocket, channel=channel)
