from fastapi import APIRouter, Query
from agents.prediction_agent import PredictionAgent

router = APIRouter()
agent  = PredictionAgent()


@router.post("/train/{symbol}")
def train_model(symbol: str, force: bool = Query(False)):
    return agent.train(symbol.upper(), force=force)


@router.get("/{symbol}")
def predict(symbol: str):
    pred, conf = agent.predict(symbol.upper())
    return {
        "symbol":     symbol.upper(),
        "prediction": "UP" if pred == 1 else "DOWN",
        "confidence": round(conf, 4),
    }


@router.get("/{symbol}/features")
def feature_importance(symbol: str):
    imp = agent.feature_importance(symbol.upper())
    return {"symbol": symbol.upper(), "feature_importance": imp}


@router.delete("/{symbol}")
def delete_model(symbol: str):
    return {"deleted": agent.delete_model(symbol.upper()), "symbol": symbol.upper()}