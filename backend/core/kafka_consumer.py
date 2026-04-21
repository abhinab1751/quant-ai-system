from __future__ import annotations

import json
import logging
import os
import threading
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)

try:
    from kafka import KafkaConsumer as _KC
    from kafka.errors import KafkaError
    _KAFKA_LIB = True
except ImportError:
    _KAFKA_LIB = False


_handlers: dict[str, list[Callable]] = {}


def on_topic(topic: str):
    def decorator(fn: Callable) -> Callable:
        _handlers.setdefault(topic, []).append(fn)
        return fn
    return decorator


class KafkaConsumerService:

    def __init__(self) -> None:
        self._threads: list[threading.Thread] = []
        self._stop_evt = threading.Event()
        self._enabled  = False

    def start(self) -> None:
        if not _KAFKA_LIB:
            logger.info("[KafkaConsumer] kafka-python not installed – skipping")
            return
        if os.getenv("KAFKA_ENABLED", "").lower() == "false":
            logger.info("[KafkaConsumer] Disabled by KAFKA_ENABLED=false")
            return
        if not _handlers:
            logger.info("[KafkaConsumer] No handlers registered – skipping")
            return

        self._stop_evt.clear()
        servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        topics  = list(_handlers.keys())

        t = threading.Thread(
            target=self._consume_loop,
            args=(servers, topics),
            daemon=True,
            name="kafka-consumer",
        )
        t.start()
        self._threads.append(t)
        self._enabled = True
        logger.info(f"[KafkaConsumer] Started → {servers}  topics={topics}")

    def stop(self) -> None:
        self._stop_evt.set()
        self._enabled = False
        logger.info("[KafkaConsumer] Stop signal sent")

    def _consume_loop(self, servers: str, topics: list[str]) -> None:
        try:
            consumer = _KC(
                *topics,
                bootstrap_servers=servers,
                group_id=os.getenv("KAFKA_GROUP_ID", "quantai-backend"),
                auto_offset_reset="latest",
                enable_auto_commit=True,
                value_deserializer=lambda b: json.loads(b.decode("utf-8")),
                consumer_timeout_ms=1_000,   # poll loop timeout
                session_timeout_ms=30_000,
                heartbeat_interval_ms=10_000,
            )
        except Exception as exc:
            logger.warning(f"[KafkaConsumer] Could not create consumer: {exc}")
            return

        logger.info(f"[KafkaConsumer] Listening on {topics}")
        try:
            while not self._stop_evt.is_set():
                try:
                    for msg in consumer:
                        if self._stop_evt.is_set():
                            break
                        topic = msg.topic
                        value = msg.value
                        for handler in _handlers.get(topic, []):
                            try:
                                handler(value)
                            except Exception as e:
                                logger.warning(f"[KafkaConsumer] Handler error {topic}: {e}")
                except Exception as poll_err:
                    if self._stop_evt.is_set():
                        break
                    logger.warning(f"[KafkaConsumer] Poll error: {poll_err}")
        finally:
            try:
                consumer.close()
            except Exception:
                pass
            logger.info("[KafkaConsumer] Consumer thread exited")

    @property
    def is_enabled(self) -> bool:
        return self._enabled

    def status(self) -> dict:
        return {
            "enabled":  self._enabled,
            "lib":      _KAFKA_LIB,
            "threads":  len([t for t in self._threads if t.is_alive()]),
        }

kafka_consumer = KafkaConsumerService()

from core.kafka_producer import (
    TOPIC_PRICES, TOPIC_DECISIONS, TOPIC_PREDICTIONS,
    TOPIC_NEWS, TOPIC_SYSTEM_ERRORS,
)
from core.cache import cache, TTL_PRICE, TTL_DECISION, TTL_NEWS


@on_topic(TOPIC_PRICES)
def _handle_price(msg: dict) -> None:
    sym = msg.get("symbol")
    if sym:
        cache.set(f"price:{sym}:native", msg, ttl=TTL_PRICE)


@on_topic(TOPIC_DECISIONS)
def _handle_decision(msg: dict) -> None:
    sym = msg.get("symbol")
    if sym:
        cache.set(f"decision:{sym}", msg, ttl=TTL_DECISION)


@on_topic(TOPIC_NEWS)
def _handle_news(msg: dict) -> None:
    sym = msg.get("symbol")
    if sym:
        existing = cache.get(f"news:{sym}") or {}
        existing.update({
            "sentiment":   msg.get("sentiment"),
            "confidence":  msg.get("confidence"),
            "summary":     msg.get("summary"),
        })
        cache.set(f"news:{sym}", existing, ttl=TTL_NEWS)


@on_topic(TOPIC_SYSTEM_ERRORS)
def _handle_system_error(msg: dict) -> None:
    logger.error(f"[KafkaConsumer] System error from {msg.get('component')}: {msg.get('message')}")