"""WebSocket endpoint routes.

Provides a single /ws endpoint that:
  1. Authenticates via JWT (query param)
  2. Registers the connection with the tenant-aware manager
  3. Maintains a keep-alive ping/pong loop
  4. Delivers events pushed by the event bus

No business logic lives here — this is pure transport.
"""

from __future__ import annotations

import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.security import decode_token
from app.websocket.manager import ws_manager

logger = logging.getLogger("titan.ws.routes")

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """Authenticated WebSocket endpoint.

    Connect: ws://host/ws?token=<jwt>

    The server pushes domain events to the client.
    The client can send ping/pong or simple ack messages.
    """
    # 1. Authenticate
    payload = decode_token(token)
    if payload is None:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    user_id = payload.get("sub")
    org_id = payload.get("org_id")

    if not user_id or not org_id:
        await websocket.close(code=4001, reason="Invalid token claims")
        return

    user_id = int(user_id)
    org_id = int(org_id)

    # 2. Register connection
    await ws_manager.connect(websocket, org_id, user_id)

    try:
        # 3. Keep-alive loop — listen for client messages
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=60.0,  # Heartbeat interval
                )
                # Handle client messages (ping, ack, etc.)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send server-side ping to keep connection alive
                try:
                    await websocket.send_text('{"type":"ping"}')
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket error: user=%d org=%d", user_id, org_id)
    finally:
        ws_manager.disconnect(websocket, org_id, user_id)
