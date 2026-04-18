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
from datetime import datetime, timezone

from agents.data_agent import DataAgent
from db.paper_models import PaperSession, PaperOrder
from db.database import db
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
            sessions = list(PaperSession.select().where(PaperSession.is_active == True))
            for session in sessions:
                await asyncio.to_thread(paper_service.record_snapshot, session.id)
        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.warning(f"[PaperScheduler] Snapshot error: {e}")

async def _limit_order_loop() -> None:
    while True:
        await asyncio.sleep(LIMIT_CHECK_INTERVAL)
        try:
            pending = list(
                PaperOrder.select()
                .where(PaperOrder.status == "PENDING")
                .where(PaperOrder.order_type.in_(["LIMIT", "STOP"]))
            )
            for order in pending:
                await asyncio.to_thread(_check_and_fill, order)
        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.warning(f"[PaperScheduler] Limit check error: {e}")


def _check_and_fill(order: PaperOrder) -> None:
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
        session = order.session
        with db:
            try:
                paper_service._fill_order(session, order, price)
                logger.info(f"[PaperScheduler] Filled {order.order_type} {order.side} "
                            f"{order.quantity} {order.symbol} @ {price}")
            except Exception as e:
                logger.warning(f"[PaperScheduler] Fill failed for order {order.id}: {e}")
                order.status = "REJECTED"
                order.save()