import asyncio
import logging
from datetime import datetime, timezone, timedelta

from agents.data_agent import DataAgent
from core.ws.connection_manager import manager
from db.database import save_price

logger     = logging.getLogger(__name__)
data_agent = DataAgent()

POLL_INTERVAL            = 5      
PRICE_SAVE_INTERVAL      = 60     
PRICE_CHANGE_THRESHOLD_PCT = 0.01 

_state:  dict[str, dict] = {}
_tasks:  dict[str, asyncio.Task] = {}


def ensure_streaming(symbol: str) -> None:
    if symbol not in _tasks or _tasks[symbol].done():
        task = asyncio.create_task(_stream_loop(symbol))
        task.set_name(f"price-stream-{symbol}")
        _tasks[symbol] = task
        logger.info(f"[Broadcaster] Started streaming for {symbol}")


def stop_streaming(symbol: str) -> None:
    task = _tasks.pop(symbol, None)
    if task and not task.done():
        task.cancel()
        logger.info(f"[Broadcaster] Stopped streaming for {symbol}")


async def _stream_loop(symbol: str) -> None:
    if symbol not in _state:
        _state[symbol] = {
            "last_price":       None,
            "last_saved":       None,   
            "last_saved_price": None,   
        }

    while True:
        try:
            if not manager.has_subscribers(symbol):
                logger.info(f"[Broadcaster] No subscribers for {symbol}, stopping.")
                _tasks.pop(symbol, None)
                _state.pop(symbol, None)
                return

            price = await asyncio.to_thread(data_agent.get_current_price, symbol)

            if price is not None:
                state      = _state[symbol]
                prev_price = state["last_price"]
                change     = price - prev_price if prev_price is not None else 0.0
                change_pct = (change / prev_price * 100) if prev_price else 0.0
                now        = datetime.now(timezone.utc)

                payload = {
                    "type":       "price",
                    "symbol":     symbol,
                    "price":      round(price, 4),
                    "change":     round(change, 4),
                    "change_pct": round(change_pct, 4),
                    "timestamp":  now.isoformat(),
                }
                await manager.broadcast(symbol, payload)

                should_save = _should_save(state, price, now)

                if should_save:
                    await asyncio.to_thread(save_price, symbol, price)
                    state["last_saved"]       = now
                    state["last_saved_price"] = price
                    logger.debug(f"[Broadcaster] Saved {symbol} @ {price:.4f}")

                state["last_price"] = price

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


def _should_save(state: dict, price: float, now: datetime) -> bool:

    last_saved       = state["last_saved"]
    last_saved_price = state["last_saved_price"]

    if last_saved is None:
        return True

    seconds_since_save = (now - last_saved).total_seconds()

    if last_saved_price and seconds_since_save >= 10:
        move_pct = abs((price - last_saved_price) / last_saved_price * 100)
        if move_pct >= PRICE_CHANGE_THRESHOLD_PCT:
            return True

    return seconds_since_save >= PRICE_SAVE_INTERVAL


async def purge_duplicate_prices(symbol: str = None, keep_every_minutes: int = 5):
    from db.database import engine
    import sqlalchemy as sa

    async def _purge(sym_filter=None):
        sql = """
        DELETE FROM price
        WHERE id NOT IN (
            SELECT DISTINCT ON (
                symbol,
                date_trunc('minute', fetched_at) / :interval * :interval
            ) id
            FROM price
            {where}
            ORDER BY
                symbol,
                date_trunc('minute', fetched_at) / :interval * :interval,
                fetched_at DESC
        )
        """.format(where=f"WHERE symbol = '{sym_filter}'" if sym_filter else "")

        with engine.connect() as conn:
            result = conn.execute(
                sa.text("""
                DELETE FROM price
                WHERE id NOT IN (
                    SELECT id FROM (
                        SELECT id,
                               ROW_NUMBER() OVER (
                                   PARTITION BY symbol,
                                   (EXTRACT(EPOCH FROM fetched_at)::bigint / :interval)
                                   ORDER BY fetched_at DESC
                               ) AS rn
                        FROM price
                        {where}
                    ) ranked
                    WHERE rn = 1
                )
                """.format(where=f"WHERE symbol = :sym" if sym_filter else "")
                ),
                {"interval": keep_every_minutes * 60, **({"sym": sym_filter} if sym_filter else {})}
            )
            conn.commit()
            deleted = result.rowcount
            logger.info(f"[Purge] Removed {deleted} duplicate price rows"
                        + (f" for {sym_filter}" if sym_filter else " (all symbols)"))
            return deleted

    return await asyncio.to_thread(_purge, symbol)