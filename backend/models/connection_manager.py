from fastapi import WebSocket
from typing import List, Dict


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, trip_id: str):
        """
        建立websocket連線
        """
        await websocket.accept()
        if trip_id not in self.active_connections:
            self.active_connections[trip_id] = []
        self.active_connections[trip_id].append(websocket)

    def disconnect(self, websocket: WebSocket, trip_id: str):
        """
        中斷websocket連線
        """
        if trip_id in self.active_connections:
            self.active_connections[trip_id].remove(websocket)

    async def broadcast_to_trip(self, trip_id: str, message: dict):
        """
        發送給該 trip 下的所有人
        """
        if trip_id in self.active_connections:
            for connection in self.active_connections[trip_id]:
                await connection.send_json(message)


manager = ConnectionManager()
