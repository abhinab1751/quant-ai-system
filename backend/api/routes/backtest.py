import json
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from agents.data_agent import DataAgent
from services.backtest_engine import BacktestEngine
from db.database import SessionLocal
from db.database import BacktestRun

router = APIRouter()
data_agent = DataAgent()
engine     = BacktestEngine()


@router.get("/run/{symbol}")
def run_backtest(
    symbol: str,
    initial_capital: float = Query(10_000.0, ge=100, description="Starting cash in USD"),
):

    sym = symbol.upper()
    df  = data_agent.get_historical_data(sym)

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for symbol '{sym}'")

    bt_engine = BacktestEngine(initial_capital=initial_capital)

    try:
        results = bt_engine.run(df)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    with SessionLocal() as db:
        run = BacktestRun(
            symbol           = sym,
            initial_capital  = initial_capital,
            final_value      = results["final_value"],
            total_return_pct = results["total_return_pct"],
            sharpe_ratio     = results["sharpe_ratio"],
            max_drawdown_pct = results["max_drawdown_pct"],
            win_rate_pct     = results["win_rate_pct"],
            total_trades     = results["total_trades"],
            equity_curve     = json.dumps(results["equity_curve"]),
            trade_log        = json.dumps(results["trades"]),
        )
        db.add(run)
        db.commit()
        db.refresh(run)

    return {
        "symbol":           sym,
        "run_id":           run.id,
        "initial_capital":  results["initial_capital"],
        "final_value":      results["final_value"],
        "total_return_pct": results["total_return_pct"],
        "sharpe_ratio":     results["sharpe_ratio"],
        "max_drawdown_pct": results["max_drawdown_pct"],
        "win_rate_pct":     results["win_rate_pct"],
        "total_trades":     results["total_trades"],
        "equity_curve":     results["equity_curve"],
        "trades":           results["trades"],
    }


@router.get("/history/{symbol}")
def backtest_history(symbol: str, limit: int = Query(10, ge=1, le=100)):
    with SessionLocal() as db:
        rows = (
            db.execute(
                select(BacktestRun)
                .where(BacktestRun.symbol == symbol.upper())
                .order_by(BacktestRun.created_at.desc())
                .limit(limit)
            )
            .scalars()
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


@router.get("/run/{symbol}/{run_id}")
def get_run_detail(symbol: str, run_id: int):
    with SessionLocal() as db:
        run = (
            db.execute(
                select(BacktestRun)
                .where((BacktestRun.id == run_id) & (BacktestRun.symbol == symbol.upper()))
            )
            .scalars()
            .first()
        )
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

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
        "equity_curve":     json.loads(run.equity_curve),
        "trades":           json.loads(run.trade_log),
        "created_at":       run.created_at.isoformat(),
    }