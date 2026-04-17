from datetime import datetime
from db.database import db, Price, Prediction, ModelMeta



def save_price(symbol: str, price: float, source: str = "yfinance") -> Price:
    with db:
        return Price.create(symbol=symbol.upper(), price=price, source=source)


def get_latest_price(symbol: str) -> Price | None:
    return (
        Price.select()
        .where(Price.symbol == symbol.upper())
        .order_by(Price.fetched_at.desc())
        .first()
    )


def get_price_history(symbol: str, limit: int = 100) -> list[dict]:
    rows = (
        Price.select()
        .where(Price.symbol == symbol.upper())
        .order_by(Price.fetched_at.desc())
        .limit(limit)
    )
    return [
        {"price": r.price, "fetched_at": r.fetched_at.isoformat(), "source": r.source}
        for r in rows
    ]


def save_prediction(
    symbol: str,
    ml_prediction: str,
    ml_confidence: float,
    sentiment: str,
    sent_confidence: float,
    action: str,
    reason: str,
) -> Prediction:
    with db:
        return Prediction.create(
            symbol=symbol.upper(),
            ml_prediction=ml_prediction,
            ml_confidence=ml_confidence,
            sentiment=sentiment,
            sent_confidence=sent_confidence,
            action=action,
            reason=reason,
        )


def get_decision_history(symbol: str, limit: int = 50) -> list[dict]:
    rows = (
        Prediction.select()
        .where(Prediction.symbol == symbol.upper())
        .order_by(Prediction.created_at.desc())
        .limit(limit)
    )
    return [
        {
            "id": r.id,
            "ml_prediction": r.ml_prediction,
            "ml_confidence": r.ml_confidence,
            "sentiment": r.sentiment,
            "sent_confidence": r.sent_confidence,
            "action": r.action,
            "reason": r.reason,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


def get_action_summary(symbol: str) -> dict:
    rows = Prediction.select().where(Prediction.symbol == symbol.upper())
    summary = {"BUY": 0, "SELL": 0, "HOLD": 0}
    for r in rows:
        summary[r.action] = summary.get(r.action, 0) + 1
    return summary


def save_model_meta(
    symbol: str,
    cv_accuracy: float,
    cv_std: float,
    n_samples: int,
) -> ModelMeta:
    with db:
        return ModelMeta.create(
            symbol=symbol.upper(),
            cv_accuracy=cv_accuracy,
            cv_std=cv_std,
            n_samples=n_samples,
        )


def get_latest_model_meta(symbol: str) -> ModelMeta | None:
    return (
        ModelMeta.select()
        .where(ModelMeta.symbol == symbol.upper())
        .order_by(ModelMeta.trained_at.desc())
        .first()
    )