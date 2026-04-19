import os
import logging
from typing import TypedDict, Annotated, List, Optional
from datetime import datetime, timezone
import operator
import re
from pathlib import Path

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END

import yfinance as yf
import requests
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def _load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    try:
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)
    except Exception:
        return


_load_env_file()


PRIMARY_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
FALLBACK_GROQ_MODELS = [
    m.strip()
    for m in os.getenv("GROQ_MODEL_FALLBACKS", "llama-3.1-8b-instant,gemma2-9b-it").split(",")
    if m.strip()
]
_llm_clients: dict[str, ChatGroq] = {}


def _candidate_models() -> list[str]:
    models: list[str] = []
    for m in [PRIMARY_GROQ_MODEL, *FALLBACK_GROQ_MODELS]:
        if m and m not in models:
            models.append(m)
    return models


def _get_llm(model: str) -> ChatGroq:
    if model not in _llm_clients:
        _llm_clients[model] = ChatGroq(
            model=model,
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.2,
            max_tokens=1024,
        )
    return _llm_clients[model]


def _is_rate_limit_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        "rate limit" in text
        or "rate_limit_exceeded" in text
        or "error code: 429" in text
        or "tokens per day" in text
    )


def _extract_retry_hint(exc: Exception) -> str | None:
    text = str(exc)
    m = re.search(r"try again in\s*([^\.\n]+)", text, re.IGNORECASE)
    return m.group(1).strip() if m else None


def invoke_llm(messages: list) -> AIMessage:
    last_exc: Exception | None = None
    for model in _candidate_models():
        try:
            return _get_llm(model).invoke(messages)
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit_error(exc):
                logger.warning("Groq model %s is rate limited, trying fallback model", model)
                continue
            raise

    if last_exc and _is_rate_limit_error(last_exc):
        retry_hint = _extract_retry_hint(last_exc)
        retry_msg = f" Please retry in {retry_hint}." if retry_hint else ""
        raise RuntimeError(
            "Groq rate limit reached for all configured models."
            f"{retry_msg} Set GROQ_MODEL_FALLBACKS to additional models or upgrade your Groq tier."
        )

    raise RuntimeError(f"All configured Groq models failed: {last_exc}")

class TradeBriefState(TypedDict):
    symbol: str
    user_intent: str                          
    messages: Annotated[List, operator.add]

    market_context: Optional[dict]
    technical_analysis: Optional[dict]
    sentiment_analysis: Optional[dict]
    risk_assessment: Optional[dict]
    trade_brief: Optional[dict]

    current_agent: str
    errors: Annotated[List[str], operator.add]


