import os
import sys
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

SQLITE_PATH = os.getenv("SQLITE_PATH", "./quant.db")

import sqlite3

from db.database import (
    engine, SessionLocal, Base,
    Price, Prediction, ModelMeta, BacktestRun,
    PaperSession, PaperOrder, PaperTrade, PaperPosition, PaperSnapshot,
    init_db,
)


def run_migration():
    logger.info("=== QuantAI: SQLite → PostgreSQL migration ===")

    if not Path(SQLITE_PATH).exists():
        logger.error(f"SQLite file not found: {SQLITE_PATH}")
        sys.exit(1)

    logger.info("Creating PostgreSQL schema…")
    init_db()

    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    cur  = conn.cursor()

    with SessionLocal() as pg:
        rows = cur.execute("SELECT * FROM price").fetchall()
        logger.info(f"  Migrating {len(rows)} price rows…")
        for row in rows:
            pg.merge(Price(
                id         = row["id"],
                symbol     = row["symbol"],
                price      = row["price"],
                currency   = _row_get(row, "currency", "USD"),
                exchange   = _row_get(row, "exchange", "NYSE"),
                source     = _row_get(row, "source", "yfinance"),
                fetched_at = _parse_dt(_row_get(row, "fetched_at")),
            ))
        pg.commit()

        rows = cur.execute("SELECT * FROM prediction").fetchall()
        logger.info(f"  Migrating {len(rows)} prediction rows…")
        for row in rows:
            pg.merge(Prediction(
                id              = row["id"],
                symbol          = row["symbol"],
                ml_prediction   = row["ml_prediction"],
                ml_confidence   = row["ml_confidence"],
                sentiment       = row["sentiment"],
                sent_confidence = row["sent_confidence"],
                action          = row["action"],
                reason          = row["reason"],
                created_at      = _parse_dt(_row_get(row, "created_at")),
            ))
        pg.commit()

        try:
            rows = cur.execute("SELECT * FROM model_meta").fetchall()
            logger.info(f"  Migrating {len(rows)} model_meta rows…")
            for row in rows:
                pg.merge(ModelMeta(
                    id          = row["id"],
                    symbol      = row["symbol"],
                    cv_accuracy = row["cv_accuracy"],
                    cv_std      = row["cv_std"],
                    n_samples   = row["n_samples"],
                    trained_at  = _parse_dt(_row_get(row, "trained_at")),
                ))
            pg.commit()
        except Exception as e:
            logger.warning(f"  model_meta skipped: {e}")

        try:
            rows = cur.execute("SELECT * FROM backtest_run").fetchall()
            logger.info(f"  Migrating {len(rows)} backtest_run rows…")
            for row in rows:
                pg.merge(BacktestRun(
                    id               = row["id"],
                    symbol           = row["symbol"],
                    initial_capital  = row["initial_capital"],
                    period           = _row_get(row, "period", "2y"),
                    final_value      = row["final_value"],
                    total_return_pct = row["total_return_pct"],
                    sharpe_ratio     = row["sharpe_ratio"],
                    max_drawdown_pct = row["max_drawdown_pct"],
                    win_rate_pct     = row["win_rate_pct"],
                    total_trades     = row["total_trades"],
                    equity_curve     = row["equity_curve"],
                    trade_log        = row["trade_log"],
                    created_at       = _parse_dt(_row_get(row, "created_at")),
                ))
            pg.commit()
        except Exception as e:
            logger.warning(f"  backtest_run skipped: {e}")
        for table, Model, fields in [
            ("paper_session",  PaperSession, [
                "id","name","initial_capital","cash","is_active","benchmark","created_at"]),
            ("paper_order",    PaperOrder, [
                "id","session_id","symbol","side","order_type","quantity",
                "limit_price","stop_price","status","source","ai_reason","created_at","filled_at"]),
            ("paper_trade",    PaperTrade, [
                "id","session_id","order_id","symbol","side","quantity",
                "fill_price","commission","pnl","created_at"]),
            ("paper_position", PaperPosition, [
                "id","session_id","symbol","quantity","avg_cost","realised_pnl",
                "opened_at","updated_at"]),
            ("paper_snapshot", PaperSnapshot, [
                "id","session_id","portfolio_value","cash","positions_value","recorded_at"]),
        ]:
            try:
                rows = cur.execute(f"SELECT * FROM {table}").fetchall()
                logger.info(f"  Migrating {len(rows)} {table} rows…")
                for row in rows:
                    obj = Model()
                    for f in fields:
                        val = row[f] if f in row.keys() else None
                        if isinstance(val, str) and ("_at" in f or f == "opened_at" or f == "updated_at"):
                            val = _parse_dt(val)
                        setattr(obj, f, val)
                    pg.merge(obj)
                pg.commit()
            except Exception as e:
                pg.rollback()
                logger.warning(f"  {table} skipped: {e}")

    conn.close()
    logger.info("✓ Migration complete!")
    logger.info("Next steps:")
    logger.info("  1. Verify data in PostgreSQL: psql -U quantai_user -d quantai -c 'SELECT COUNT(*) FROM price;'")
    logger.info("  2. Rename or archive quant.db")
    logger.info("  3. Remove SQLITE_PATH from .env")


def _parse_dt(val) -> datetime:
    if val is None:
        return datetime.utcnow()
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return datetime.utcnow()


def _row_get(row: sqlite3.Row, key: str, default=None):
    if key in row.keys():
        return row[key]
    return default


if __name__ == "__main__":
    run_migration()