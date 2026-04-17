import requests
import yfinance as yf


class DataAgent:

    def get_current_price(self, symbol: str) -> float | None:
        stock = yf.Ticker(symbol)
        data  = stock.history(period="1d")
        if data.empty:
            return None
        return float(data["Close"].iloc[-1])

    def get_historical_data(self, symbol: str, period: str = "2y"):
        stock = yf.Ticker(symbol)
        return stock.history(period=period)

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