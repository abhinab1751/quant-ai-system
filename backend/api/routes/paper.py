import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select, update

from services.paper_trading_service import paper_service, RiskError
from db.database import SessionLocal, PaperSession, PaperOrder
from services.auth_service import get_current_user
from db.auth_models import User

logger = logging.getLogger(__name__)
router = APIRouter(tags=["paper-trading"])

class CreateSessionRequest(BaseModel):
    name:            str   = Field("Default", min_length=1, max_length=80)
    initial_capital: float = Field(100_000.0, ge=1_000, le=10_000_000)

class PlaceOrderRequest(BaseModel):
    session_id:  int
    symbol:      str       = Field(..., min_length=1, max_length=10)
    side:        str       = Field(..., pattern="^(BUY|SELL)$")
    quantity:    float     = Field(..., gt=0)
    order_type:  str       = Field("MARKET", pattern="^(MARKET|LIMIT|STOP)$")
    limit_price: Optional[float] = Field(None, gt=0)
    source:      str       = Field("MANUAL")

class AIOrderRequest(BaseModel):
    session_id:  int
    symbol:      str
    action:      str       = Field(..., pattern="^(BUY|SELL|HOLD)$")
    confidence:  float     = Field(..., ge=0.0, le=1.0)
    reason:      str       = ""

@router.post("/sessions", summary="Create a paper trading session")
def create_session(req: CreateSessionRequest, current_user: User = Depends(get_current_user)):
    session = paper_service.create_session(current_user.id, req.name, req.initial_capital)
    return _session_dict(session)


@router.get("/sessions", summary="List all sessions")
def list_sessions(current_user: User = Depends(get_current_user)):
    with SessionLocal() as db:
        sessions = (
            db.execute(
                select(PaperSession)
                .where(PaperSession.user_id == current_user.id)
                .order_by(PaperSession.created_at.desc())
            )
            .scalars()
            .all()
        )

    if not sessions:
        # Preserve original UX: each user gets a starter $100k paper account.
        default_session = paper_service.get_or_create_default_session(current_user.id)
        sessions = [default_session]

    return [_session_dict(s) for s in sessions]


