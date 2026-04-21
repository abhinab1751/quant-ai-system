from __future__ import annotations

import os
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    create_engine, String, Float, Integer, Boolean, Text,
    DateTime, ForeignKey, UniqueConstraint, Index, event, inspect, text,
)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, mapped_column, relationship,
    sessionmaker, Session,
)
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://quantai_user:quantai_pass@localhost:5432/quantai"
)

engine = create_engine(
    DATABASE_URL,
    poolclass    = QueuePool,
    pool_size    = 10,         
    max_overflow = 20,         
    pool_pre_ping = True,      
    pool_recycle = 3600,       
    echo         = False,      
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_session() -> Session:
    return SessionLocal()

class Price(Base):
    __tablename__ = "price"

    id         : Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol     : Mapped[str]           = mapped_column(String(20), nullable=False, index=True)
    exchange   : Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # NEW
    price      : Mapped[float]         = mapped_column(Float, nullable=False)
    currency   : Mapped[str]           = mapped_column(String(8), default="USD")   # NEW
    source     : Mapped[str]           = mapped_column(String(32), default="yfinance")
    fetched_at : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_price_symbol_fetched", "symbol", "fetched_at"),
    )


class Prediction(Base):
    __tablename__ = "prediction"

    id              : Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id         : Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    symbol          : Mapped[str]           = mapped_column(String(20), nullable=False, index=True)
    exchange        : Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # NEW
    ml_prediction   : Mapped[str]           = mapped_column(String(8))
    ml_confidence   : Mapped[float]         = mapped_column(Float)
    sentiment       : Mapped[str]           = mapped_column(String(12))
    sent_confidence : Mapped[float]         = mapped_column(Float)
    action          : Mapped[str]           = mapped_column(String(8))
    reason          : Mapped[str]           = mapped_column(Text)
    created_at      : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ModelMeta(Base):
    __tablename__ = "model_meta"

    id          : Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol      : Mapped[str]      = mapped_column(String(20), nullable=False, index=True)
    cv_accuracy : Mapped[float]    = mapped_column(Float)
    cv_std      : Mapped[float]    = mapped_column(Float)
    n_samples   : Mapped[int]      = mapped_column(Integer)
    trained_at  : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BacktestRun(Base):
    __tablename__ = "backtest_run"

    id               : Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id          : Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    symbol           : Mapped[str]      = mapped_column(String(20), nullable=False, index=True)
    initial_capital  : Mapped[float]    = mapped_column(Float, default=10_000.0)
    period           : Mapped[str]      = mapped_column(String(16), default="2y")
    final_value      : Mapped[float]    = mapped_column(Float)
    total_return_pct : Mapped[float]    = mapped_column(Float)
    sharpe_ratio     : Mapped[float]    = mapped_column(Float)
    max_drawdown_pct : Mapped[float]    = mapped_column(Float)
    win_rate_pct     : Mapped[float]    = mapped_column(Float)
    total_trades     : Mapped[int]      = mapped_column(Integer)
    equity_curve     : Mapped[str]      = mapped_column(Text)
    trade_log        : Mapped[str]      = mapped_column(Text)
    created_at       : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class PaperSession(Base):
    __tablename__ = "paper_session"

    id              : Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id         : Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    name            : Mapped[str]      = mapped_column(String(80), default="Default")
    initial_capital : Mapped[float]    = mapped_column(Float, default=100_000.0)
    cash            : Mapped[float]    = mapped_column(Float, default=100_000.0)
    is_active       : Mapped[bool]     = mapped_column(Boolean, default=True)
    benchmark       : Mapped[str]      = mapped_column(String(20), default="SPY")
    created_at      : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    orders    : Mapped[list["PaperOrder"]]    = relationship(back_populates="session", cascade="all, delete-orphan")
    trades    : Mapped[list["PaperTrade"]]    = relationship(back_populates="session", cascade="all, delete-orphan")
    positions : Mapped[list["PaperPosition"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    snapshots : Mapped[list["PaperSnapshot"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class PaperOrder(Base):
    __tablename__ = "paper_order"

    id          : Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id  : Mapped[int]           = mapped_column(ForeignKey("paper_session.id", ondelete="CASCADE"), index=True)
    symbol      : Mapped[str]           = mapped_column(String(20), nullable=False, index=True)
    exchange    : Mapped[Optional[str]] = mapped_column(String(20), nullable=True)           
    side        : Mapped[str]           = mapped_column(String(4))
    order_type  : Mapped[str]           = mapped_column(String(6))
    quantity    : Mapped[float]         = mapped_column(Float)
    limit_price : Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    stop_price  : Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status      : Mapped[str]           = mapped_column(String(10), default="PENDING")
    source      : Mapped[str]           = mapped_column(String(20), default="MANUAL")
    ai_reason   : Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    currency    : Mapped[str]           = mapped_column(String(8), default="USD")           
    created_at  : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
    filled_at   : Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    session : Mapped["PaperSession"]      = relationship(back_populates="orders")
    fills   : Mapped[list["PaperTrade"]]  = relationship(back_populates="order", cascade="all, delete-orphan")


class PaperTrade(Base):
    __tablename__ = "paper_trade"

    id          : Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id  : Mapped[int]      = mapped_column(ForeignKey("paper_session.id", ondelete="CASCADE"), index=True)
    order_id    : Mapped[int]      = mapped_column(ForeignKey("paper_order.id", ondelete="CASCADE"))
    symbol      : Mapped[str]      = mapped_column(String(20), nullable=False, index=True)
    side        : Mapped[str]      = mapped_column(String(4))
    quantity    : Mapped[float]    = mapped_column(Float)
    fill_price  : Mapped[float]    = mapped_column(Float)
    currency    : Mapped[str]      = mapped_column(String(8), default="USD")  
    commission  : Mapped[float]    = mapped_column(Float, default=0.0)
    pnl         : Mapped[float]    = mapped_column(Float, default=0.0)
    created_at  : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    session : Mapped["PaperSession"] = relationship(back_populates="trades")
    order   : Mapped["PaperOrder"]   = relationship(back_populates="fills")


class PaperPosition(Base):
    __tablename__ = "paper_position"

    id           : Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id   : Mapped[int]           = mapped_column(ForeignKey("paper_session.id", ondelete="CASCADE"), index=True)
    symbol       : Mapped[str]           = mapped_column(String(20), nullable=False)
    exchange     : Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  
    currency     : Mapped[str]           = mapped_column(String(8), default="USD")   
    quantity     : Mapped[float]         = mapped_column(Float, default=0.0)
    avg_cost     : Mapped[float]         = mapped_column(Float, default=0.0)
    realised_pnl : Mapped[float]         = mapped_column(Float, default=0.0)
    opened_at    : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)
    updated_at   : Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow)

    session : Mapped["PaperSession"] = relationship(back_populates="positions")

    __table_args__ = (
        UniqueConstraint("session_id", "symbol", name="uq_position_session_symbol"),
    )


class PaperSnapshot(Base):
    __tablename__ = "paper_snapshot"

    id              : Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id      : Mapped[int]      = mapped_column(ForeignKey("paper_session.id", ondelete="CASCADE"), index=True)
    portfolio_value : Mapped[float]    = mapped_column(Float)
    cash            : Mapped[float]    = mapped_column(Float)
    positions_value : Mapped[float]    = mapped_column(Float)
    recorded_at     : Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    session : Mapped["PaperSession"] = relationship(back_populates="snapshots")

def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_user_scoped_columns()
    _setup_timescale()


def _seed_default_session():
    with SessionLocal() as db:
        if not db.query(PaperSession).first():
            db.add(PaperSession(name="Default", initial_capital=100_000.0, cash=100_000.0))
            db.commit()


def _ensure_user_scoped_columns():
    inspector = inspect(engine)

    table_columns = {
        "prediction": {c["name"] for c in inspector.get_columns("prediction")},
        "backtest_run": {c["name"] for c in inspector.get_columns("backtest_run")},
        "paper_session": {c["name"] for c in inspector.get_columns("paper_session")},
    }

    with engine.begin() as conn:
        if "user_id" not in table_columns["prediction"]:
            conn.execute(text("ALTER TABLE prediction ADD COLUMN user_id INTEGER"))
        if "user_id" not in table_columns["backtest_run"]:
            conn.execute(text("ALTER TABLE backtest_run ADD COLUMN user_id INTEGER"))
        if "user_id" not in table_columns["paper_session"]:
            conn.execute(text("ALTER TABLE paper_session ADD COLUMN user_id INTEGER"))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_prediction_user_id ON prediction (user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_backtest_run_user_id ON backtest_run (user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_paper_session_user_id ON paper_session (user_id)"))


def _setup_timescale():
    stmts = [
        "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;",
        "SELECT create_hypertable('price', 'fetched_at', if_not_exists => TRUE, migrate_data => TRUE);",
        "SELECT create_hypertable('paper_snapshot', 'recorded_at', if_not_exists => TRUE, migrate_data => TRUE);",
        """
        CREATE MATERIALIZED VIEW IF NOT EXISTS price_hourly
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 hour', fetched_at) AS bucket,
            symbol,
            first(price, fetched_at) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, fetched_at) AS close,
            count(*)::int AS ticks
        FROM price
        GROUP BY bucket, symbol
        WITH NO DATA;
        """,
    ]
    with engine.connect() as conn:
        for stmt in stmts:
            try:
                conn.execute(__import__("sqlalchemy").text(stmt))
                conn.commit()
            except Exception as e:
                conn.rollback()
                if "already exists" not in str(e).lower():
                    pass   


def save_price(symbol: str, price: float, currency: str = "USD", exchange: str = "NYSE", source: str = "yfinance") -> Price:
    with SessionLocal() as db:
        obj = Price(symbol=symbol.upper(), price=price, currency=currency, exchange=exchange, source=source)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj


def get_latest_price(symbol: str) -> Optional[Price]:
    with SessionLocal() as db:
        return (
            db.query(Price)
            .filter(Price.symbol == symbol.upper())
            .order_by(Price.fetched_at.desc())
            .first()
        )


def save_prediction(
    symbol: str, ml_prediction: str, ml_confidence: float,
    sentiment: str, sent_confidence: float, action: str, reason: str,
    user_id: int,
    exchange: str = "NYSE",
) -> Prediction:
    with SessionLocal() as db:
        obj = Prediction(
            user_id=user_id,
            symbol=symbol.upper(), exchange=exchange,
            ml_prediction=ml_prediction, ml_confidence=ml_confidence,
            sentiment=sentiment, sent_confidence=sent_confidence,
            action=action, reason=reason,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj


def get_decision_history(symbol: str, user_id: int, limit: int = 50) -> list[dict]:
    with SessionLocal() as db:
        rows = (
            db.query(Prediction)
            .filter(
                Prediction.symbol == symbol.upper(),
                Prediction.user_id == user_id,
            )
            .order_by(Prediction.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id":             r.id,
                "ml_prediction":  r.ml_prediction,
                "ml_confidence":  r.ml_confidence,
                "sentiment":      r.sentiment,
                "sent_confidence": r.sent_confidence,
                "action":         r.action,
                "reason":         r.reason,
                "created_at":     r.created_at.isoformat(),
            }
            for r in rows
        ]


def get_action_summary(symbol: str, user_id: int) -> dict:
    with SessionLocal() as db:
        rows = (
            db.query(Prediction)
            .filter(
                Prediction.symbol == symbol.upper(),
                Prediction.user_id == user_id,
            )
            .all()
        )
        summary = {"BUY": 0, "SELL": 0, "HOLD": 0}
        for r in rows:
            summary[r.action] = summary.get(r.action, 0) + 1
        return summary