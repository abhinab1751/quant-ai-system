import json
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from agents.data_agent import DataAgent
from services.backtest_engine import BacktestEngine
from db.database import SessionLocal, BacktestRun

logger     = logging.getLogger(__name__)
router     = APIRouter()
data_agent = DataAgent()

@router.get("/run/{symbol}", summary="Run a full walk-forward backtest")
def run_backtest(
    symbol:          str,
    initial_capital: float = Query(10_000.0, ge=100, le=10_000_000,
                                   description="Starting capital in USD"),
):
    sym = symbol.upper()

    df = data_agent.get_historical_data(sym, period="2y")
    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No price data found for '{sym}'. Check the ticker symbol."
        )

    engine = BacktestEngine(initial_capital=initial_capital)

    try:
        results = engine.run(df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"Backtest failed for {sym}: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest engine error: {str(e)}")

    equity_curve = results.get("equity_curve") or []
    trades       = results.get("trades")       or []

    try:
        with SessionLocal() as db:
            run = BacktestRun(
                symbol           = sym,
                initial_capital  = initial_capital,
                final_value      = results.get("final_value", initial_capital),
                total_return_pct = results.get("total_return_pct", 0.0),
                sharpe_ratio     = results.get("sharpe_ratio", 0.0),
                max_drawdown_pct = results.get("max_drawdown_pct", 0.0),
                win_rate_pct     = results.get("win_rate_pct", 0.0),
                total_trades     = results.get("total_trades", 0),
                equity_curve     = json.dumps(equity_curve),
                trade_log        = json.dumps(trades),
            )
            db.add(run)
            db.commit()
            db.refresh(run)
            run_id = run.id
    except Exception as e:
        logger.warning(f"Could not save backtest run to DB: {e}")
        run_id = None

    return {
        "symbol":           sym,
        "run_id":           run_id,
        "initial_capital":  results.get("initial_capital", initial_capital),
        "final_value":      results.get("final_value", initial_capital),
        "total_return_pct": results.get("total_return_pct", 0.0),
        "sharpe_ratio":     results.get("sharpe_ratio", 0.0),
        "max_drawdown_pct": results.get("max_drawdown_pct", 0.0),
        "win_rate_pct":     results.get("win_rate_pct", 0.0),
        "total_trades":     results.get("total_trades", 0),
        "equity_curve":     equity_curve,
        "trades":           trades,
    }

@router.get("/history/{symbol}", summary="Previous backtest runs for a symbol")
def backtest_history(
    symbol: str,
    limit:  int = Query(10, ge=1, le=100),
):
    try:
        with SessionLocal() as db:
            rows = (
                db.query(BacktestRun)
                .filter(BacktestRun.symbol == symbol.upper())
                .order_by(BacktestRun.created_at.desc())
                .limit(limit)
                .all()
            )
            return {
                "symbol": symbol.upper(),
                "runs": [
                    {
                        "run_id":           r.id,
                        "initial_capital":  r.initial_capital,
                        "final_value":      r.final_value,
                        "total_return_pct": r.total_return_pct,
                        "sharpe_ratio":     r.sharpe_ratio,
                        "max_drawdown_pct": r.max_drawdown_pct,
                        "win_rate_pct":     r.win_rate_pct,
                        "total_trades":     r.total_trades,
                        "created_at":       r.created_at.isoformat(),
                    }
                    for r in rows
                ],
            }
    except Exception as e:
        logger.error(f"Backtest history fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/run/{symbol}/{run_id}", summary="Get full detail of a specific backtest run")
def get_run_detail(symbol: str, run_id: int):
    try:
        with SessionLocal() as db:
            run = (
                db.query(BacktestRun)
                .filter(
                    BacktestRun.id     == run_id,
                    BacktestRun.symbol == symbol.upper()
                )
                .first()
            )
            if not run:
                raise HTTPException(
                    status_code=404,
                    detail=f"Backtest run {run_id} not found for {symbol.upper()}"
                )
            return {
                "run_id":           run.id,
                "symbol":           run.symbol,
                "initial_capital":  run.initial_capital,
                "final_value":      run.final_value,
                "total_return_pct": run.total_return_pct,
                "sharpe_ratio":     run.sharpe_ratio,
                "max_drawdown_pct": run.max_drawdown_pct,
                "win_rate_pct":     run.win_rate_pct,
                "total_trades":     run.total_trades,
                "equity_curve":     json.loads(run.equity_curve or "[]"),
                "trades":           json.loads(run.trade_log   or "[]"),
                "created_at":       run.created_at.isoformat(),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Run detail fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))