@tool
def get_price_and_volume(symbol: str) -> dict:
    """Get current price, volume, and basic market data for a stock symbol."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.fast_info
        hist = ticker.history(period="5d", interval="1d")

        if hist.empty:
            return {"error": f"No data for {symbol}"}

        current_price = float(info.last_price) if hasattr(info, 'last_price') and info.last_price else float(hist['Close'].iloc[-1])
        avg_volume = float(hist['Volume'].mean())
        today_volume = float(hist['Volume'].iloc[-1])
        volume_ratio = today_volume / avg_volume if avg_volume > 0 else 1.0

        prev_close = float(hist['Close'].iloc[-2]) if len(hist) >= 2 else current_price
        change_pct = ((current_price - prev_close) / prev_close) * 100

        return {
            "symbol": symbol,
            "price": round(current_price, 2),
            "change_pct": round(change_pct, 2),
            "volume": int(today_volume),
            "avg_volume": int(avg_volume),
            "volume_ratio": round(volume_ratio, 2),
            "volume_surge": volume_ratio > 1.5,
        }
    except Exception as e:
        return {"error": str(e)}


@tool
def get_technical_indicators(symbol: str) -> dict:
    """Calculate RSI, MACD, Bollinger Bands, and trend indicators for a symbol."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="3mo", interval="1d")

        if len(hist) < 26:
            return {"error": "Insufficient data for technical analysis"}

        close = hist['Close']

        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = float((100 - (100 / (1 + rs))).iloc[-1])

        ema12 = close.ewm(span=12).mean()
        ema26 = close.ewm(span=26).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9).mean()
        macd_hist = macd - signal
        macd_val = float(macd.iloc[-1])
        macd_signal_val = float(signal.iloc[-1])
        macd_hist_val = float(macd_hist.iloc[-1])
        macd_crossover = float(macd_hist.iloc[-1]) > 0 and float(macd_hist.iloc[-2]) <= 0

        sma20 = close.rolling(20).mean()
        std20 = close.rolling(20).std()
        bb_upper = sma20 + 2 * std20
        bb_lower = sma20 - 2 * std20
        bb_position = float((close.iloc[-1] - bb_lower.iloc[-1]) / (bb_upper.iloc[-1] - bb_lower.iloc[-1]))

        sma50 = close.rolling(50).mean()
        price_vs_sma50 = float((close.iloc[-1] - sma50.iloc[-1]) / sma50.iloc[-1] * 100)

        support = float(close.rolling(20).min().iloc[-1])
        resistance = float(close.rolling(20).max().iloc[-1])
        current = float(close.iloc[-1])
        pct_from_support = (current - support) / support * 100
        pct_from_resistance = (resistance - current) / resistance * 100

        return {
            "rsi": round(rsi, 1),
            "rsi_signal": "overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral",
            "macd": round(macd_val, 4),
            "macd_signal": round(macd_signal_val, 4),
            "macd_histogram": round(macd_hist_val, 4),
            "macd_bullish_crossover": macd_crossover,
            "bb_position": round(bb_position, 2),
            "bb_signal": "near_upper" if bb_position > 0.8 else "near_lower" if bb_position < 0.2 else "mid_range",
            "trend_vs_sma50_pct": round(price_vs_sma50, 2),
            "trend": "uptrend" if price_vs_sma50 > 2 else "downtrend" if price_vs_sma50 < -2 else "sideways",
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "pct_from_support": round(pct_from_support, 2),
            "pct_from_resistance": round(pct_from_resistance, 2),
        }
    except Exception as e:
        return {"error": str(e)}


@tool
def get_fear_greed_index() -> dict:
    """Get the CNN Fear & Greed Index to understand overall market sentiment."""
    try:
        resp = requests.get(
            "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=8,
        )
        data = resp.json()
        value = int(data["fear_and_greed"]["score"])
        label = data["fear_and_greed"]["rating"]
        
        interpretation = (
            "extreme fear — contrarian buy opportunity" if value <= 25
            else "fear — market pessimism, potential opportunity" if value <= 45
            else "neutral — balanced market" if value <= 55
            else "greed — caution advised" if value <= 75
            else "extreme greed — high risk of correction"
        )
        
        return {
            "value": value,
            "label": label.upper(),
            "interpretation": interpretation,
            "contrarian_signal": "BUY" if value <= 25 else "SELL" if value >= 75 else "HOLD",
        }
    except Exception as e:
        return {"value": 50, "label": "NEUTRAL", "interpretation": "Data unavailable", "error": str(e)}


