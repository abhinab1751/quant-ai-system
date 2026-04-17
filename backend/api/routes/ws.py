import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.ws.connection_manager import manager
from core.ws.price_broadcaster import ensure_streaming, stop_streaming

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/price/{symbol}")
async def ws_price(ws: WebSocket, symbol: str):
    sym = symbol.upper()

    await manager.connect(ws, sym)
    ensure_streaming(sym)

    await manager.send_personal(ws, {
        "type":    "connected",
        "symbol":  sym,
        "message": f"Streaming live prices for {sym}. Updates every 5s.",
    })

    try:
        while True:
            data = await ws.receive_text()
            if data.strip().lower() == "ping":
                await manager.send_personal(ws, {"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(ws, sym)

        if not manager.has_subscribers(sym):
            stop_streaming(sym)