from __future__ import annotations
import zoneinfo
from datetime import datetime, time, date
from typing import Optional


EXCHANGES: dict[str, dict] = {

    "NYSE": {
        "name":      "New York Stock Exchange",
        "country":   "United States",
        "flag":      "🇺🇸",
        "suffix":    "",
        "timezone":  "America/New_York",
        "currency":  "USD",
        "open":      time(9, 30),
        "close":     time(16, 0),
        "weekdays":  {0, 1, 2, 3, 4},   
        "region":    "Americas",
        "mic":       "XNYS",
    },
    "NASDAQ": {
        "name":      "NASDAQ",
        "country":   "United States",
        "flag":      "🇺🇸",
        "suffix":    "",
        "timezone":  "America/New_York",
        "currency":  "USD",
        "open":      time(9, 30),
        "close":     time(16, 0),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Americas",
        "mic":       "XNAS",
    },
    "TSX": {
        "name":      "Toronto Stock Exchange",
        "country":   "Canada",
        "flag":      "🇨🇦",
        "suffix":    ".TO",
        "timezone":  "America/Toronto",
        "currency":  "CAD",
        "open":      time(9, 30),
        "close":     time(16, 0),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Americas",
        "mic":       "XTSE",
    },
    "B3": {
        "name":      "B3 – Brasil, Bolsa, Balcão",
        "country":   "Brazil",
        "flag":      "🇧🇷",
        "suffix":    ".SA",
        "timezone":  "America/Sao_Paulo",
        "currency":  "BRL",
        "open":      time(10, 0),
        "close":     time(17, 55),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Americas",
        "mic":       "BVMF",
    },

    "LSE": {
        "name":      "London Stock Exchange",
        "country":   "United Kingdom",
        "flag":      "🇬🇧",
        "suffix":    ".L",
        "timezone":  "Europe/London",
        "currency":  "GBP",
        "open":      time(8, 0),
        "close":     time(16, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Europe",
        "mic":       "XLON",
    },
    "XETRA": {
        "name":      "Deutsche Börse XETRA",
        "country":   "Germany",
        "flag":      "🇩🇪",
        "suffix":    ".DE",
        "timezone":  "Europe/Berlin",
        "currency":  "EUR",
        "open":      time(9, 0),
        "close":     time(17, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Europe",
        "mic":       "XETR",
    },
    "EURONEXT": {
        "name":      "Euronext Paris",
        "country":   "France",
        "flag":      "🇫🇷",
        "suffix":    ".PA",
        "timezone":  "Europe/Paris",
        "currency":  "EUR",
        "open":      time(9, 0),
        "close":     time(17, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Europe",
        "mic":       "XPAR",
    },
    "SIX": {
        "name":      "SIX Swiss Exchange",
        "country":   "Switzerland",
        "flag":      "🇨🇭",
        "suffix":    ".SW",
        "timezone":  "Europe/Zurich",
        "currency":  "CHF",
        "open":      time(9, 0),
        "close":     time(17, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Europe",
        "mic":       "XSWX",
    },
    "EURONEXT_AM": {
        "name":      "Euronext Amsterdam",
        "country":   "Netherlands",
        "flag":      "🇳🇱",
        "suffix":    ".AS",
        "timezone":  "Europe/Amsterdam",
        "currency":  "EUR",
        "open":      time(9, 0),
        "close":     time(17, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Europe",
        "mic":       "XAMS",
    },
    "BME": {
        "name":      "Bolsa de Madrid",
        "country":   "Spain",
        "flag":      "🇪🇸",
        "suffix":    ".MC",
        "timezone":  "Europe/Madrid",
        "currency":  "EUR",
        "open":      time(9, 0),
        "close":     time(17, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Europe",
        "mic":       "XMAD",
    },
    "BORSA_ITALIANA": {
        "name":      "Borsa Italiana",
        "country":   "Italy",
        "flag":      "🇮🇹",
        "suffix":    ".MI",
        "timezone":  "Europe/Rome",
        "currency":  "EUR",
        "open":      time(9, 0),
        "close":     time(17, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Europe",
        "mic":       "XMIL",
    },

    "NSE": {
        "name":      "National Stock Exchange of India",
        "country":   "India",
        "flag":      "🇮🇳",
        "suffix":    ".NS",
        "timezone":  "Asia/Kolkata",
        "currency":  "INR",
        "open":      time(9, 15),
        "close":     time(15, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XNSE",
    },
    "BSE": {
        "name":      "Bombay Stock Exchange",
        "country":   "India",
        "flag":      "🇮🇳",
        "suffix":    ".BO",
        "timezone":  "Asia/Kolkata",
        "currency":  "INR",
        "open":      time(9, 15),
        "close":     time(15, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XBOM",
    },
    "TSE": {
        "name":      "Tokyo Stock Exchange",
        "country":   "Japan",
        "flag":      "🇯🇵",
        "suffix":    ".T",
        "timezone":  "Asia/Tokyo",
        "currency":  "JPY",
        "open":      time(9, 0),
        "close":     time(15, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XTKS",
    },
    "HKEX": {
        "name":      "Hong Kong Stock Exchange",
        "country":   "Hong Kong",
        "flag":      "🇭🇰",
        "suffix":    ".HK",
        "timezone":  "Asia/Hong_Kong",
        "currency":  "HKD",
        "open":      time(9, 30),
        "close":     time(16, 0),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XHKG",
    },
    "SSE": {
        "name":      "Shanghai Stock Exchange",
        "country":   "China",
        "flag":      "🇨🇳",
        "suffix":    ".SS",
        "timezone":  "Asia/Shanghai",
        "currency":  "CNY",
        "open":      time(9, 30),
        "close":     time(15, 0),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XSHG",
    },
    "SZSE": {
        "name":      "Shenzhen Stock Exchange",
        "country":   "China",
        "flag":      "🇨🇳",
        "suffix":    ".SZ",
        "timezone":  "Asia/Shanghai",
        "currency":  "CNY",
        "open":      time(9, 30),
        "close":     time(15, 0),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XSHE",
    },
    "KRX": {
        "name":      "Korea Exchange",
        "country":   "South Korea",
        "flag":      "🇰🇷",
        "suffix":    ".KS",
        "timezone":  "Asia/Seoul",
        "currency":  "KRW",
        "open":      time(9, 0),
        "close":     time(15, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XKRX",
    },
    "ASX": {
        "name":      "Australian Securities Exchange",
        "country":   "Australia",
        "flag":      "🇦🇺",
        "suffix":    ".AX",
        "timezone":  "Australia/Sydney",
        "currency":  "AUD",
        "open":      time(10, 0),
        "close":     time(16, 0),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XASX",
    },
    "SGX": {
        "name":      "Singapore Exchange",
        "country":   "Singapore",
        "flag":      "🇸🇬",
        "suffix":    ".SI",
        "timezone":  "Asia/Singapore",
        "currency":  "SGD",
        "open":      time(9, 0),
        "close":     time(17, 0),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XSES",
    },
    "TWSE": {
        "name":      "Taiwan Stock Exchange",
        "country":   "Taiwan",
        "flag":      "🇹🇼",
        "suffix":    ".TW",
        "timezone":  "Asia/Taipei",
        "currency":  "TWD",
        "open":      time(9, 0),
        "close":     time(13, 30),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Asia-Pacific",
        "mic":       "XTAI",
    },

    "TADAWUL": {
        "name":      "Saudi Exchange (Tadawul)",
        "country":   "Saudi Arabia",
        "flag":      "🇸🇦",
        "suffix":    ".SR",
        "timezone":  "Asia/Riyadh",
        "currency":  "SAR",
        "open":      time(10, 0),
        "close":     time(15, 0),
        "weekdays":  {0, 1, 2, 3, 6},  
        "region":    "Middle East & Africa",
        "mic":       "XSAU",
    },
    "DFM": {
        "name":      "Dubai Financial Market",
        "country":   "UAE",
        "flag":      "🇦🇪",
        "suffix":    ".AE",
        "timezone":  "Asia/Dubai",
        "currency":  "AED",
        "open":      time(10, 0),
        "close":     time(14, 0),
        "weekdays":  {0, 1, 2, 3, 6},
        "region":    "Middle East & Africa",
        "mic":       "XDFM",
    },
    "JSE": {
        "name":      "Johannesburg Stock Exchange",
        "country":   "South Africa",
        "flag":      "🇿🇦",
        "suffix":    ".JO",
        "timezone":  "Africa/Johannesburg",
        "currency":  "ZAR",
        "open":      time(9, 0),
        "close":     time(17, 0),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Middle East & Africa",
        "mic":       "XJSE",
    },
    "EGX": {
        "name":      "Egyptian Exchange",
        "country":   "Egypt",
        "flag":      "🇪🇬",
        "suffix":    ".CA",
        "timezone":  "Africa/Cairo",
        "currency":  "EGP",
        "open":      time(10, 0),
        "close":     time(14, 30),
        "weekdays":  {0, 1, 2, 3, 6},
        "region":    "Middle East & Africa",
        "mic":       "XCAI",
    },

    "INDEX": {
        "name":      "Global Indices",
        "country":   "Global",
        "flag":      "🌍",
        "suffix":    "",
        "timezone":  "UTC",
        "currency":  "USD",
        "open":      time(0, 0),
        "close":     time(23, 59),
        "weekdays":  {0, 1, 2, 3, 4},
        "region":    "Indices",
        "mic":       None,
    },
}

GLOBAL_INDICES = {
    "^GSPC":  {"name": "S&P 500",       "flag": "🇺🇸", "exchange": "NYSE"},
    "^DJI":   {"name": "Dow Jones",     "flag": "🇺🇸", "exchange": "NYSE"},
    "^IXIC":  {"name": "NASDAQ Comp",   "flag": "🇺🇸", "exchange": "NASDAQ"},
    "^NSEI":  {"name": "NIFTY 50",      "flag": "🇮🇳", "exchange": "NSE"},
    "^BSESN": {"name": "SENSEX",        "flag": "🇮🇳", "exchange": "BSE"},
    "^FTSE":  {"name": "FTSE 100",      "flag": "🇬🇧", "exchange": "LSE"},
    "^GDAXI": {"name": "DAX",           "flag": "🇩🇪", "exchange": "XETRA"},
    "^FCHI":  {"name": "CAC 40",        "flag": "🇫🇷", "exchange": "EURONEXT"},
    "^N225":  {"name": "Nikkei 225",    "flag": "🇯🇵", "exchange": "TSE"},
    "^HSI":   {"name": "Hang Seng",     "flag": "🇭🇰", "exchange": "HKEX"},
    "000001.SS": {"name": "SSE Comp",   "flag": "🇨🇳", "exchange": "SSE"},
    "^AXJO": {"name":  "ASX 200",       "flag": "🇦🇺", "exchange": "ASX"},
    "^KS11":  {"name": "KOSPI",         "flag": "🇰🇷", "exchange": "KRX"},
    "^STI":   {"name": "STI",           "flag": "🇸🇬", "exchange": "SGX"},
    "^TWII":  {"name": "Taiwan Weighted","flag": "🇹🇼", "exchange": "TWSE"},
    "^STOXX50E": {"name": "Euro Stoxx 50","flag": "🇪🇺", "exchange": "EURONEXT"},
}
CURRENCY_SYMBOLS = {
    "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "INR": "₹",
    "CNY": "¥", "HKD": "HK$", "AUD": "A$", "CAD": "C$", "CHF": "Fr",
    "KRW": "₩", "SGD": "S$", "TWD": "NT$", "BRL": "R$", "SAR": "﷼",
    "AED": "AED", "ZAR": "R", "EGP": "E£",
}

class MarketUtils:

    @staticmethod
    def get_exchange(exchange_id: str) -> dict:
        ex = EXCHANGES.get(exchange_id.upper())
        if not ex:
            raise ValueError(f"Unknown exchange: {exchange_id}")
        return ex

    @staticmethod
    def is_open(exchange_id: str) -> bool:
        ex = EXCHANGES.get(exchange_id.upper())
        if not ex:
            return False
        tz   = zoneinfo.ZoneInfo(ex["timezone"])
        now  = datetime.now(tz)
        if now.weekday() not in ex["weekdays"]:
            return False
        current_time = now.time()
        return ex["open"] <= current_time < ex["close"]

    @staticmethod
    def local_time(exchange_id: str) -> str:
        ex = EXCHANGES.get(exchange_id.upper())
        if not ex:
            return "—"
        tz  = zoneinfo.ZoneInfo(ex["timezone"])
        now = datetime.now(tz)
        return now.strftime("%H:%M %Z")

    @staticmethod
    def next_open(exchange_id: str) -> Optional[str]:
        ex = EXCHANGES.get(exchange_id.upper())
        if not ex:
            return None
        tz  = zoneinfo.ZoneInfo(ex["timezone"])
        now = datetime.now(tz)
        if now.weekday() in ex["weekdays"] and now.time() < ex["open"]:
            next_dt = now.replace(
                hour=ex["open"].hour, minute=ex["open"].minute, second=0, microsecond=0
            )
            return next_dt.isoformat()
        for delta in range(1, 8):
            candidate = now.date() + __import__("datetime").timedelta(days=delta)
            if candidate.weekday() in ex["weekdays"]:
                next_dt = datetime(
                    candidate.year, candidate.month, candidate.day,
                    ex["open"].hour, ex["open"].minute, tzinfo=tz
                )
                return next_dt.isoformat()
        return None

    @staticmethod
    def resolve_ticker(symbol: str) -> tuple[str, str]:
        if symbol.startswith("^") or symbol in GLOBAL_INDICES:
            return symbol, "INDEX"

        suffix_map = {ex["suffix"]: ex_id for ex_id, ex in EXCHANGES.items() if ex["suffix"]}
        for suffix, ex_id in sorted(suffix_map.items(), key=lambda x: -len(x[0])):
            if symbol.upper().endswith(suffix.upper()):
                return symbol, ex_id

        return symbol, "NYSE"   

    @staticmethod
    def get_currency_symbol(currency_code: str) -> str:
        return CURRENCY_SYMBOLS.get(currency_code, currency_code)

    @staticmethod
    def format_price(price: float, currency: str) -> str:
        sym = MarketUtils.get_currency_symbol(currency)
        if currency in ("JPY", "KRW"):   
            return f"{sym}{price:,.0f}"
        return f"{sym}{price:,.2f}"

    @staticmethod
    def all_exchange_status() -> list[dict]:
        
        result = []
        for ex_id, ex in EXCHANGES.items():
            if ex_id == "INDEX":
                continue
            result.append({
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
            })
        return sorted(result, key=lambda x: (x["region"], x["name"]))

    @staticmethod
    def get_regions() -> list[str]:
        regions = sorted({ex["region"] for ex in EXCHANGES.values()})
        return regions

    @staticmethod
    def exchanges_by_region() -> dict[str, list]:
        result: dict[str, list] = {}
        for ex_id, ex in EXCHANGES.items():
            if ex_id == "INDEX":
                continue
            r = ex["region"]
            result.setdefault(r, []).append({
                "id":      ex_id,
                "name":    ex["name"],
                "flag":    ex["flag"],
                "suffix":  ex["suffix"],
                "is_open": MarketUtils.is_open(ex_id),
            })
        return result

market_utils = MarketUtils()