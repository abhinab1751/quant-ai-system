import math

from fastapi import APIRouter, Query, HTTPException
from agents.data_agent import DataAgent
from core.markets import MarketUtils, EXCHANGES, GLOBAL_INDICES, market_utils
from core.cache import cache, TTL_PRICE, TTL_EXCHANGE_STATUS, TTL_BATCH_PRICE

router     = APIRouter()
data_agent = DataAgent()


def _sanitize_for_json(value):
    """Convert non-JSON-safe float values (NaN/Infinity) to None recursively."""
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {k: _sanitize_for_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_for_json(v) for v in value]
    if isinstance(value, tuple):
        return [_sanitize_for_json(v) for v in value]
    return value


@router.get("/price")
def get_price(
    symbol:  str        = Query(..., description="Ticker, e.g. AAPL, RELIANCE.NS, 7203.T"),
    convert: str | None = Query(None, description="Convert to currency, e.g. USD, EUR"),
):
    cache_key = f"price:{symbol.upper()}:{convert or 'native'}"
    cached = cache.get(cache_key)
    if cached:
        cached["_cached"] = True
        return cached

    result = _sanitize_for_json(data_agent.get_price_with_currency(symbol, convert_to=convert))
    if result["price"] is None:
        raise HTTPException(
            status_code=404,
            detail=f"No price data for '{symbol}'. Check the ticker symbol and suffix.",
        )
    cache.set(cache_key, result, ttl=TTL_PRICE)
    return result


@router.get("/exchanges")
def list_exchanges(region: str | None = Query(None, description="Filter by region")):
    cached = cache.get("exchange:status:all")
    if cached:
        all_ex = cached
    else:
        all_ex = MarketUtils.all_exchange_status()
        cache.set("exchange:status:all", all_ex, ttl=TTL_EXCHANGE_STATUS)

    if region:
        all_ex = [e for e in all_ex if e["region"].lower() == region.lower()]

    return {
        "exchanges": all_ex,
        "regions":   MarketUtils.get_regions(),
        "count":     len(all_ex),
    }


@router.get("/exchanges/regions")
def list_by_region():
    return MarketUtils.exchanges_by_region()


@router.get("/exchanges/{exchange_id}")
def get_exchange(exchange_id: str):
    ex_id = exchange_id.upper()
    if ex_id not in EXCHANGES:
        raise HTTPException(status_code=404, detail=f"Exchange '{ex_id}' not found")
    ex = EXCHANGES[ex_id]
    return {
        "id":         ex_id,
        "name":       ex["name"],
        "country":    ex["country"],
        "flag":       ex["flag"],
        "region":     ex["region"],
        "currency":   ex["currency"],
        "timezone":   ex["timezone"],
        "local_time": MarketUtils.local_time(ex_id),
        "is_open":    MarketUtils.is_open(ex_id),
        "open":       ex["open"].strftime("%H:%M"),
        "close":      ex["close"].strftime("%H:%M"),
        "suffix":     ex["suffix"],
        "next_open":  MarketUtils.next_open(ex_id),
        "mic":        ex.get("mic"),
    }


POPULAR_SYMBOLS: dict[str, list[str]] = {
    "NYSE":    ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "V", "JNJ"],
    "NASDAQ":  ["AAPL", "MSFT", "NVDA", "AMZN", "META", "TSLA", "AVGO", "ASML", "COST"],
    "NSE":     ["RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS","HINDUNILVR.NS","BAJFINANCE.NS","WIPRO.NS"],
    "BSE":     ["RELIANCE.BO","TCS.BO","HDFCBANK.BO","INFY.BO","ITC.BO","SUNPHARMA.BO","ONGC.BO"],
    "TSE":     ["7203.T","6758.T","9984.T","6861.T","4502.T","8306.T","9432.T","6954.T"],
    "HKEX":    ["0700.HK","0941.HK","0005.HK","2318.HK","1299.HK","0388.HK","2382.HK"],
    "LSE":     ["HSBA.L","AZN.L","SHEL.L","ULVR.L","BP.L","GSK.L","LLOY.L","RIO.L"],
    "XETRA":   ["SAP.DE","SIE.DE","ALV.DE","BAS.DE","BMW.DE","MRK.DE","DTE.DE"],
    "SSE":     ["600519.SS","601318.SS","600036.SS","601628.SS","600000.SS"],
    "ASX":     ["BHP.AX","CBA.AX","CSL.AX","NAB.AX","WBC.AX","ANZ.AX","RIO.AX"],
    "KRX":     ["005930.KS","000660.KS","035420.KS","005380.KS","068270.KS"],
    "SGX":     ["D05.SI","O39.SI","U11.SI","Z74.SI","C31.SI"],
    "B3":      ["PETR4.SA","VALE3.SA","ITUB4.SA","BBDC4.SA","WEGE3.SA","ABEV3.SA"],
}


@router.get("/exchanges/{exchange_id}/symbols")
def get_popular_symbols(exchange_id: str):
    ex_id = exchange_id.upper()
    if ex_id not in EXCHANGES:
        raise HTTPException(status_code=404, detail=f"Exchange '{ex_id}' not found")
    return {
        "exchange": ex_id,
        "flag":     EXCHANGES[ex_id]["flag"],
        "symbols":  POPULAR_SYMBOLS.get(ex_id, []),
    }


@router.get("/indices")
def get_global_indices():
    cached = cache.get("global:indices")
    if cached:
        safe_cached = _sanitize_for_json(cached)
        return {"indices": safe_cached, "count": len(safe_cached), "_cached": True}

    indices = _sanitize_for_json(data_agent.get_all_indices())
    cache.set("global:indices", indices, ttl=60)
    return {"indices": indices, "count": len(indices)}


@router.get("/prices/batch")
def get_batch_prices(
    symbols: str        = Query(..., description="Comma-separated tickers: AAPL,RELIANCE.NS,7203.T"),
    convert: str | None = Query(None, description="Target currency"),
):
    syms    = [s.strip() for s in symbols.split(",")][:50]
    sym_key = ":".join(sorted(syms)) + f":{convert or ''}"
    cached  = cache.get(f"batch:{sym_key}")
    if cached:
        return {"prices": cached, "_cached": True}

    prices  = _sanitize_for_json(data_agent.get_batch_prices(syms))
    results = []
    for sym, price in prices.items():
        _, ex_id = MarketUtils.resolve_ticker(sym)
        ex = EXCHANGES.get(ex_id, EXCHANGES["NYSE"])
        results.append({
            "symbol":   sym,
            "exchange": ex_id,
            "flag":     ex["flag"],
            "price":    round(price, 4) if price else None,
            "currency": ex["currency"],
            "is_open":  MarketUtils.is_open(ex_id),
        })

    cache.set(f"batch:{sym_key}", results, ttl=TTL_BATCH_PRICE)
    return {"prices": results}