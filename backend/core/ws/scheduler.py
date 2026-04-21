import asyncio
import logging
from datetime import datetime, timezone

from agents.prediction_agent import PredictionAgent
from agents.research_agent   import ResearchAgent
from agents.decision_agent   import decide_action
from core.ws.connection_manager import manager
from core.kafka_producer import kafka
from db.db_service import save_prediction

logger           = logging.getLogger(__name__)
prediction_agent = PredictionAgent()
research_agent   = ResearchAgent()

DECISION_INTERVAL = 300
_scheduler_task: asyncio.Task | None = None


def start_scheduler() -> None:
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())
        _scheduler_task.set_name("decision-scheduler")
        logger.info("[Scheduler] Started")


def stop_scheduler() -> None:
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        logger.info("[Scheduler] Stopped")


async def _scheduler_loop() -> None:
    while True:
        await asyncio.sleep(DECISION_INTERVAL)

        symbols = manager.all_symbols()
        if not symbols:
            continue

        logger.info(f"[Scheduler] Running decisions for: {symbols}")

        for symbol in symbols:
            try:
                result = await asyncio.to_thread(_run_decision, symbol)
                await manager.broadcast(symbol, result)
            except asyncio.CancelledError:
                return
            except Exception as e:
                logger.warning(f"[Scheduler] Decision failed for {symbol}: {e}")
                kafka.publish_error("scheduler", str(e), symbol=symbol)


def _run_decision(symbol: str) -> dict:
    prediction_agent.train(symbol)
    pred, ml_conf = prediction_agent.predict(symbol)
    ml_pred = "UP" if pred == 1 else "DOWN"

    articles          = research_agent.fetch_news(symbol)
    sentiment, s_conf = research_agent.analyze_sentiment(articles)

    decision = decide_action(ml_pred, ml_conf, sentiment, s_conf)

    save_prediction(
        symbol          = symbol,
        ml_prediction   = ml_pred,
        ml_confidence   = round(ml_conf, 4),
        sentiment       = sentiment,
        sent_confidence = round(s_conf, 4),
        action          = decision["action"],
        reason          = decision["reason"],
    )

    result = {
        "type":            "decision",
        "symbol":          symbol,
        "ml_prediction":   ml_pred,
        "ml_confidence":   round(ml_conf, 4),
        "sentiment":       sentiment,
        "sent_confidence": round(s_conf, 4),
        "action":          decision["action"],
        "reason":          decision["reason"],
        "timestamp":       datetime.now(timezone.utc).isoformat(),
    }

    kafka.publish_decision(
        symbol          = symbol,
        action          = decision["action"],
        score           = decision.get("score", 0),
        strength        = decision.get("strength", "weak"),
        reason          = decision["reason"],
        ml_prediction   = ml_pred,
        ml_confidence   = ml_conf,
        sentiment       = sentiment,
        sent_confidence = s_conf,
    )

    return result