from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Optional

from sqlalchemy import delete, select, update

from agents.data_agent import DataAgent
from db.database import (
    SessionLocal,
    PaperSession,
    PaperOrder,
    PaperTrade,
    PaperPosition,
    PaperSnapshot,
)

logger = logging.getLogger(__name__)
data_agent = DataAgent()

MAX_POSITION_PCT = 0.25
MAX_ORDER_VALUE = 50_000
MIN_CASH_RESERVE = 500
MAX_DAILY_LOSS_PCT = 0.05


class RiskError(ValueError):
    """Raised when an order violates a risk gate."""


class PaperTradingService:

    def get_or_create_default_session(self) -> PaperSession:
        with SessionLocal() as db:
            session = (
                db.execute(select(PaperSession).where(PaperSession.is_active.is_(True)))
                .scalars()
                .first()
            )
            if session:
                return session

            session = PaperSession(
                name="Default",
                initial_capital=100_000.0,
                cash=100_000.0,
                is_active=True,
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            return session

    def get_session(self, session_id: int) -> PaperSession:
        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")
            return session

    def create_session(self, name: str, initial_capital: float) -> PaperSession:
        with SessionLocal() as db:
            db.execute(update(PaperSession).values(is_active=False))
            session = PaperSession(
                name=name,
                initial_capital=initial_capital,
                cash=initial_capital,
                is_active=True,
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            return session

    def reset_session(self, session_id: int) -> PaperSession:
        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")

            db.execute(delete(PaperOrder).where(PaperOrder.session_id == session_id))
            db.execute(delete(PaperTrade).where(PaperTrade.session_id == session_id))
            db.execute(delete(PaperPosition).where(PaperPosition.session_id == session_id))
            db.execute(delete(PaperSnapshot).where(PaperSnapshot.session_id == session_id))

            session.cash = session.initial_capital
            db.commit()
            db.refresh(session)
            return session

    def place_order(
        self,
        session_id: int,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        limit_price: Optional[float] = None,
        source: str = "MANUAL",
        ai_reason: Optional[str] = None,
    ) -> dict:
        symbol = symbol.upper()
        side = side.upper()
        order_type = order_type.upper()

        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")

            price = data_agent.get_current_price(symbol)
            if price is None:
                raise ValueError(f"Cannot get price for {symbol} - invalid symbol?")

            fill_price = limit_price if order_type == "LIMIT" else price
            if fill_price is None:
                raise ValueError("limit_price is required for LIMIT orders")

            order_value = fill_price * quantity
            self._check_risk(db, session, symbol, side, quantity, fill_price, order_value)

            order = PaperOrder(
                session_id=session.id,
                symbol=symbol,
                side=side,
                order_type=order_type,
                quantity=quantity,
                limit_price=limit_price,
                status="PENDING",
                source=source,
                ai_reason=ai_reason,
            )
            db.add(order)
            db.flush()

            if order_type == "MARKET":
                result = self._fill_order(session, order, price, db)
                db.commit()
                return result

            db.commit()
            return {
                "order_id": order.id,
                "status": "PENDING",
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "limit_price": limit_price,
            }

    def _check_risk(
        self,
        db,
        session: PaperSession,
        symbol: str,
        side: str,
        quantity: float,
        price: float,
        order_value: float,
    ):
        portfolio_value = self._portfolio_value(session)

        if order_value > MAX_ORDER_VALUE:
            raise RiskError(
                f"Order value ${order_value:,.0f} exceeds max ${MAX_ORDER_VALUE:,.0f}"
            )

        if side == "BUY":
            if order_value > session.cash - MIN_CASH_RESERVE:
                raise RiskError(
                    f"Insufficient cash. Available: ${session.cash - MIN_CASH_RESERVE:,.2f}, "
                    f"Required: ${order_value:,.2f}"
                )

            pos = (
                db.execute(
                    select(PaperPosition).where(
                        (PaperPosition.session_id == session.id)
                        & (PaperPosition.symbol == symbol)
                    )
                )
                .scalars()
                .first()
            )
            existing_value = (pos.quantity * price) if pos else 0.0

            new_position_pct = (existing_value + order_value) / max(portfolio_value, 1)
            if new_position_pct > MAX_POSITION_PCT:
                raise RiskError(
                    f"Position in {symbol} would be {new_position_pct:.0%} of portfolio "
                    f"(max {MAX_POSITION_PCT:.0%})"
                )

        elif side == "SELL":
            pos = (
                db.execute(
                    select(PaperPosition).where(
                        (PaperPosition.session_id == session.id)
                        & (PaperPosition.symbol == symbol)
                    )
                )
                .scalars()
                .first()
            )
            if not pos:
                raise RiskError(f"No position in {symbol} to sell")
            if pos.quantity < quantity:
                raise RiskError(
                    f"Only hold {pos.quantity:.4f} shares of {symbol}, cannot sell {quantity:.4f}"
                )

        daily_pnl_pct = self._daily_pnl_pct(session, portfolio_value)
        if daily_pnl_pct < -MAX_DAILY_LOSS_PCT:
            raise RiskError(
                f"Daily loss limit reached ({daily_pnl_pct:.1%}). "
                f"Trading halted until tomorrow."
            )

    def _fill_order(
        self,
        session: PaperSession,
        order: PaperOrder,
        fill_price: float,
        db,
    ) -> dict:
        symbol = order.symbol
        side = order.side
        quantity = order.quantity
        value = fill_price * quantity
        realised_pnl = 0.0

        pos = (
            db.execute(
                select(PaperPosition).where(
                    (PaperPosition.session_id == session.id)
                    & (PaperPosition.symbol == symbol)
                )
            )
            .scalars()
            .first()
        )

        if side == "BUY":
            if pos:
                total_qty = pos.quantity + quantity
                pos.avg_cost = (pos.quantity * pos.avg_cost + quantity * fill_price) / total_qty
                pos.quantity = total_qty
                pos.updated_at = datetime.utcnow()
            else:
                db.add(
                    PaperPosition(
                        session_id=session.id,
                        symbol=symbol,
                        quantity=quantity,
                        avg_cost=fill_price,
                    )
                )
            session.cash -= value

        elif side == "SELL":
            if not pos:
                raise RiskError(f"No position in {symbol} to sell")

            realised_pnl = (fill_price - pos.avg_cost) * quantity
            pos.quantity -= quantity
            pos.realised_pnl += realised_pnl
            pos.updated_at = datetime.utcnow()

            if pos.quantity <= 1e-6:
                db.delete(pos)

            session.cash += value

        order.status = "FILLED"
        order.filled_at = datetime.utcnow()

        trade = PaperTrade(
            session_id=session.id,
            order_id=order.id,
            symbol=symbol,
            side=side,
            quantity=quantity,
            fill_price=fill_price,
            pnl=realised_pnl,
        )
        db.add(trade)
        db.flush()

        return {
            "order_id": order.id,
            "trade_id": trade.id,
            "status": "FILLED",
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "fill_price": round(fill_price, 4),
            "value": round(value, 2),
            "realised_pnl": round(realised_pnl, 2),
            "cash_remaining": round(session.cash, 2),
        }

    def execute_ai_signal(
        self,
        session_id: int,
        symbol: str,
        action: str,
        confidence: float,
        reason: str,
    ) -> Optional[dict]:
        if action == "HOLD":
            return None

        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")

            price = data_agent.get_current_price(symbol)
            if not price:
                return None

            portfolio_value = self._portfolio_value(session)

            if action == "BUY":
                size_pct = 0.05 + min(confidence, 1.0) * 0.10
                order_value = portfolio_value * size_pct
                quantity = round(order_value / price, 4)
                if quantity < 0.001:
                    return None
            else:
                pos = (
                    db.execute(
                        select(PaperPosition).where(
                            (PaperPosition.session_id == session.id)
                            & (PaperPosition.symbol == symbol)
                        )
                    )
                    .scalars()
                    .first()
                )
                if not pos:
                    return None
                quantity = pos.quantity

        try:
            return self.place_order(
                session_id=session_id,
                symbol=symbol,
                side=action,
                quantity=quantity,
                order_type="MARKET",
                source="AI_SIGNAL",
                ai_reason=reason,
            )
        except (RiskError, ValueError) as e:
            logger.warning(f"AI signal rejected for {symbol}: {e}")
            return {"error": str(e), "symbol": symbol, "action": action}

    def _portfolio_value(self, session: PaperSession) -> float:
        positions_value = 0.0
        with SessionLocal() as db:
            positions = (
                db.execute(
                    select(PaperPosition).where(PaperPosition.session_id == session.id)
                )
                .scalars()
                .all()
            )
            for pos in positions:
                price = data_agent.get_current_price(pos.symbol)
                if price:
                    positions_value += pos.quantity * price
        return session.cash + positions_value

    def _daily_pnl_pct(self, session: PaperSession, portfolio_value: float) -> float:
        today_start = datetime.combine(date.today(), datetime.min.time())
        with SessionLocal() as db:
            snap = (
                db.execute(
                    select(PaperSnapshot)
                    .where(
                        (PaperSnapshot.session_id == session.id)
                        & (PaperSnapshot.recorded_at >= today_start)
                    )
                    .order_by(PaperSnapshot.recorded_at.asc())
                )
                .scalars()
                .first()
            )
        if not snap:
            return 0.0
        return (portfolio_value - snap.portfolio_value) / max(snap.portfolio_value, 1)

    def get_portfolio_state(self, session_id: int) -> dict:
        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")

            positions = (
                db.execute(select(PaperPosition).where(PaperPosition.session_id == session_id))
                .scalars()
                .all()
            )

            positions_detail = []
            positions_value = 0.0

            for pos in positions:
                price = data_agent.get_current_price(pos.symbol) or pos.avg_cost
                mkt_value = pos.quantity * price
                unrealised_pnl = (price - pos.avg_cost) * pos.quantity
                unrealised_pct = ((price / pos.avg_cost) - 1) * 100 if pos.avg_cost else 0
                positions_value += mkt_value

                positions_detail.append(
                    {
                        "symbol": pos.symbol,
                        "quantity": round(pos.quantity, 4),
                        "avg_cost": round(pos.avg_cost, 4),
                        "current_price": round(price, 4),
                        "market_value": round(mkt_value, 2),
                        "unrealised_pnl": round(unrealised_pnl, 2),
                        "unrealised_pct": round(unrealised_pct, 2),
                        "realised_pnl": round(pos.realised_pnl, 2),
                    }
                )

            portfolio_value = session.cash + positions_value
            total_pnl = portfolio_value - session.initial_capital
            total_pnl_pct = (total_pnl / session.initial_capital) * 100

            trades = (
                db.execute(
                    select(PaperTrade).where(
                        (PaperTrade.session_id == session_id) & (PaperTrade.side == "SELL")
                    )
                )
                .scalars()
                .all()
            )
            wins = sum(1 for t in trades if t.pnl > 0)
            win_rate = (wins / len(trades) * 100) if trades else 0.0
            total_realised = sum(t.pnl for t in trades)

            daily_pnl_pct = self._daily_pnl_pct(session, portfolio_value)

            return {
                "session_id": session.id,
                "session_name": session.name,
                "initial_capital": round(session.initial_capital, 2),
                "cash": round(session.cash, 2),
                "positions_value": round(positions_value, 2),
                "portfolio_value": round(portfolio_value, 2),
                "total_pnl": round(total_pnl, 2),
                "total_pnl_pct": round(total_pnl_pct, 2),
                "daily_pnl_pct": round(daily_pnl_pct * 100, 2),
                "total_realised": round(total_realised, 2),
                "win_rate": round(win_rate, 2),
                "total_trades": len(trades),
                "positions": sorted(positions_detail, key=lambda x: -x["market_value"]),
            }

    def record_snapshot(self, session_id: int) -> PaperSnapshot:
        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")

            positions = (
                db.execute(select(PaperPosition).where(PaperPosition.session_id == session_id))
                .scalars()
                .all()
            )
            positions_value = 0.0
            for pos in positions:
                price = data_agent.get_current_price(pos.symbol) or pos.avg_cost
                positions_value += pos.quantity * price

            portfolio_value = session.cash + positions_value
            snap = PaperSnapshot(
                session_id=session.id,
                portfolio_value=portfolio_value,
                cash=session.cash,
                positions_value=positions_value,
            )
            db.add(snap)
            db.commit()
            db.refresh(snap)
            return snap

    def get_equity_curve(self, session_id: int, limit: int = 500) -> list[dict]:
        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")

            snapshots = (
                db.execute(
                    select(PaperSnapshot)
                    .where(PaperSnapshot.session_id == session_id)
                    .order_by(PaperSnapshot.recorded_at.asc())
                    .limit(limit)
                )
                .scalars()
                .all()
            )

            return [
                {
                    "t": s.recorded_at.isoformat(),
                    "v": round(s.portfolio_value, 2),
                    "c": round(s.cash, 2),
                    "pv": round(s.positions_value, 2),
                }
                for s in snapshots
            ]

    def get_trade_history(self, session_id: int, limit: int = 100) -> list[dict]:
        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")

            trades = (
                db.execute(
                    select(PaperTrade)
                    .where(PaperTrade.session_id == session_id)
                    .order_by(PaperTrade.created_at.desc())
                    .limit(limit)
                )
                .scalars()
                .all()
            )

            return [
                {
                    "id": t.id,
                    "symbol": t.symbol,
                    "side": t.side,
                    "quantity": round(t.quantity, 4),
                    "fill_price": round(t.fill_price, 4),
                    "value": round(t.quantity * t.fill_price, 2),
                    "pnl": round(t.pnl, 2),
                    "source": t.order.source if t.order else "MANUAL",
                    "ai_reason": t.order.ai_reason if t.order else None,
                    "created_at": t.created_at.isoformat(),
                }
                for t in trades
            ]

    def get_benchmark_comparison(self, session_id: int) -> dict:
        with SessionLocal() as db:
            session = db.get(PaperSession, session_id)
            if not session:
                raise ValueError("Session not found")

            snapshots = (
                db.execute(
                    select(PaperSnapshot)
                    .where(PaperSnapshot.session_id == session_id)
                    .order_by(PaperSnapshot.recorded_at.asc())
                )
                .scalars()
                .all()
            )

        if len(snapshots) < 2:
            return {"portfolio": [], "benchmark": [], "labels": []}

        start_val = snapshots[0].portfolio_value
        portfolio_pts = [round((s.portfolio_value / start_val) * 100, 2) for s in snapshots]

        start_time = snapshots[0].recorded_at
        end_time = snapshots[-1].recorded_at
        labels = [s.recorded_at.strftime("%m/%d %H:%M") for s in snapshots]

        benchmark_pts = [100.0] * len(snapshots)

        return {
            "portfolio": portfolio_pts,
            "benchmark": benchmark_pts,
            "labels": labels,
            "start_date": start_time.isoformat(),
            "end_date": end_time.isoformat(),
            "portfolio_return": round((portfolio_pts[-1] / 100 - 1) * 100, 2),
            "benchmark_return": round((benchmark_pts[-1] / 100 - 1) * 100, 2),
        }


paper_service = PaperTradingService()
