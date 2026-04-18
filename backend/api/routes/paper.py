import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.paper_trading_service import paper_service, RiskError
from db.paper_models import PaperSession, PaperOrder

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
def create_session(req: CreateSessionRequest):
    session = paper_service.create_session(req.name, req.initial_capital)
    return _session_dict(session)


@router.get("/sessions", summary="List all sessions")
def list_sessions():
    sessions = PaperSession.select().order_by(PaperSession.created_at.desc())
    return [_session_dict(s) for s in sessions]


@router.get("/sessions/{session_id}", summary="Get session details")
def get_session(session_id: int):
    try:
        session = PaperSession.get_by_id(session_id)
        return _session_dict(session)
    except PaperSession.DoesNotExist:
        raise HTTPException(404, f"Session {session_id} not found")


@router.delete("/sessions/{session_id}/reset", summary="Reset session")
def reset_session(session_id: int):
    try:
        session = paper_service.reset_session(session_id)
        return {"message": f"Session '{session.name}' reset to ${session.initial_capital:,.2f}", **_session_dict(session)}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/sessions/{session_id}/activate", summary="Set active session")
def activate_session(session_id: int):
    try:
        PaperSession.update(is_active=False).execute()
        session = PaperSession.get_by_id(session_id)
        session.is_active = True
        session.save()
        return {"message": f"Session '{session.name}' is now active"}
    except PaperSession.DoesNotExist:
        raise HTTPException(404, f"Session {session_id} not found")

@router.post("/orders", summary="Place a paper order")
def place_order(req: PlaceOrderRequest):
    try:
        result = paper_service.place_order(
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
def ai_order(req: AIOrderRequest):
    try:
        result = paper_service.execute_ai_signal(
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
def get_orders(session_id: int, limit: int = Query(50, le=500)):
    try:
        session = PaperSession.get_by_id(session_id)
        orders  = (
            PaperOrder.select()
            .where(PaperOrder.session == session)
            .order_by(PaperOrder.created_at.desc())
            .limit(limit)
        )
        return [_order_dict(o) for o in orders]
    except PaperSession.DoesNotExist:
        raise HTTPException(404, "Session not found")


@router.delete("/orders/{order_id}", summary="Cancel a pending order")
def cancel_order(order_id: int):
    try:
        order = PaperOrder.get_by_id(order_id)
        if order.status != "PENDING":
            raise HTTPException(400, f"Order {order_id} is already {order.status}")
        order.status = "CANCELLED"
        order.save()
        return {"message": f"Order {order_id} cancelled"}
    except PaperOrder.DoesNotExist:
        raise HTTPException(404, f"Order {order_id} not found")

@router.get("/sessions/{session_id}/portfolio", summary="Full portfolio state")
def get_portfolio(session_id: int):
    try:
        return paper_service.get_portfolio_state(session_id)
    except PaperSession.DoesNotExist:
        raise HTTPException(404, "Session not found")


@router.get("/sessions/{session_id}/positions", summary="Open positions")
def get_positions(session_id: int):
    state = paper_service.get_portfolio_state(session_id)
    return {"positions": state["positions"]}


@router.get("/sessions/{session_id}/trades", summary="Trade history")
def get_trades(session_id: int, limit: int = Query(100, le=1000)):
    try:
        return {"trades": paper_service.get_trade_history(session_id, limit)}
    except PaperSession.DoesNotExist:
        raise HTTPException(404, "Session not found")


@router.get("/sessions/{session_id}/equity", summary="Equity curve data")
def get_equity(session_id: int, limit: int = Query(500, le=5000)):
    try:
        return {"equity": paper_service.get_equity_curve(session_id, limit)}
    except PaperSession.DoesNotExist:
        raise HTTPException(404, "Session not found")


@router.get("/sessions/{session_id}/benchmark", summary="Portfolio vs benchmark")
def get_benchmark(session_id: int):
    try:
        return paper_service.get_benchmark_comparison(session_id)
    except PaperSession.DoesNotExist:
        raise HTTPException(404, "Session not found")


@router.post("/sessions/{session_id}/snapshot", summary="Force a portfolio snapshot")
def force_snapshot(session_id: int):
    try:
        snap = paper_service.record_snapshot(session_id)
        return {
            "portfolio_value": round(snap.portfolio_value, 2),
            "cash":            round(snap.cash, 2),
            "positions_value": round(snap.positions_value, 2),
            "recorded_at":     snap.recorded_at.isoformat(),
        }
    except PaperSession.DoesNotExist:
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