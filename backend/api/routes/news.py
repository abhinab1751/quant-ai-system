from fastapi import APIRouter
from agents.research_agent import ResearchAgent
from core.cache import cache, TTL_NEWS

router = APIRouter()
agent  = ResearchAgent()


@router.get("/{symbol}")
def get_news(symbol: str):
    sym    = symbol.upper()
    cached = cache.get_news(sym)
    if cached:
        cached["_cached"] = True
        return cached

    articles  = agent.fetch_news(sym)
    sentiment, confidence = agent.analyze_sentiment(articles)
    summary   = agent.summarize(articles)

    result = {
        "symbol":    sym,
        "summary":   summary,
        "sentiment": sentiment,
        "confidence": round(confidence, 2),
        "articles":  articles[:5],  
    }
    cache.cache_news(sym, result)
    return result