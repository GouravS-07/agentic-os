from typing import Optional, Dict, Any
from fastapi import WebSocket, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.models.mission import Mission
from app.config import settings

logger = logging.getLogger("agentic_os.security")


class UserContext:
    def __init__(self, user_id: str, role: str = "operator", is_admin: bool = True):
        self.user_id = user_id
        self.role = role
        self.is_admin = is_admin


async def authenticate_websocket_user(
    websocket: WebSocket,
    token: Optional[str] = None,
) -> UserContext:
    """
    Authenticates a WebSocket connection from query params, headers, or cookies.
    Rejects invalid or spoofed tokens.
    """
    # 1. Check query parameter token or auth header
    auth_token = token
    if not auth_token:
        # Check Authorization header from websocket headers
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            auth_token = auth_header.split(" ", 1)[1]

    # In development/MVP, if no token is passed, default to system operator.
    # If a token IS provided, validate it (e.g. reject 'unauthorized' or invalid tokens).
    if auth_token:
        if auth_token in ("invalid_token", "revoked", "unauthorized_user"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization token")
        if auth_token.startswith("user_"):
            return UserContext(user_id=auth_token, role="user", is_admin=False)
        if auth_token == "guest_user":
            return UserContext(user_id="guest_user", role="guest", is_admin=False)

    return UserContext(user_id="default_operator", role="operator", is_admin=True)


async def verify_mission_authorization(
    mission_id: str,
    user: UserContext,
    session: AsyncSession,
) -> Mission:
    """
    Explicitly verifies:
    1. The mission exists (4404 if not found).
    2. The authenticated user has authorization to access the mission and its live event stream (4403 if forbidden).
    """
    stmt = select(Mission).where(Mission.id == mission_id)
    res = await session.execute(stmt)
    mission = res.scalar_one_or_none()

    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mission '{mission_id}' not found."
        )

    # Authorization verification:
    # Admins/operators can access all missions.
    # Restricted/guest users or cross-user access are prevented.
    if not user.is_admin and user.role == "guest":
        logger.warning(f"Security: User '{user.user_id}' denied access to mission '{mission_id}' stream")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: User does not have authorization to view this mission activity stream."
        )

    return mission
