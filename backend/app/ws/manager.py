from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
import logging
import asyncio

logger = logging.getLogger("agentic_os.ws")


class ConnectionManager:
    """
    Manages active WebSocket connections with room/channel segmentation and dead connection cleanup.
    """

    def __init__(self):
        # channel -> set of active WebSocket instances
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()
        self._bus_subscribed = False

    async def connect(self, websocket: WebSocket, channel: str = "system") -> None:
        await websocket.accept()
        async with self._lock:
            if channel not in self._connections:
                self._connections[channel] = set()
            self._connections[channel].add(websocket)
        logger.info(f"WebSocket client connected to channel '{channel}' (active in room: {len(self._connections[channel])})")

    async def disconnect(self, websocket: WebSocket, channel: str = "system") -> None:
        async with self._lock:
            if channel in self._connections:
                self._connections[channel].discard(websocket)
                if not self._connections[channel]:
                    del self._connections[channel]
        logger.info(f"WebSocket client disconnected from channel '{channel}'")

    def get_channel_connection_count(self, channel: str = "system") -> int:
        return len(self._connections.get(channel, set()))

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket) -> None:
        try:
            await websocket.send_json(message)
        except Exception as exc:
            logger.debug(f"Failed to send personal WS message: {exc}")

    async def broadcast_to_channel(self, channel: str, message: Dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._connections.get(channel, set()))

        if not sockets:
            return

        dead_sockets = set()
        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception as exc:
                logger.debug(f"Dead WebSocket on channel '{channel}': {exc}")
                dead_sockets.add(ws)

        if dead_sockets:
            async with self._lock:
                if channel in self._connections:
                    self._connections[channel].difference_update(dead_sockets)

    async def handle_bus_event(self, event: Dict[str, Any]) -> None:
        """
        Receives published events from EventBus and broadcasts to:
        1. System-wide listeners ('system')
        2. Mission-specific listeners (if event has 'mission_id')
        """
        # Broadcast to system channel
        await self.broadcast_to_channel("system", event)

        # Broadcast to mission channel if present
        mission_id = event.get("mission_id")
        if mission_id:
            mission_channel = f"mission:{mission_id}"
            await self.broadcast_to_channel(mission_channel, event)


# Global connection manager singleton
ws_manager = ConnectionManager()