@tool
def get_volatility_metrics(symbol: str) -> dict:
    """Calculate historical volatility, ATR, and risk metrics for position sizing."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="3mo", interval="1d")

        if len(hist) < 14:
            return {"error": "Insufficient data"}

        close = hist['Close']
        high = hist['High']
        low = hist['Low']

        returns = close.pct_change().dropna()
        hv_30 = float(returns.rolling(30).std().iloc[-1]) * np.sqrt(252) * 100

        tr = pd.concat([
            high - low,
            (high - close.shift(1)).abs(),
            (low - close.shift(1)).abs()
        ], axis=1).max(axis=1)
        atr = float(tr.rolling(14).mean().iloc[-1])
        atr_pct = atr / float(close.iloc[-1]) * 100

        roll_max = close.rolling(30).max()
        drawdown = (close - roll_max) / roll_max * 100
        max_dd = float(drawdown.min())

        portfolio_size = 10000
        risk_amount = portfolio_size * 0.01
        stop_loss_distance = atr * 2
        shares = risk_amount / stop_loss_distance if stop_loss_distance > 0 else 0
        position_value = shares * float(close.iloc[-1])

        risk_level = "LOW" if hv_30 < 20 else "MEDIUM" if hv_30 < 40 else "HIGH"

        return {
            "historical_volatility_30d_pct": round(hv_30, 1),
            "atr": round(atr, 2),
            "atr_pct_of_price": round(atr_pct, 2),
            "max_drawdown_30d_pct": round(max_dd, 2),
            "risk_level": risk_level,
            "suggested_shares_per_10k": round(shares, 2),
            "suggested_position_value": round(position_value, 2),
            "stop_loss_distance": round(stop_loss_distance, 2),
            "note": "Based on 1% portfolio risk rule with 2x ATR stop"
        }
    except Exception as e:
        return {"error": str(e)}


@tool
def get_market_hours_and_context(symbol: str) -> dict:
    """Check if market is open, upcoming events, and trading session context."""
    try:
        from datetime import datetime
        import pytz

        now_et = datetime.now(pytz.timezone('America/New_York'))
        weekday = now_et.weekday()
        hour = now_et.hour
        minute = now_et.minute
        time_decimal = hour + minute / 60

        is_weekend = weekday >= 5
        is_premarket = not is_weekend and 4 <= time_decimal < 9.5
        is_market_hours = not is_weekend and 9.5 <= time_decimal < 16
        is_afterhours = not is_weekend and 16 <= time_decimal < 20

        session = (
            "CLOSED_WEEKEND" if is_weekend
            else "PRE_MARKET" if is_premarket
            else "MARKET_HOURS" if is_market_hours
            else "AFTER_HOURS" if is_afterhours
            else "CLOSED_OVERNIGHT"
        )

        warnings = []
        if is_premarket:
            warnings.append("Pre-market: Low liquidity, wider spreads. Use limit orders.")
        if is_afterhours:
            warnings.append("After-hours: High volatility, low volume. Exercise caution.")
        if is_weekend:
            warnings.append("Market closed. Orders will execute Monday at open.")

        if is_market_hours and time_decimal >= 15.5:
            warnings.append("Last 30 minutes of trading: Increased volatility common.")

        return {
            "session": session,
            "market_open": is_market_hours,
            "local_time_et": now_et.strftime("%H:%M ET %A"),
            "warnings": warnings,
            "liquidity_rating": "HIGH" if is_market_hours else "LOW",
            "trading_advice": "Optimal trading window" if is_market_hours else "Consider waiting for market hours",
        }
    except Exception as e:
        return {"session": "UNKNOWN", "error": str(e)}


def market_context_agent(state: TradeBriefState) -> TradeBriefState:
    symbol = state["symbol"]

    price_data = get_price_and_volume.invoke({"symbol": symbol})
    fear_greed = get_fear_greed_index.invoke({})
    hours_data = get_market_hours_and_context.invoke({"symbol": symbol})

    context_prompt = f"""You are a market context analyst. Analyze the following data for {symbol}:

Price Data: {price_data}
Fear & Greed Index: {fear_greed}
Market Hours: {hours_data}

Provide a concise market context assessment (2-3 sentences). Focus on:
1. Current market sentiment and momentum
2. Trading session risk (hours, liquidity)
3. One key opportunity or warning

