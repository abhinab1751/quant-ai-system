from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

try:
    import redis
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False
    logger.warning("[Cache] redis-py not installed – using in-memory fallback")

TTL_PRICE          = int(os.getenv("CACHE_TTL_PRICE",          "10"))   
TTL_DECISION       = int(os.getenv("CACHE_TTL_DECISION",       "300"))   
TTL_NEWS           = int(os.getenv("CACHE_TTL_NEWS",           "600"))   
TTL_OHLCV          = int(os.getenv("CACHE_TTL_OHLCV",          "3600"))  
TTL_BACKTEST       = int(os.getenv("CACHE_TTL_BACKTEST",       "1800"))  
TTL_FEATURE_IMP    = int(os.getenv("CACHE_TTL_FEATURE_IMP",   "3600"))  
TTL_FEAR_GREED     = int(os.getenv("CACHE_TTL_FEAR_GREED",    "300"))   
TTL_EXCHANGE_STATUS= int(os.getenv("CACHE_TTL_EXCHANGE_STATUS","30"))   
TTL_BATCH_PRICE    = int(os.getenv("CACHE_TTL_BATCH_PRICE",   "15"))    


class _MemoryStore:

    def __init__(self) -> None:
        self._data: dict[str, tuple[Any, Optional[float]]] = {}

    def get(self, key: str) -> Optional[str]:
        item = self._data.get(key)
        if item is None:
            return None
        value, expires_at = item
        if expires_at and datetime.utcnow().timestamp() > expires_at:
            del self._data[key]
            return None
        return value

    def set(self, key: str, value: str, ex: int = 0) -> None:
        expires_at = (datetime.utcnow().timestamp() + ex) if ex else None
        self._data[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def keys(self, pattern: str = "*") -> list[str]:
        import fnmatch
        now = datetime.utcnow().timestamp()
        live = [k for k, (_, exp) in self._data.items() if not exp or exp > now]
        if pattern == "*":
            return live
        return [k for k in live if fnmatch.fnmatch(k, pattern)]

    def delete_many(self, pattern: str) -> int:
        targets = self.keys(pattern)
        for k in targets:
            self._data.pop(k, None)
        return len(targets)

    def ping(self) -> bool:
        return True

    def info(self) -> dict:
        return {"mode": "in-memory", "keys": len(self._data)}

class CacheService:

    def __init__(self) -> None:
        self._client: Any = None
        self._mode: str   = "memory"
        self._memory       = _MemoryStore()
        self._connect()

    def _connect(self) -> None:
        if not _REDIS_AVAILABLE:
            logger.info("[Cache] Using in-memory store (redis-py not installed)")
            return

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        try:
            client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=True,
            )
            client.ping()
            self._client = client
            self._mode   = "redis"
            logger.info(f"[Cache] Connected to Redis → {redis_url}")
        except Exception as exc:
            logger.warning(f"[Cache] Redis unavailable ({exc}) – falling back to in-memory store")

    def _get_backend(self):
        return self._client if self._mode == "redis" else self._memory

    def _safe(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            logger.warning(f"[Cache] Operation failed ({exc}); retrying with memory store")
            self._mode = "memory"
            return None

    def get(self, key: str) -> Optional[Any]:
        raw = self._get_backend().get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw

    def set(self, key: str, value: Any, ttl: int = 60) -> bool:
        try:
            serialised = json.dumps(value, default=str)
            self._get_backend().set(key, serialised, ex=ttl)
            return True
        except Exception as exc:
            logger.warning(f"[Cache] set failed: {exc}")
            return False

    def delete(self, key: str) -> None:
        try:
            self._get_backend().delete(key)
        except Exception as exc:
            logger.warning(f"[Cache] delete failed: {exc}")

    def invalidate_pattern(self, pattern: str) -> int:
        try:
            backend = self._get_backend()
            if self._mode == "redis":
                keys = list(backend.keys(pattern))
                if keys:
                    backend.delete(*keys)
                return len(keys)
            else:
                return backend.delete_many(pattern)
        except Exception as exc:
            logger.warning(f"[Cache] invalidate_pattern failed: {exc}")
            return 0

    def ping(self) -> bool:
        try:
            return self._get_backend().ping()
        except Exception:
            return False

    def info(self) -> dict:
        try:
            backend = self._get_backend()
            if self._mode == "redis":
                raw = backend.info()
                return {
                    "mode":        "redis",
                    "redis_version": raw.get("redis_version"),
                    "used_memory_human": raw.get("used_memory_human"),
                    "connected_clients": raw.get("connected_clients"),
                    "uptime_in_seconds": raw.get("uptime_in_seconds"),
                }
            return backend.info()
        except Exception as exc:
            return {"mode": "error", "detail": str(exc)}

    def cache_price(self, symbol: str, data: dict) -> bool:
        return self.set(f"price:{symbol.upper()}", data, ttl=TTL_PRICE)

    def get_price(self, symbol: str) -> Optional[dict]:
        return self.get(f"price:{symbol.upper()}")

    def cache_decision(self, symbol: str, data: dict) -> bool:
        return self.set(f"decision:{symbol.upper()}", data, ttl=TTL_DECISION)

    def get_decision(self, symbol: str) -> Optional[dict]:
        return self.get(f"decision:{symbol.upper()}")

    def cache_news(self, symbol: str, data: dict) -> bool:
        return self.set(f"news:{symbol.upper()}", data, ttl=TTL_NEWS)

    def get_news(self, symbol: str) -> Optional[dict]:
        return self.get(f"news:{symbol.upper()}")

    def cache_ohlcv(self, symbol: str, period: str, data: dict) -> bool:
        return self.set(f"ohlcv:{symbol.upper()}:{period}", data, ttl=TTL_OHLCV)

    def get_ohlcv(self, symbol: str, period: str) -> Optional[dict]:
        return self.get(f"ohlcv:{symbol.upper()}:{period}")

    def cache_fear_greed(self, data: dict) -> bool:
        return self.set("fear_greed:index", data, ttl=TTL_FEAR_GREED)

    def get_fear_greed(self) -> Optional[dict]:
        return self.get("fear_greed:index")

    def cache_exchange_status(self, data: list) -> bool:
        return self.set("exchange:status:all", data, ttl=TTL_EXCHANGE_STATUS)

    def get_exchange_status(self) -> Optional[list]:
        return self.get("exchange:status:all")

    def cache_batch_prices(self, key: str, data: dict) -> bool:
        return self.set(f"batch_prices:{key}", data, ttl=TTL_BATCH_PRICE)

    def get_batch_prices(self, key: str) -> Optional[dict]:
        return self.get(f"batch_prices:{key}")

    def cache_feature_importance(self, symbol: str, data: dict) -> bool:
        return self.set(f"feature_imp:{symbol.upper()}", data, ttl=TTL_FEATURE_IMP)

    def get_feature_importance(self, symbol: str) -> Optional[dict]:
        return self.get(f"feature_imp:{symbol.upper()}")

    def cache_backtest(self, symbol: str, capital: float, data: dict) -> bool:
        key = f"backtest:{symbol.upper()}:{int(capital)}"
        return self.set(key, data, ttl=TTL_BACKTEST)

    def get_backtest(self, symbol: str, capital: float) -> Optional[dict]:
        key = f"backtest:{symbol.upper()}:{int(capital)}"
        return self.get(key)

    def invalidate_symbol(self, symbol: str) -> int:
        sym = symbol.upper()
        total = 0
        for pattern in [
            f"price:{sym}",
            f"decision:{sym}",
            f"news:{sym}",
            f"ohlcv:{sym}:*",
            f"feature_imp:{sym}",
            f"backtest:{sym}:*",
        ]:
            total += self.invalidate_pattern(pattern)
        return total


cache = CacheService()