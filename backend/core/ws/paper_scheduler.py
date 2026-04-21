"""
core/ws/paper_scheduler.py
---------------------------
Background tasks for the Paper Trading Simulator:

  1. Portfolio snapshot every 60 s  → equity curve
  2. Limit-order check every 5 s    → fill pending LIMIT orders
  3. AI auto-trade every 5 min      → optional, session-controlled
"""

import asyncio
import logging
from sqlalchemy import select

from agents.data_agent import DataAgent
from db.database import SessionLocal, PaperSession, PaperOrder
from services.paper_trading_service import paper_service

logger     = logging.getLogger(__name__)
data_agent = DataAgent()

SNAPSHOT_INTERVAL  = 60    
LIMIT_CHECK_INTERVAL = 5   

_tasks: list[asyncio.Task] = []


def start_paper_scheduler() -> None:
    t1 = asyncio.create_task(_snapshot_loop(), name="paper-snapshot")
    t2 = asyncio.create_task(_limit_order_loop(), name="paper-limit-check")
    _tasks.extend([t1, t2])
    logger.info("[PaperScheduler] Started snapshot + limit-order tasks")


def stop_paper_scheduler() -> None:
    for t in _tasks:
        if not t.done():
            t.cancel()
    _tasks.clear()
    logger.info("[PaperScheduler] Stopped")

async def _snapshot_loop() -> None:
    while True:
        await asyncio.sleep(SNAPSHOT_INTERVAL)
        try:
            with SessionLocal() as db:
                sessions = [
                    (s.id, s.user_id)
                    for s in db.execute(
                        select(PaperSession).where(PaperSession.is_active.is_(True))
                    )
                    .scalars()
                    .all()
                ]
            for session_id, user_id in sessions:
                if user_id is None:
                    continue
                await asyncio.to_thread(paper_service.record_snapshot, session_id, user_id)
        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.warning(f"[PaperScheduler] Snapshot error: {e}")

async def _limit_order_loop() -> None:
    while True:
        await asyncio.sleep(LIMIT_CHECK_INTERVAL)
        try:
            with SessionLocal() as db:
                pending_ids = [
                    o.id
                    for o in db.execute(
                        select(PaperOrder).where(
                            (PaperOrder.status == "PENDING")
                            & (PaperOrder.order_type.in_(["LIMIT", "STOP"]))
                        )
                    )
                    .scalars()
                    .all()
                ]
            for order_id in pending_ids:
                await asyncio.to_thread(_check_and_fill, order_id)
        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.warning(f"[PaperScheduler] Limit check error: {e}")


def _check_and_fill(order_id: int) -> None:
    with SessionLocal() as db:
        order = db.get(PaperOrder, order_id)
        if not order or order.status != "PENDING":
            return

    price = data_agent.get_current_price(order.symbol)
    if price is None:
        return

    triggered = False

    if order.order_type == "LIMIT":
        if order.side == "BUY"  and price <= order.limit_price:
            triggered = True
        if order.side == "SELL" and price >= order.limit_price:
            triggered = True

    elif order.order_type == "STOP":
        if order.side == "BUY"  and price >= order.stop_price:
            triggered = True
        if order.side == "SELL" and price <= order.stop_price:
            triggered = True

    if triggered:
        session = db.get(PaperSession, order.session_id)
        if not session:
            return
        try:
            paper_service._fill_order(session, order, price, db)
            db.commit()
            logger.info(
                f"[PaperScheduler] Filled {order.order_type} {order.side} "
                f"{order.quantity} {order.symbol} @ {price}"
            )
        except Exception as e:
            logger.warning(f"[PaperScheduler] Fill failed for order {order.id}: {e}")
            order.status = "REJECTED"
            db.commit()