@router.get("/sessions/{session_id}", summary="Get session details")
def get_session(session_id: int, current_user: User = Depends(get_current_user)):
    with SessionLocal() as db:
        session = db.get(PaperSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(404, f"Session {session_id} not found")
    return _session_dict(session)


@router.delete("/sessions/{session_id}/reset", summary="Reset session")
def reset_session(session_id: int, current_user: User = Depends(get_current_user)):
    try:
        session = paper_service.reset_session(session_id, current_user.id)
        return {"message": f"Session '{session.name}' reset to ${session.initial_capital:,.2f}", **_session_dict(session)}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/sessions/{session_id}/activate", summary="Set active session")
def activate_session(session_id: int, current_user: User = Depends(get_current_user)):
    with SessionLocal() as db:
        session = db.get(PaperSession, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(404, f"Session {session_id} not found")
        db.execute(
            update(PaperSession)
            .where(PaperSession.user_id == current_user.id)
            .values(is_active=False)
        )
        session.is_active = True
        db.commit()
        return {"message": f"Session '{session.name}' is now active"}

@router.post("/orders", summary="Place a paper order")
def place_order(req: PlaceOrderRequest, current_user: User = Depends(get_current_user)):
    try:
        result = paper_service.place_order(
            user_id     = current_user.id,
            session_id  = req.session_id,
            symbol      = req.symbol.upper(),
            side        = req.side,
            quantity    = req.quantity,
            order_type  = req.order_type,
            limit_price = req.limit_price,
            source      = req.source,
        )
        return result
    except RiskError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Order failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders/ai", summary="Execute an AI signal as a paper order")
def ai_order(req: AIOrderRequest, current_user: User = Depends(get_current_user)):
    try:
        result = paper_service.execute_ai_signal(
            user_id    = current_user.id,
            session_id = req.session_id,
            symbol     = req.symbol.upper(),
            action     = req.action,
            confidence = req.confidence,
            reason     = req.reason,
        )
        if result is None:
            return {"message": "HOLD — no action taken"}
        return result
    except RiskError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"AI order failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}/orders", summary="Order history")
def get_orders(session_id: int, limit: int = Query(50, le=500), current_user: User = Depends(get_current_user)):
    with SessionLocal() as db:
        session = db.get(PaperSession, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(404, "Session not found")
        orders = (
            db.execute(
                select(PaperOrder)
                .where(PaperOrder.session_id == session_id)
                .order_by(PaperOrder.created_at.desc())
                .limit(limit)
            )
            .scalars()
            .all()
        )
        return [_order_dict(o) for o in orders]


@router.delete("/orders/{order_id}", summary="Cancel a pending order")
def cancel_order(order_id: int, current_user: User = Depends(get_current_user)):
    with SessionLocal() as db:
        order = db.get(PaperOrder, order_id)
        if not order:
            raise HTTPException(404, f"Order {order_id} not found")
        session = db.get(PaperSession, order.session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(404, f"Order {order_id} not found")
        if order.status != "PENDING":
            raise HTTPException(400, f"Order {order_id} is already {order.status}")
        order.status = "CANCELLED"
        db.commit()
        return {"message": f"Order {order_id} cancelled"}

@router.get("/sessions/{session_id}/portfolio", summary="Full portfolio state")
def get_portfolio(session_id: int, current_user: User = Depends(get_current_user)):
    try:
        return paper_service.get_portfolio_state(session_id, current_user.id)
    except ValueError:
        raise HTTPException(404, "Session not found")


@router.get("/sessions/{session_id}/positions", summary="Open positions")
def get_positions(session_id: int, current_user: User = Depends(get_current_user)):
    state = paper_service.get_portfolio_state(session_id, current_user.id)
    return {"positions": state["positions"]}


@router.get("/sessions/{session_id}/trades", summary="Trade history")
def get_trades(session_id: int, limit: int = Query(100, le=1000), current_user: User = Depends(get_current_user)):
    try:
        return {"trades": paper_service.get_trade_history(session_id, current_user.id, limit)}
    except ValueError:
        raise HTTPException(404, "Session not found")


@router.get("/sessions/{session_id}/equity", summary="Equity curve data")
def get_equity(session_id: int, limit: int = Query(500, le=5000), current_user: User = Depends(get_current_user)):
    try:
        return {"equity": paper_service.get_equity_curve(session_id, current_user.id, limit)}
    except ValueError:
        raise HTTPException(404, "Session not found")


@router.get("/sessions/{session_id}/benchmark", summary="Portfolio vs benchmark")
def get_benchmark(session_id: int, current_user: User = Depends(get_current_user)):
    try:
        return paper_service.get_benchmark_comparison(session_id, current_user.id)
    except ValueError:
        raise HTTPException(404, "Session not found")


@router.post("/sessions/{session_id}/snapshot", summary="Force a portfolio snapshot")
def force_snapshot(session_id: int, current_user: User = Depends(get_current_user)):
    try:
        snap = paper_service.record_snapshot(session_id, current_user.id)
        return {
            "portfolio_value": round(snap.portfolio_value, 2),
            "cash":            round(snap.cash, 2),
            "positions_value": round(snap.positions_value, 2),
            "recorded_at":     snap.recorded_at.isoformat(),
        }
    except ValueError:
        raise HTTPException(404, "Session not found")

def _session_dict(s: PaperSession) -> dict:
    return {
        "id":              s.id,
        "name":            s.name,
        "initial_capital": round(s.initial_capital, 2),
        "cash":            round(s.cash, 2),
        "is_active":       s.is_active,
        "benchmark":       s.benchmark,
        "created_at":      s.created_at.isoformat(),
    }

def _order_dict(o: PaperOrder) -> dict:
    return {
        "id":          o.id,
        "symbol":      o.symbol,
        "side":        o.side,
        "order_type":  o.order_type,
        "quantity":    round(o.quantity, 4),
        "limit_price": round(o.limit_price, 4) if o.limit_price else None,
        "status":      o.status,
        "source":      o.source,
        "ai_reason":   o.ai_reason,
        "created_at":  o.created_at.isoformat(),
        "filled_at":   o.filled_at.isoformat() if o.filled_at else None,
    }