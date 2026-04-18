from __future__ import annotations

import logging
import requests
import yfinance as yf
import pandas as pd
from typing import Optional

from core.markets import MarketUtils, EXCHANGES, GLOBAL_INDICES

logger = logging.getLogger(__name__)


class DataAgent:

    def get_current_price(
        self,
        symbol: str,
        exchange: Optional[str] = None,
    ) -> Optional[float]:
        try:
            ticker = yf.Ticker(symbol)
            fi = ticker.fast_info
            price = getattr(fi, "last_price", None)
            if price and price > 0:
                return float(price)
            data = ticker.history(period="1d", interval="1m")
            if not data.empty:
                return float(data["Close"].iloc[-1])
            return None
        except Exception as e:
            logger.warning(f"[DataAgent] Price fetch failed for {symbol}: {e}")
            return None

    def get_price_with_currency(
        self,
        symbol: str,
        convert_to: Optional[str] = None,
    ) -> dict:
        full_ticker, ex_id = MarketUtils.resolve_ticker(symbol)
        ex = EXCHANGES.get(ex_id, EXCHANGES["NYSE"])
        currency = ex["currency"]

        price = self.get_current_price(full_ticker)
        if price is None:
            return {"symbol": symbol, "price": None, "currency": currency, "exchange": ex_id}

        converted_price = price
        display_currency = currency
        if convert_to and convert_to.upper() != currency:
            rate = self._get_fx_rate(currency, convert_to.upper())
            if rate:
                converted_price = price * rate
                display_currency = convert_to.upper()

        return {
            "symbol":           symbol,
            "exchange":         ex_id,
            "exchange_name":    ex["name"],
            "flag":             ex["flag"],
            "price":            round(converted_price, 4),
            "raw_price":        round(price, 4),
            "currency":         display_currency,
            "original_currency": currency,
            "is_open":          MarketUtils.is_open(ex_id),
            "local_time":       MarketUtils.local_time(ex_id),
            "formatted":        MarketUtils.format_price(converted_price, display_currency),
        }

    def get_historical_data(
        self,
        symbol: str,
        period: str = "2y",
        interval: str = "1d",
    ) -> pd.DataFrame:
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            if df.empty:
                logger.warning(f"[DataAgent] No historical data for {symbol}")
            return df
        except Exception as e:
            logger.error(f"[DataAgent] Historical fetch failed for {symbol}: {e}")
            return pd.DataFrame()

    def is_market_open(self, exchange_id: str) -> bool:
        return MarketUtils.is_open(exchange_id)

    def is_market_open_for_ticker(self, symbol: str) -> bool:
        _, ex_id = MarketUtils.resolve_ticker(symbol)
        return MarketUtils.is_open(ex_id)

    def get_all_indices(self) -> list[dict]:
        results = []
        tickers = list(GLOBAL_INDICES.keys())
        try:
            data = yf.download(
                tickers, period="2d", interval="1d",
                group_by="ticker", auto_adjust=True, progress=False
            )
            for ticker, meta in GLOBAL_INDICES.items():
                try:
                    if len(tickers) == 1:
                        close_series = data["Close"]
                    else:
                        close_series = data[ticker]["Close"]
                    if not close_series.empty and len(close_series) >= 1:
                        price = float(close_series.iloc[-1])
                        prev  = float(close_series.iloc[-2]) if len(close_series) >= 2 else price
                        chg   = price - prev
                        chg_pct = (chg / prev * 100) if prev else 0
                    else:
                        price = chg = chg_pct = 0.0
                    results.append({
                        "ticker":      ticker,
                        "name":        meta["name"],
                        "flag":        meta["flag"],
                        "exchange":    meta["exchange"],
                        "price":       round(price, 2),
                        "change":      round(chg, 2),
                        "change_pct":  round(chg_pct, 2),
                    })
                except Exception:
                    continue
        except Exception as e:
            logger.warning(f"[DataAgent] Indices batch failed: {e}")
        return results

    def get_batch_prices(self, symbols: list[str]) -> dict[str, Optional[float]]:
        if not symbols:
            return {}
        try:
            tickers_str = " ".join(symbols)
            data = yf.download(
                tickers_str, period="1d", interval="1m",
                group_by="ticker", auto_adjust=True, progress=False
            )
            result: dict[str, Optional[float]] = {}
            for sym in symbols:
                try:
                    if len(symbols) == 1:
                        price = float(data["Close"].iloc[-1])
                    else:
                        price = float(data[sym]["Close"].iloc[-1])
                    result[sym] = price
                except Exception:
                    result[sym] = None
            return result
        except Exception as e:
            logger.warning(f"[DataAgent] Batch price failed: {e}")
            return {sym: None for sym in symbols}

    def get_ohlcv(self, symbol: str, period: str = "6mo") -> list[dict]:
        df = self.get_historical_data(symbol, period=period)
        if df.empty:
            return []
        df = df.reset_index()
        date_col = "Date" if "Date" in df.columns else df.columns[0]
        candles = []
        for _, row in df.iterrows():
            try:
                candles.append({
                    "time":   str(row[date_col])[:10],
                    "open":   round(float(row["Open"]),   4),
                    "high":   round(float(row["High"]),   4),
                    "low":    round(float(row["Low"]),    4),
                    "close":  round(float(row["Close"]),  4),
                    "volume": int(row.get("Volume", 0)),
                })
            except Exception:
                continue
        return candles

    def get_fear_greed(self) -> dict:
        try:
            resp = requests.get(
                "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=8,
            )
            data  = resp.json()
            value = int(data["fear_and_greed"]["score"])
            label = data["fear_and_greed"]["rating"]
            return {"value": value, "label": label.upper()}
        except Exception:
            return {"value": 50, "label": "NEUTRAL"}

    def _get_fx_rate(self, from_currency: str, to_currency: str) -> Optional[float]:
        if from_currency == to_currency:
            return 1.0
        try:
            pair   = f"{from_currency}{to_currency}=X"
            ticker = yf.Ticker(pair)
            fi     = ticker.fast_info
            rate   = getattr(fi, "last_price", None)
            if rate and rate > 0:
                return float(rate)
            data = ticker.history(period="1d")
            if not data.empty:
                return float(data["Close"].iloc[-1])
        except Exception as e:
            logger.warning(f"[DataAgent] FX rate {from_currency}/{to_currency} failed: {e}")
        return None