Be direct and actionable."""

    response = invoke_llm([
        SystemMessage(content="You are a professional quantitative trading analyst."),
        HumanMessage(content=context_prompt)
    ])

    market_context = {
        "price_data": price_data,
        "fear_greed": fear_greed,
        "hours": hours_data,
        "analysis": response.content,
        "agent": "MarketContextAgent"
    }

    return {
        **state,
        "market_context": market_context,
        "current_agent": "technical_analysis",
        "messages": [AIMessage(content=f"[MarketContext] {response.content}")]
    }


def technical_analysis_agent(state: TradeBriefState) -> TradeBriefState:
    symbol = state["symbol"]
    user_intent = state["user_intent"]

    technicals = get_technical_indicators.invoke({"symbol": symbol})
    price_data = state["market_context"]["price_data"]

    tech_prompt = f"""You are a technical analysis expert. The user wants to {user_intent} {symbol}.

Current Price: ${price_data.get('price', 'N/A')} ({price_data.get('change_pct', 0):+.1f}% today)
Technical Indicators:
- RSI: {technicals.get('rsi', 'N/A')} ({technicals.get('rsi_signal', 'N/A')})
- MACD Histogram: {technicals.get('macd_histogram', 'N/A')} (Bullish crossover: {technicals.get('macd_bullish_crossover', False)})
- Bollinger Band Position: {technicals.get('bb_position', 'N/A')} ({technicals.get('bb_signal', 'N/A')})
- Trend vs 50-day SMA: {technicals.get('trend_vs_sma50_pct', 'N/A'):+.1f}% ({technicals.get('trend', 'N/A')})
- Support: ${technicals.get('support', 'N/A')} ({technicals.get('pct_from_support', 0):+.1f}% away)
- Resistance: ${technicals.get('resistance', 'N/A')} ({technicals.get('pct_from_resistance', 0):+.1f}% away)

Given the user's intent to {user_intent}, provide:
1. Technical setup quality (STRONG/MODERATE/WEAK)
2. Key technical confirmation or warning signal
3. Ideal entry zone or caution level (1 sentence)

Be specific with numbers."""

    response = invoke_llm([
        SystemMessage(content="You are a professional quantitative trading analyst."),
        HumanMessage(content=tech_prompt)
    ])

    score = 0
    rsi = technicals.get('rsi', 50)
    if user_intent == "BUY":
        if 40 <= rsi <= 60: score += 2
        elif rsi < 30: score += 3  
        elif rsi > 70: score -= 2  
        if technicals.get('macd_bullish_crossover'): score += 2
        if technicals.get('trend') == 'uptrend': score += 1
    elif user_intent == "SELL":
        if rsi > 70: score += 2
        if not technicals.get('macd_bullish_crossover'): score += 1
        if technicals.get('trend') == 'downtrend': score += 2

    technical_analysis = {
        "indicators": technicals,
        "analysis": response.content,
        "technical_score": score,
        "agent": "TechnicalAnalysisAgent"
    }

    return {
        **state,
        "technical_analysis": technical_analysis,
        "current_agent": "sentiment",
        "messages": [AIMessage(content=f"[Technicals] {response.content}")]
    }


def sentiment_agent(state: TradeBriefState) -> TradeBriefState:
    symbol = state["symbol"]
    user_intent = state["user_intent"]

    mc = state["market_context"]
    ta = state["technical_analysis"]

    fear_greed = mc["fear_greed"]
    price_data = mc["price_data"]
    technicals = ta["indicators"]

    fg_value = fear_greed.get("value", 50)
    daily_change = price_data.get("change_pct", 0)
    trend = technicals.get("trend", "sideways")

    sentiment_score = 0
    if fg_value <= 25:
        sentiment_score += 2
    elif fg_value >= 75:
        sentiment_score -= 2

    if daily_change >= 2:
        sentiment_score += 1
    elif daily_change <= -2:
        sentiment_score -= 1

    if trend == "uptrend":
        sentiment_score += 1
    elif trend == "downtrend":
        sentiment_score -= 1

    sentiment_prompt = f"""You are a market sentiment analyst.

Assess sentiment for {symbol} with user intent {user_intent}.

Inputs:
- Fear & Greed: {fg_value} ({fear_greed.get('label', 'NEUTRAL')})
- Daily price change: {daily_change:+.2f}%
- Technical trend: {trend}
- Rule-based sentiment score: {sentiment_score} (range approx -4 to +4)

