import os
from datetime import datetime
from peewee import (
    SqliteDatabase, Model, AutoField, CharField,
    FloatField, IntegerField, TextField, DateTimeField,
)

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "quant.db")
db = SqliteDatabase(DB_PATH, pragmas={"journal_mode": "wal", "foreign_keys": 1})


class BaseModel(Model):
    class Meta:
        database = db


class Price(BaseModel):
    id         = AutoField()
    symbol     = CharField(max_length=10, index=True)
    price      = FloatField()
    source     = CharField(max_length=32, default="yfinance")
    fetched_at = DateTimeField(default=datetime.utcnow)
    class Meta:
        table_name = "price"


class Prediction(BaseModel):
    id              = AutoField()
    symbol          = CharField(max_length=10, index=True)
    ml_prediction   = CharField(max_length=8)
    ml_confidence   = FloatField()
    sentiment       = CharField(max_length=12)
    sent_confidence = FloatField()
    action          = CharField(max_length=8)
    reason          = TextField()
    created_at      = DateTimeField(default=datetime.utcnow, index=True)
    class Meta:
        table_name = "prediction"


class ModelMeta(BaseModel):
    id          = AutoField()
    symbol      = CharField(max_length=10, index=True)
    cv_accuracy = FloatField()
    cv_std      = FloatField()
    n_samples   = IntegerField()
    trained_at  = DateTimeField(default=datetime.utcnow)
    class Meta:
        table_name = "model_meta"


class BacktestRun(BaseModel):
    id               = AutoField()
    symbol           = CharField(max_length=10, index=True)
    initial_capital  = FloatField(default=10000.0)
    period           = CharField(max_length=16, default="2y")
    final_value      = FloatField()
    total_return_pct = FloatField()
    sharpe_ratio     = FloatField()
    max_drawdown_pct = FloatField()
    win_rate_pct     = FloatField()
    total_trades     = IntegerField()
    equity_curve     = TextField()
    trade_log        = TextField()
    created_at       = DateTimeField(default=datetime.utcnow)
    class Meta:
        table_name = "backtest_run"


def init_db():
    with db:
        db.create_tables([Price, Prediction, ModelMeta, BacktestRun], safe=True)