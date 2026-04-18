from datetime import datetime
from peewee import (
    AutoField, CharField, FloatField, IntegerField,
    TextField, DateTimeField, ForeignKeyField, BooleanField,
)
from db.database import BaseModel, db


class PaperSession(BaseModel):

    id              = AutoField()
    name            = CharField(max_length=80, default="Default")
    initial_capital = FloatField(default=100_000.0)
    cash            = FloatField(default=100_000.0)   
    is_active       = BooleanField(default=True)
    benchmark       = CharField(max_length=10, default="SPY")
    created_at      = DateTimeField(default=datetime.utcnow)

    class Meta:
        table_name = "paper_session"


ORDER_TYPES   = ("MARKET", "LIMIT", "STOP")
ORDER_SIDES   = ("BUY", "SELL")
ORDER_STATUSES = ("PENDING", "FILLED", "CANCELLED", "REJECTED")

class PaperOrder(BaseModel):
    id          = AutoField()
    session     = ForeignKeyField(PaperSession, backref="orders", on_delete="CASCADE")
    symbol      = CharField(max_length=10, index=True)
    side        = CharField(max_length=4)          
    order_type  = CharField(max_length=6)          
    quantity    = FloatField()
    limit_price = FloatField(null=True)            
    stop_price  = FloatField(null=True)
    status      = CharField(max_length=10, default="PENDING")
    source      = CharField(max_length=20, default="MANUAL")  
    ai_reason   = TextField(null=True)            
    created_at  = DateTimeField(default=datetime.utcnow)
    filled_at   = DateTimeField(null=True)

    class Meta:
        table_name = "paper_order"


class PaperTrade(BaseModel):
    id          = AutoField()
    session     = ForeignKeyField(PaperSession, backref="trades", on_delete="CASCADE")
    order       = ForeignKeyField(PaperOrder, backref="fills", on_delete="CASCADE")
    symbol      = CharField(max_length=10, index=True)
    side        = CharField(max_length=4)
    quantity    = FloatField()
    fill_price  = FloatField()
    commission  = FloatField(default=0.0)          
    pnl         = FloatField(default=0.0)          
    created_at  = DateTimeField(default=datetime.utcnow, index=True)

    class Meta:
        table_name = "paper_trade"


class PaperPosition(BaseModel):

    id          = AutoField()
    session     = ForeignKeyField(PaperSession, backref="positions", on_delete="CASCADE")
    symbol      = CharField(max_length=10, index=True)
    quantity    = FloatField(default=0.0)          
    avg_cost    = FloatField(default=0.0)          
    realised_pnl = FloatField(default=0.0)         
    opened_at   = DateTimeField(default=datetime.utcnow)
    updated_at  = DateTimeField(default=datetime.utcnow)

    class Meta:
        table_name = "paper_position"
        indexes    = ((("session_id", "symbol"), True),)  


class PaperSnapshot(BaseModel):

    id              = AutoField()
    session         = ForeignKeyField(PaperSession, backref="snapshots", on_delete="CASCADE")
    portfolio_value = FloatField()      
    cash            = FloatField()
    positions_value = FloatField()
    recorded_at     = DateTimeField(default=datetime.utcnow, index=True)

    class Meta:
        table_name = "paper_snapshot"


def init_paper_tables():
    with db:
        db.create_tables(
            [PaperSession, PaperOrder, PaperTrade, PaperPosition, PaperSnapshot],
            safe=True,
        )
    if not PaperSession.select().exists():
        PaperSession.create(
            name="Default",
            initial_capital=100_000.0,
            cash=100_000.0,
        )