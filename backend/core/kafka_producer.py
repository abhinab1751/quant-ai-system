from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

try:
    from kafka import KafkaProducer as _KP
    from kafka.errors import KafkaError, NoBrokersAvailable
    _KAFKA_LIB = True
except ImportError:
    _KAFKA_LIB = False
    logger.warning("[Kafka] kafka-python not installed – all publishes are no-ops")

TOPIC_PRICES        = "quantai.prices"
TOPIC_DECISIONS     = "quantai.decisions"
TOPIC_PREDICTIONS   = "quantai.predictions"
TOPIC_NEWS          = "quantai.news.sentiment"
TOPIC_BACKTEST      = "quantai.backtest.results"
TOPIC_PAPER_ORDERS  = "quantai.paper.orders"
TOPIC_SYSTEM_ERRORS = "quantai.system.errors"


def _json_bytes(obj: Any) -> bytes:
    return json.dumps(obj, default=str).encode("utf-8")


class KafkaProducerService:
    def __init__(self) -> None:
        self._producer: Any  = None
        self._enabled: bool  = False
        self._connect()

    def _connect(self) -> None:
        env_enabled = os.getenv("KAFKA_ENABLED", "").lower()
        if env_enabled == "false":
            logger.info("[Kafka] Disabled by KAFKA_ENABLED=false")
            return
        if not _KAFKA_LIB:
            return

        servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        try:
            self._producer = _KP(
                bootstrap_servers=servers,
                value_serializer=_json_bytes,
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                acks="all",
                retries=3,
                max_block_ms=5_000,      
                request_timeout_ms=10_000,
                linger_ms=5,             
                compression_type="gzip",
            )
            self._enabled = True
            logger.info(f"[Kafka] Connected → {servers}")
        except Exception as exc:
            logger.warning(f"[Kafka] Could not connect ({exc}) – publishing disabled")
            self._producer = None
            self._enabled  = False

    def _send(self, topic: str, value: dict, key: Optional[str] = None) -> bool:
        if not self._enabled or self._producer is None:
            return False
        try:
            future = self._producer.send(topic, value=value, key=key)
            future.add_errback(
                lambda exc: logger.warning(f"[Kafka] Delivery failed {topic}: {exc}")
            )
            return True
        except Exception as exc:
            logger.warning(f"[Kafka] Send error {topic}: {exc}")
            return False


    def publish_price(
        self,
        symbol: str,
        price: float,
        change: float = 0.0,
        change_pct: float = 0.0,
        exchange: str = "NYSE",
        currency: str = "USD",
    ) -> bool:
        return self._send(
            TOPIC_PRICES,
            {
                "symbol":     symbol.upper(),
                "price":      round(price, 4),
                "change":     round(change, 4),
                "change_pct": round(change_pct, 4),
                "exchange":   exchange,
                "currency":   currency,
                "ts":         datetime.now(timezone.utc).isoformat(),
            },
            key=symbol.upper(),
        )

    def publish_decision(
        self,
        symbol: str,
        action: str,
        score: int,
        strength: str,
        reason: str,
        ml_prediction: str,
        ml_confidence: float,
        sentiment: str,
        sent_confidence: float,
        fear_greed: Optional[dict] = None,
        user_email: Optional[str] = None,
    ) -> bool:
        return self._send(
            TOPIC_DECISIONS,
            {
                "symbol":           symbol.upper(),
                "action":           action,
                "score":            score,
                "strength":         strength,
                "reason":           reason,
                "ml_prediction":    ml_prediction,
                "ml_confidence":    round(ml_confidence, 4),
                "sentiment":        sentiment,
                "sent_confidence":  round(sent_confidence, 4),
                "fear_greed":       fear_greed or {},
                "user_email":       user_email,
                "ts":               datetime.now(timezone.utc).isoformat(),
            },
            key=symbol.upper(),
        )

    def publish_prediction(
        self,
        symbol: str,
        prediction: str,
        confidence: float,
        feature_importance: Optional[dict] = None,
    ) -> bool:
        return self._send(
            TOPIC_PREDICTIONS,
            {
                "symbol":             symbol.upper(),
                "prediction":         prediction,
                "confidence":         round(confidence, 4),
                "feature_importance": feature_importance or {},
                "ts":                 datetime.now(timezone.utc).isoformat(),
            },
            key=symbol.upper(),
        )

    def publish_news_sentiment(
        self,
        symbol: str,
        sentiment: str,
        confidence: float,
        summary: str,
        article_count: int = 0,
    ) -> bool:
        return self._send(
            TOPIC_NEWS,
            {
                "symbol":        symbol.upper(),
                "sentiment":     sentiment,
                "confidence":    round(confidence, 4),
                "summary":       summary,
                "article_count": article_count,
                "ts":            datetime.now(timezone.utc).isoformat(),
            },
            key=symbol.upper(),
        )

    def publish_backtest_result(
        self,
        symbol: str,
        initial_capital: float,
        final_value: float,
        total_return_pct: float,
        sharpe_ratio: float,
        max_drawdown_pct: float,
        win_rate_pct: float,
        total_trades: int,
        run_id: Optional[int] = None,
    ) -> bool:
        return self._send(
            TOPIC_BACKTEST,
            {
                "symbol":           symbol.upper(),
                "run_id":           run_id,
                "initial_capital":  initial_capital,
                "final_value":      final_value,
                "total_return_pct": total_return_pct,
                "sharpe_ratio":     sharpe_ratio,
                "max_drawdown_pct": max_drawdown_pct,
                "win_rate_pct":     win_rate_pct,
                "total_trades":     total_trades,
                "ts":               datetime.now(timezone.utc).isoformat(),
            },
            key=symbol.upper(),
        )

    def publish_paper_order(
        self,
        session_id: int,
        symbol: str,
        side: str,
        quantity: float,
        fill_price: float,
        order_type: str = "MARKET",
        source: str = "MANUAL",
        pnl: float = 0.0,
        ai_reason: Optional[str] = None,
    ) -> bool:
        return self._send(
            TOPIC_PAPER_ORDERS,
            {
                "session_id": session_id,
                "symbol":     symbol.upper(),
                "side":       side,
                "quantity":   quantity,
                "fill_price": fill_price,
                "order_type": order_type,
                "source":     source,
                "pnl":        pnl,
                "ai_reason":  ai_reason,
                "ts":         datetime.now(timezone.utc).isoformat(),
            },
            key=f"{session_id}:{symbol.upper()}",
        )

    def publish_error(
        self,
        component: str,
        message: str,
        symbol: Optional[str] = None,
    ) -> bool:
        return self._send(
            TOPIC_SYSTEM_ERRORS,
            {
                "component": component,
                "message":   message,
                "symbol":    symbol,
                "ts":        datetime.now(timezone.utc).isoformat(),
            },
        )

    def flush(self, timeout: float = 5.0) -> None:
        if self._producer:
            try:
                self._producer.flush(timeout=timeout)
            except Exception:
                pass

    def close(self) -> None:
        if self._producer:
            try:
                self._producer.close(timeout=5)
            except Exception:
                pass

    @property
    def is_enabled(self) -> bool:
        return self._enabled

    def status(self) -> dict:
        return {
            "enabled":  self._enabled,
            "lib":      _KAFKA_LIB,
            "servers":  os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
        }


kafka = KafkaProducerService()