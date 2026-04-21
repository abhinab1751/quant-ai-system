from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from services.auth_service import get_current_user
from core.kafka_producer import (
    kafka,
    TOPIC_PRICES,
    TOPIC_DECISIONS,
    TOPIC_PREDICTIONS,
    TOPIC_NEWS,
    TOPIC_BACKTEST,
    TOPIC_SYSTEM_ERRORS,
)
try:
    from core.kafka_producer import TOPIC_PAPER_ORDERS
except ImportError:
    TOPIC_PAPER_ORDERS = "paper_orders"
from db.auth_models import User

router = APIRouter(tags=["kafka"])

ALL_TOPICS = [
    TOPIC_PRICES, TOPIC_DECISIONS, TOPIC_PREDICTIONS,
    TOPIC_NEWS, TOPIC_BACKTEST, TOPIC_PAPER_ORDERS, TOPIC_SYSTEM_ERRORS,
]


@router.get("/status", summary="Kafka producer status")
def kafka_status():
    return {
        "status": "ok" if kafka.is_enabled else "disabled",
        **kafka.status(),
        "topics": ALL_TOPICS,
    }


@router.get("/topics", summary="List all QuantAI Kafka topics")
def list_topics(current_user: User = Depends(get_current_user)):
    return {"topics": ALL_TOPICS, "count": len(ALL_TOPICS)}


class TestPublishRequest(BaseModel):
    symbol: str  = Field("AAPL", min_length=1, max_length=15)
    price:  float = Field(150.0, gt=0)


@router.post("/test/price", summary="Publish a test price event")
def test_publish_price(
    req: TestPublishRequest,
    current_user: User = Depends(get_current_user),
):
    ok = kafka.publish_price(
        symbol=req.symbol.upper(),
        price=req.price,
        change=0.0,
        change_pct=0.0,
    )
    return {
        "published": ok,
        "topic":     TOPIC_PRICES,
        "symbol":    req.symbol.upper(),
        "price":     req.price,
        "note":      "no-op" if not ok else "sent",
    }