"""import requests
from core.config import settings

class ResearchAgent:

    def fetch_news(self, symbol: str):
        url = "https://newsapi.org/v2/everything"

        params = {
            "q": symbol,
            "apiKey": settings.NEWS_API_KEY,
            "pageSize": 5
        }

        response = requests.get(url, params=params)
        data = response.json()

        articles = data.get("articles", [])
        return articles

    def analyze_sentiment(self, articles):
        positive_weights = {
            "growth": 1.2,
            "profit": 1.5,
            "profits": 1.5,
            "gain": 1.0,
            "gains": 1.0,
            "beat": 1.5,
            "beats": 1.5,
            "bullish": 1.6,
            "upside": 1.2,
            "surge": 1.6,
            "rally": 1.4,
            "record": 1.0,
            "strong": 0.8,
            "lucrative": 2.0,
            "buy": 0.8,
        }

        negative_weights = {
            "loss": 1.5,
            "losses": 1.5,
            "drop": 1.2,
            "drops": 1.2,
            "fall": 1.2,
            "falls": 1.2,
            "miss": 1.5,
            "misses": 1.5,
            "bearish": 1.6,
            "downside": 1.2,
            "plunge": 1.8,
            "slump": 1.6,
            "weak": 0.8,
            "sell": 0.8,
        }

        if not articles:
            return "NEUTRAL", 0

        total_score = 0.0

        for article in articles:
            title = (article.get("title") or "").lower()
            description = (article.get("description") or "").lower()
            text = f"{title} {description}"

            for word, weight in positive_weights.items():
                if word in text:
                    total_score += weight

            for word, weight in negative_weights.items():
                if word in text:
                    total_score -= weight

        average_score = total_score / len(articles)
        if average_score > 0.25:
            sentiment = "POSITIVE"
        elif average_score < -0.25:
            sentiment = "NEGATIVE"
        else:
            sentiment = "NEUTRAL"

        confidence = min(abs(average_score) / 2.0, 1.0)

        return sentiment, confidence

    def summarize(self, articles):
        return articles[0]["title"] if articles else "No news available"""

import os
import json
import logging
import requests
from core.config import settings

logger = logging.getLogger(__name__)


class ResearchAgent:

    def fetch_news(self, symbol: str) -> list[dict]:
        url    = "https://newsapi.org/v2/everything"
        params = {"q": symbol, "apiKey": settings.NEWS_API_KEY, "pageSize": 8,
                  "sortBy": "publishedAt", "language": "en"}
        try:
            resp = requests.get(url, params=params, timeout=10)
            return resp.json().get("articles", [])
        except Exception as e:
            logger.warning(f"News fetch failed for {symbol}: {e}")
            return []



    def analyze_sentiment(self, articles: list[dict]) -> tuple[str, float]:
    
        if not articles:
            return "NEUTRAL", 0.0

        try:
            return self._llm_sentiment(articles)
        except Exception as e:
            logger.warning(f"LLM sentiment failed ({e}), using keyword fallback")
            return self._keyword_sentiment(articles)

    def _llm_sentiment(self, articles: list[dict]) -> tuple[str, float]:
        api_key = os.getenv("HUGGINGFACE_API_KEY")
        if not api_key:
            raise ValueError("HUGGINGFACE_API_KEY not set")

        texts = []
        for a in articles[:6]:
            title = (a.get("title") or "").strip()
            desc = (a.get("description") or "").strip()
            if title:
                texts.append(f"{title}. {desc}" if desc else title)

        if not texts:
            return "NEUTRAL", 0.0

        payload = {"inputs": texts}

        response = requests.post(
            "https://api-inference.huggingface.co/models/ProsusAI/finbert",
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
            timeout=10,
        )

        data = response.json()

        if isinstance(data, dict) and "error" in data:
            raise ValueError(f"HuggingFace API error: {data['error']}")

        score = 0.0

        for res in data:
            try:
                label = res[0]["label"].upper()
                conf = res[0]["score"]

                if "POSITIVE" in label:
                    score += conf
                elif "NEGATIVE" in label:
                    score -= conf
            except Exception:
                continue

        if len(data) == 0:
            return "NEUTRAL", 0.0

        avg = score / len(data)

        if avg > 0.2:
            sentiment = "POSITIVE"
        elif avg < -0.2:
            sentiment = "NEGATIVE"
        else:
            sentiment = "NEUTRAL"

        return sentiment, round(min(abs(avg), 1.0), 4)

    def _keyword_sentiment(self, articles: list[dict]) -> tuple[str, float]:
        positive = {"growth":1.2,"profit":1.5,"profits":1.5,"gain":1.0,"gains":1.0,
                    "beat":1.5,"beats":1.5,"bullish":1.6,"upside":1.2,"surge":1.6,
                    "rally":1.4,"record":1.0,"strong":0.8,"lucrative":2.0,"buy":0.8,
                    "upgrade":1.8,"outperform":1.6,"raised":1.2,"exceeds":1.5}
        negative = {"loss":1.5,"losses":1.5,"drop":1.2,"drops":1.2,"fall":1.2,
                    "falls":1.2,"miss":1.5,"misses":1.5,"bearish":1.6,"downside":1.2,
                    "plunge":1.8,"slump":1.6,"weak":0.8,"sell":0.8,"downgrade":1.8,
                    "underperform":1.6,"cut":1.2,"missed":1.5,"below":1.0}

        total = 0.0
        for a in articles:
            text = f"{a.get('title','')} {a.get('description','')}".lower()
            for w, wt in positive.items():
                if w in text: total += wt
            for w, wt in negative.items():
                if w in text: total -= wt

        avg = total / len(articles)
        if avg > 0.25:   sentiment = "POSITIVE"
        elif avg < -0.25: sentiment = "NEGATIVE"
        else:             sentiment = "NEUTRAL"

        return sentiment, round(min(abs(avg) / 2.0, 1.0), 4)

    def summarize(self, articles: list[dict]) -> str:
        return articles[0]["title"] if articles else "No news available"