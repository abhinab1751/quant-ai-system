import logging

from fastapi import FastAPI, Query
from contextlib import asynccontextmanager

from api.routes import market, prediction, news
from api.routes.backtest import router as backtest_router
from api.routes.ws       import router as ws_router
from agents.prediction_agent import PredictionAgent
from agents.research_agent   import ResearchAgent
from agents.decision_agent   import decide_action
from db.database import init_db, save_prediction, save_price, get_decision_history, get_action_summary
from core.markets import market_utils, EXCHANGES
from agents.data_agent       import DataAgent
from core.ws.scheduler import start_scheduler, stop_scheduler
from api.routes.paper import router as paper_router                 
from core.ws.paper_scheduler import (                               
    start_paper_scheduler, stop_paper_scheduler                     
) 
from api.routes.market import router as market_router_v2
from api.routes.auth import router as auth_router          
from db.auth_models import init_auth_tables                 
from services.auth_service import get_current_user  
from fastapi import Depends
from db.auth_models import User
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_auth_tables()        
    start_scheduler()
    start_paper_scheduler()
    yield
    stop_scheduler()
    stop_paper_scheduler()


app = FastAPI(title="Quant AI System", version="6.0.0", lifespan=lifespan)

prediction_agent = PredictionAgent()
research_agent   = ResearchAgent()
data_agent       = DataAgent()

app.include_router(market.router,     prefix="/market")
app.include_router(market_router_v2,  prefix="/market")
app.include_router(prediction.router, prefix="/prediction")
app.include_router(news.router,       prefix="/news")
app.include_router(backtest_router,   prefix="/backtest")
app.include_router(ws_router,         prefix="/ws")
app.include_router(paper_router,      prefix="/paper")
app.include_router(auth_router, prefix="/auth")


@app.get("/")
def root():
    return {"message": "Quant AI System v6"}


@app.get("/ohlcv/{symbol}")
def get_ohlcv(symbol: str, period: str = Query("6mo")):
    sym = symbol.upper()
    df  = data_agent.get_historical_data(sym, period=period)
    if df.empty:
        return {"symbol": sym, "candles": []}

    df = df.reset_index()
    date_col = "Date" if "Date" in df.columns else df.columns[0]

    candles = []
    for _, row in df.iterrows():
        try:
            candles.append({
                "time":   str(row[date_col])[:10],
                "open":   round(float(row["Open"]),  4),
                "high":   round(float(row["High"]),  4),
                "low":    round(float(row["Low"]),   4),
                "close":  round(float(row["Close"]), 4),
                "volume": int(row.get("Volume", 0)),
            })
        except Exception:
            continue

    return {"symbol": sym, "candles": candles}


@app.get("/decision/{symbol}")
def get_decision(
    symbol: str,
    current_user: User = Depends(get_current_user),  
):
    sym = symbol.upper()

    ml_prediction = "DOWN"
    ml_confidence = 0.5
    sentiment_label = "NEUTRAL"
    sentiment_confidence = 0.0
    fear_greed = {"value": 50, "label": "NEUTRAL"}

    try:
        prediction_agent.train(sym)
        pred, ml_confidence = prediction_agent.predict(sym)
        ml_prediction = "UP" if pred == 1 else "DOWN"
    except Exception as e:
        logger.warning(f"Decision ML pipeline failed for {sym}: {e}")

    try:
        articles = research_agent.fetch_news(sym)
        sentiment_label, sentiment_confidence = research_agent.analyze_sentiment(articles)
    except Exception as e:
        logger.warning(f"Decision sentiment pipeline failed for {sym}: {e}")

    try:
        fear_greed = data_agent.get_fear_greed()
    except Exception as e:
        logger.warning(f"Fear/Greed fetch failed for {sym}: {e}")

    decision = decide_action(
        ml_prediction, ml_confidence,
        sentiment_label, sentiment_confidence,
        fear_greed,
    )

    price = None
    try:
        price = data_agent.get_current_price(sym)
        if price is not None:
            save_price(sym, price)
    except Exception as e:
        logger.warning(f"Live price fetch/save failed for {sym}: {e}")

    try:
        save_prediction(
            symbol=sym,
            ml_prediction=ml_prediction,
            ml_confidence=round(ml_confidence, 4),
            sentiment=sentiment_label,
            sent_confidence=round(sentiment_confidence, 4),
            action=decision["action"],
            reason=decision["reason"],
        )
    except Exception as e:
        logger.warning(f"Decision persistence failed for {sym}: {e}")

    return {
        "symbol": sym,
        "price": price,
        "ml_prediction": ml_prediction,
        "ml_confidence": round(ml_confidence, 4),
        "sentiment": sentiment_label,
        "sentiment_confidence": round(sentiment_confidence, 4),
        "fear_greed": fear_greed,
        "decision": decision,
        "user": current_user.email  
    }


@app.get("/history/{symbol}")
def get_history(symbol: str, limit: int = 50):
    return {"symbol": symbol.upper(), "history": get_decision_history(symbol, limit=limit)}


@app.get("/history/{symbol}/summary")
def get_summary(symbol: str):
    return {"symbol": symbol.upper(), "summary": get_action_summary(symbol)}

@app.get("/markets")
def get_all_markets():
    return {"exchanges": market_utils.all_exchange_status()}

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:5173", "http://localhost:3000"],  
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)