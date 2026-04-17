from agents.data_agent import DataAgent

class MarketService:

    def __init__(self):
        self.data_agent = DataAgent()

    def get_price(self, symbol: str):
        price = self.data_agent.get_current_price(symbol)

        if price is None:
            return {"error": "Invalid symbol"}

        return {
            "symbol": symbol,
            "price": price
        }