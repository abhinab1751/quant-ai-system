import asyncio
import logging
from datetime import datetime, timezone

from agents.data_agent import DataAgent
from core.ws.connection_manager import manager
from db.db_service import save_price

logger     = logging.getLogger(__name__)
data_agent = DataAgent()

POLL_INTERVAL = 5     
_tasks: dict[str, asyncio.Task] = {}  


def ensure_streaming(symbol: str) -> None:
    if symbol not in _tasks or _tasks[symbol].done():
        task = asyncio.create_task(_stream_loop(symbol))
        task.set_name(f"price-stream-{symbol}")
        _tasks[symbol] = task
        logger.info(f"[Broadcaster] Started streaming task for {symbol}")


def stop_streaming(symbol: str) -> None:
    task = _tasks.pop(symbol, None)
    if task and not task.done():
        task.cancel()
        logger.info(f"[Broadcaster] Stopped streaming task for {symbol}")


async def _stream_loop(symbol: str) -> None:
    last_price: float | None = None

    while True:
        try:
            if not manager.has_subscribers(symbol):
                logger.info(f"[Broadcaster] No subscribers for {symbol}, stopping.")
                _tasks.pop(symbol, None)
                return

            price = await asyncio.to_thread(data_agent.get_current_price, symbol)

            if price is not None:
                change    = price - last_price if last_price is not None else 0.0
                change_pct = (change / last_price * 100) if last_price else 0.0

                payload = {
                    "type":       "price",
                    "symbol":     symbol,
                    "price":      round(price, 4),
                    "change":     round(change, 4),
                    "change_pct": round(change_pct, 4),
                    "timestamp":  datetime.now(timezone.utc).isoformat(),
                }

                await manager.broadcast(symbol, payload)
                if price != last_price:
                    await asyncio.to_thread(save_price, symbol, price)
                    last_price = price

        except asyncio.CancelledError:
            logger.info(f"[Broadcaster] Task cancelled for {symbol}")
            return
        except Exception as e:
            logger.warning(f"[Broadcaster] Error for {symbol}: {e}")
            await manager.broadcast(symbol, {
                "type":    "error",
                "symbol":  symbol,
                "message": str(e),
            })

        await asyncio.sleep(POLL_INTERVAL)