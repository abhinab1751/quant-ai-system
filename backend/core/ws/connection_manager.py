import asyncio
import json
import logging
from collections import defaultdict
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:

    def __init__(self):
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket, symbol: str) -> None:
        await ws.accept()
        async with self._lock:
            self._connections[symbol].add(ws)
        logger.info(f"[WS] Client connected  → {symbol}  "
                    f"(total: {self.count(symbol)})")

    def disconnect(self, ws: WebSocket, symbol: str) -> None:
        self._connections[symbol].discard(ws)
        logger.info(f"[WS] Client disconnected ← {symbol}  "
                    f"(total: {self.count(symbol)})")

    def count(self, symbol: str) -> int:
        return len(self._connections.get(symbol, set()))

    def has_subscribers(self, symbol: str) -> bool:
        return self.count(symbol) > 0

    def all_symbols(self) -> list[str]:
        return [s for s, conns in self._connections.items() if conns]

    async def broadcast(self, symbol: str, data: dict) -> None:
        connections = list(self._connections.get(symbol, set()))
        if not connections:
            return

        payload = json.dumps(data)
        dead: list[WebSocket] = []

        for ws in connections:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(ws, symbol)

    async def send_personal(self, ws: WebSocket, data: dict) -> None:
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            pass

manager = ConnectionManager()