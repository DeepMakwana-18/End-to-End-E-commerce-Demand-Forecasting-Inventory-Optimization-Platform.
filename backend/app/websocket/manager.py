"""Tenant-aware WebSocket connection manager.

Manages WebSocket connections organized by organization (tenant).
Provides methods to broadcast events to all users in an org,
or send targeted messages to specific users.

This is a thin transport layer — no business logic.
Events are published by the event bus and routed here via event handlers.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger("titan.ws")


class ConnectionManager:
    """Manages active WebSocket connections per organization.

    Thread-safe for single-process use (uvicorn with --workers=1).
    For multi-process deployments, use Redis pub/sub as a transport
    layer (future enhancement).
    """

    def __init__(self) -> None:
        # org_id -> set of (user_id, WebSocket) tuples
        self._connections: dict[int, set[tuple[int, WebSocket]]] = {}

    @property
    def total_connections(self) -> int:
        """Total active connections across all orgs."""
        return sum(len(conns) for conns in self._connections.values())

    # ── Connection Lifecycle ────────────────────────────────────────

    async def connect(self, websocket: WebSocket, org_id: int, user_id: int) -> None:
        """Accept and register a WebSocket connection."""
        await websocket.accept()
        self._connections.setdefault(org_id, set()).add((user_id, websocket))
        logger.info(
            "WS connected: user=%d org=%d (total=%d)",
            user_id,
            org_id,
            self.total_connections,
        )

    def disconnect(self, websocket: WebSocket, org_id: int, user_id: int) -> None:
        """Remove a WebSocket connection."""
        conns = self._connections.get(org_id)
        if conns:
            conns.discard((user_id, websocket))
            if not conns:
                del self._connections[org_id]
        logger.info(
            "WS disconnected: user=%d org=%d (total=%d)",
            user_id,
            org_id,
            self.total_connections,
        )

    # ── Broadcasting ────────────────────────────────────────────────

    async def broadcast_to_org(
        self, org_id: int, event_type: str, data: dict[str, Any]
    ) -> None:
        """Send an event to all connected users in an organization."""
        conns = self._connections.get(org_id)
        if not conns:
            return

        message = json.dumps(
            {"type": event_type, "data": data},
            default=str,
        )

        stale: list[tuple[int, WebSocket]] = []
        for user_id, ws in conns:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append((user_id, ws))

        # Clean up stale connections
        for entry in stale:
            conns.discard(entry)
            logger.debug("Removed stale WS: user=%d org=%d", entry[0], org_id)

    async def send_to_user(
        self, org_id: int, user_id: int, event_type: str, data: dict[str, Any]
    ) -> None:
        """Send an event to a specific user in an organization."""
        conns = self._connections.get(org_id)
        if not conns:
            return

        message = json.dumps(
            {"type": event_type, "data": data},
            default=str,
        )

        for uid, ws in conns:
            if uid == user_id:
                try:
                    await ws.send_text(message)
                except Exception:
                    pass

    async def broadcast_all(self, event_type: str, data: dict[str, Any]) -> None:
        """Send an event to ALL connected clients (system-wide)."""
        for org_id in list(self._connections.keys()):
            await self.broadcast_to_org(org_id, event_type, data)


# ── Singleton ───────────────────────────────────────────────────────

ws_manager = ConnectionManager()
