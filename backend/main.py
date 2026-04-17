from fastapi import FastAPI, Query
from contextlib import asynccontextmanager

from api.routes import market, prediction, news
from api.routes.backtest import router as backtest_router
from api.routes.ws       import router as ws_router
from agents.prediction_agent import PredictionAgent
from agents.research_agent   import ResearchAgent
from agents.decision_agent   import decide_action
from agents.data_agent       import DataAgent
from db.database   import init_db
from db.db_service import save_prediction, save_price, get_decision_history, get_action_summary
from core.ws.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Quant AI System", version="6.0.0", lifespan=lifespan)

prediction_agent = PredictionAgent()
research_agent   = ResearchAgent()
data_agent       = DataAgent()

app.include_router(market.router,     prefix="/market")
app.include_router(prediction.router, prefix="/prediction")
app.include_router(news.router,       prefix="/news")
app.include_router(backtest_router,   prefix="/backtest")
app.include_router(ws_router,         prefix="/ws")


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
def get_decision(symbol: str):
    sym = symbol.upper()

    prediction_agent.train(sym)
    pred, ml_confidence = prediction_agent.predict(sym)
    ml_prediction = "UP" if pred == 1 else "DOWN"

    articles = research_agent.fetch_news(sym)
    sentiment_label, sentiment_confidence = research_agent.analyze_sentiment(articles)
    fear_greed = data_agent.get_fear_greed()

    decision = decide_action(
        ml_prediction, ml_confidence,
        sentiment_label, sentiment_confidence,
        fear_greed,
    )

    price = data_agent.get_current_price(sym)
    if price:
        save_price(sym, price)

    save_prediction(
        symbol=sym, ml_prediction=ml_prediction,
        ml_confidence=round(ml_confidence, 4),
        sentiment=sentiment_label,
        sent_confidence=round(sentiment_confidence, 4),
        action=decision["action"], reason=decision["reason"],
    )

    return {
        "symbol": sym, "price": price,
        "ml_prediction": ml_prediction,
        "ml_confidence": round(ml_confidence, 4),
        "sentiment": sentiment_label,
        "sentiment_confidence": round(sentiment_confidence, 4),
        "fear_greed": fear_greed,
        "decision": decision,
    }


@app.get("/history/{symbol}")
def get_history(symbol: str, limit: int = 50):
    return {"symbol": symbol.upper(), "history": get_decision_history(symbol, limit=limit)}


@app.get("/history/{symbol}/summary")
def get_summary(symbol: str):
    return {"symbol": symbol.upper(), "summary": get_action_summary(symbol)}