from peewee import (
    AutoField,
    CharField,
    FloatField,
    IntegerField,
    TextField,
    DateTimeField,
)
from datetime import datetime
from db.database import BaseModel


class BacktestRun(BaseModel):
    id = AutoField()

    symbol = CharField(max_length=10, index=True)

    initial_capital = FloatField(default=10000.0)
    period = CharField(max_length=16, default="6mo")

    final_value = FloatField()
    total_return_pct = FloatField()
    sharpe_ratio = FloatField()
    max_drawdown_pct = FloatField()
    win_rate_pct = FloatField()
    total_trades = IntegerField()
    equity_curve = TextField()
    trade_log = TextField()

    created_at = DateTimeField(default=datetime.utcnow)

    class Meta:
        table_name = "backtest_run"


__all__ = ["BacktestRun"]