Provide 2-3 sentences covering:
1. Overall sentiment direction (bullish / neutral / bearish)
2. Whether sentiment supports or conflicts with the user's intent
3. One sentiment-driven risk or opportunity"""

    response = invoke_llm([
        SystemMessage(content="You are a professional quantitative trading analyst."),
        HumanMessage(content=sentiment_prompt)
    ])

    sentiment_analysis = {
        "fear_greed": fear_greed,
        "daily_change_pct": daily_change,
        "trend": trend,
        "sentiment_score": sentiment_score,
        "analysis": response.content,
        "agent": "SentimentAgent"
    }

    return {
        **state,
        "sentiment_analysis": sentiment_analysis,
        "current_agent": "risk_assessment",
        "messages": [AIMessage(content=f"[Sentiment] {response.content}")]
    }


def risk_assessment_agent(state: TradeBriefState) -> TradeBriefState:
    symbol = state["symbol"]
    user_intent = state["user_intent"]

    volatility = get_volatility_metrics.invoke({"symbol": symbol})
    price = state["market_context"]["price_data"].get("price", 0)
    tech = state["technical_analysis"]["indicators"]
    sentiment = state["sentiment_analysis"]

    risk_prompt = f"""You are a risk management specialist. Analyze the risk for {user_intent}ing {symbol} at ${price}.

Volatility Metrics:
- 30-day Historical Volatility: {volatility.get('historical_volatility_30d_pct', 'N/A')}% annualized
- ATR (Average True Range): ${volatility.get('atr', 'N/A')} ({volatility.get('atr_pct_of_price', 'N/A')}% of price)
- Max Drawdown (30d): {volatility.get('max_drawdown_30d_pct', 'N/A')}%
- Risk Level: {volatility.get('risk_level', 'N/A')}

Position Sizing (1% risk rule on $10k portfolio):
- Suggested shares: {volatility.get('suggested_shares_per_10k', 'N/A')}
- Position value: ${volatility.get('suggested_position_value', 'N/A')}
- Suggested stop-loss distance: ${volatility.get('stop_loss_distance', 'N/A')}

Technical context:
- Distance from support: {tech.get('pct_from_support', 0):+.1f}%
- Distance from resistance: {tech.get('pct_from_resistance', 0):+.1f}%

Sentiment context:
- Sentiment summary: {sentiment.get('analysis', 'N/A')}
- Sentiment score: {sentiment.get('sentiment_score', 0)}

Provide a 2-3 sentence risk assessment covering:
1. Risk/reward assessment for this trade
2. Specific stop-loss recommendation
3. Maximum position size warning (if any)"""

    response = invoke_llm([
        SystemMessage(content="You are a professional quantitative trading analyst."),
        HumanMessage(content=risk_prompt)
    ])

    risk_score = 10
    hv = volatility.get('historical_volatility_30d_pct', 30)
    if hv > 50: risk_score -= 4
    elif hv > 30: risk_score -= 2
    if abs(volatility.get('max_drawdown_30d_pct', 0)) > 15: risk_score -= 2

    risk_assessment = {
        "volatility": volatility,
        "analysis": response.content,
        "risk_score": max(0, risk_score),
        "risk_level": volatility.get('risk_level', 'MEDIUM'),
        "agent": "RiskAssessmentAgent"
    }

    return {
        **state,
        "risk_assessment": risk_assessment,
        "current_agent": "synthesis",
        "messages": [AIMessage(content=f"[Risk] {response.content}")]
    }


def synthesis_agent(state: TradeBriefState) -> TradeBriefState:
    symbol = state["symbol"]
    user_intent = state["user_intent"]

    mc = state["market_context"]
    ta = state["technical_analysis"]
    sa = state["sentiment_analysis"]
    ra = state["risk_assessment"]

    synthesis_prompt = f"""
You are the chief trading strategist.

Return STRICTLY in this format:

