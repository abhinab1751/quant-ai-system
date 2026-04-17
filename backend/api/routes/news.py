from fastapi import APIRouter
from agents.research_agent import ResearchAgent

router = APIRouter()
agent = ResearchAgent()

@router.get("/{symbol}")
def get_news(symbol: str):
    articles = agent.fetch_news(symbol)
    sentiment, confidence = agent.analyze_sentiment(articles)
    summary = agent.summarize(articles)

    return {
        "summary": summary,
        "sentiment": sentiment,
        "confidence": round(confidence, 2)
    }