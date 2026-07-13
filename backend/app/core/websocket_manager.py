from typing import Dict, List, Set, Optional
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> active WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Maps role -> set of user_ids
        self.role_map: Dict[str, Set[int]] = {
            "admin": set(),
            "agent": set(),
            "customer": set(),
        }
        # Maps connection -> user metadata
        self.connection_metadata: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        # Add to role map
        if role in self.role_map:
            self.role_map[role].add(user_id)
            
        self.connection_metadata[websocket] = {"user_id": user_id, "role": role}
        logger.info(f"User {user_id} ({role}) connected via WebSocket. Active connections: {len(self.connection_metadata)}")

    def disconnect(self, websocket: WebSocket):
        meta = self.connection_metadata.pop(websocket, None)
        if meta:
            user_id = meta["user_id"]
            role = meta["role"]
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    self.active_connections.pop(user_id)
                    if role in self.role_map:
                        self.role_map[role].discard(user_id)
        logger.info(f"WebSocket disconnected. Active connections: {len(self.connection_metadata)}")

    async def send_personal_message(self, message: dict, user_id: int):
        sockets = list(self.active_connections.get(user_id, set()))
        for socket in sockets:
            try:
                await socket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id}: {e}")

    async def broadcast_to_role(self, message: dict, role: str):
        user_ids = list(self.role_map.get(role, set()))
        for u_id in user_ids:
            await self.send_personal_message(message, u_id)

    async def broadcast_to_roles(self, message: dict, roles: List[str]):
        for role in roles:
            await self.broadcast_to_role(message, role)

manager = ConnectionManager()
