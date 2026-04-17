from fastapi import APIRouter
from services.market_service import MarketService

router = APIRouter()
market_service = MarketService()

@router.get("/price")
def get_price(symbol: str):
    return market_service.get_price(symbol)