VERDICT: <STRONG BUY / CAUTIOUS BUY / WAIT / AVOID>
CONFIDENCE: <number>%

WHY:
- bullet point
- bullet point

ACTION PLAN:
Entry: <price>
Stop Loss: <price>
Target: <price>
Position Size: <percent>

WATCH OUT FOR:
- risk
- risk

Now analyze:

Symbol: {symbol}
User Intent: {user_intent}

=== MARKET CONTEXT ===
{mc['analysis']}

=== TECHNICAL ===
{ta['analysis']}

=== SENTIMENT ===
{sa['analysis']}

=== RISK ===
{ra['analysis']}

Keep it concise and actionable."""

    response = invoke_llm([
        SystemMessage(content="You are a professional quantitative trading analyst."),
        HumanMessage(content=synthesis_prompt)
    ])

    confidence_match = re.search(r'CONFIDENCE:\s*(\d{1,3})%', response.content, re.IGNORECASE)
    confidence = int(confidence_match.group(1)) if confidence_match else 65

    verdict = "WAIT"
    content_upper = response.content.upper()
    if f"STRONG {user_intent}" in content_upper:
        verdict = f"STRONG {user_intent}"
    elif f"CAUTIOUS {user_intent}" in content_upper:
        verdict = f"CAUTIOUS {user_intent}"
    elif "AVOID" in content_upper:
        verdict = "AVOID"
    elif user_intent in content_upper and "WAIT" not in content_upper[:50]:
        verdict = user_intent

    trade_brief = {
        "symbol": symbol,
        "user_intent": user_intent,
        "verdict": verdict,
        "confidence": confidence,
        "brief": response.content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agents_used": ["MarketContextAgent", "TechnicalAnalysisAgent", "SentimentAgent", "RiskAssessmentAgent", "SynthesisAgent"],
        "supporting_data": {
            "price": mc["price_data"].get("price"),
            "rsi": ta["indicators"].get("rsi"),
            "fear_greed": mc["fear_greed"].get("value"),
            "sentiment_score": sa.get("sentiment_score"),
            "volatility": ra["volatility"].get("historical_volatility_30d_pct"),
            "risk_level": ra["risk_level"],
            "technical_score": ta["technical_score"],
        }
    }

    return {
        **state,
        "trade_brief": trade_brief,
        "current_agent": "done",
        "messages": [AIMessage(content=f"[TradeBrief] {response.content}")]
    }

def build_trade_intelligence_graph():
    graph = StateGraph(TradeBriefState)

    graph.add_node("market_context", market_context_agent)
    graph.add_node("technical_analysis", technical_analysis_agent)
    graph.add_node("sentiment", sentiment_agent)
    graph.add_node("risk_assessment", risk_assessment_agent)
    graph.add_node("synthesis", synthesis_agent)

    graph.set_entry_point("market_context")
    graph.add_edge("market_context", "technical_analysis")
    graph.add_edge("technical_analysis", "sentiment")
    graph.add_edge("sentiment", "risk_assessment")
    graph.add_edge("risk_assessment", "synthesis")
    graph.add_edge("synthesis", END)

    return graph.compile()

_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_trade_intelligence_graph()
    return _graph


async def run_trade_intelligence(symbol: str, intent: str = "EVALUATE") -> dict:
    intent = intent.upper()
    if intent not in ["BUY", "SELL", "EVALUATE"]:
        intent = "EVALUATE"

    initial_state: TradeBriefState = {
        "symbol": symbol.upper(),
        "user_intent": intent,
        "messages": [HumanMessage(content=f"Analyze {symbol} for {intent}")],
        "market_context": None,
        "technical_analysis": None,
        "sentiment_analysis": None,
        "risk_assessment": None,
        "trade_brief": None,
        "current_agent": "market_context",
        "errors": [],
    }

    graph = get_graph()
    
    import asyncio
    final_state = await asyncio.to_thread(graph.invoke, initial_state)
    
    return final_state.get("trade_brief", {"error": "Pipeline failed"})