def decide_action(
    ml_prediction: str,
    ml_confidence: float,
    sentiment: str,
    sentiment_confidence: float,
    fear_greed: dict | None = None,
) -> dict:
    score    = 0
    reasons  = []
    strength = "weak"

    if ml_prediction == "UP":
        if ml_confidence >= 0.65:
            score += 3; reasons.append(f"strong ML↑ ({ml_confidence:.0%})")
        elif ml_confidence >= 0.55:
            score += 2; reasons.append(f"moderate ML↑ ({ml_confidence:.0%})")
        else:
            score += 1; reasons.append(f"weak ML↑ ({ml_confidence:.0%})")
    else:
        if ml_confidence >= 0.65:
            score -= 3; reasons.append(f"strong ML↓ ({ml_confidence:.0%})")
        elif ml_confidence >= 0.55:
            score -= 2; reasons.append(f"moderate ML↓ ({ml_confidence:.0%})")
        else:
            score -= 1; reasons.append(f"weak ML↓ ({ml_confidence:.0%})")

    if sentiment == "POSITIVE" and sentiment_confidence > 0.15:
        pts = 2 if sentiment_confidence > 0.4 else 1
        score += pts
        reasons.append(f"positive news ({sentiment_confidence:.0%})")
    elif sentiment == "NEGATIVE" and sentiment_confidence > 0.15:
        pts = 2 if sentiment_confidence > 0.4 else 1
        score -= pts
        reasons.append(f"negative news ({sentiment_confidence:.0%})")
    else:
        reasons.append("neutral news")

    if fear_greed:
        fg_val = fear_greed.get("value", 50)
        if fg_val >= 75:
            score -= 1; reasons.append(f"extreme greed ({fg_val}) — caution")
        elif fg_val >= 60:
            score += 1; reasons.append(f"greed ({fg_val})")
        elif fg_val <= 25:
            score += 1; reasons.append(f"extreme fear ({fg_val}) — contrarian buy")
        elif fg_val <= 40:
            score -= 1; reasons.append(f"fear ({fg_val})")

    if score >= 5:
        action   = "BUY"
        strength = "strong"
    elif score >= 3:
        action   = "BUY"
        strength = "moderate"
    elif score <= -5:
        action   = "SELL"
        strength = "strong"
    elif score <= -3:
        action   = "SELL"
        strength = "moderate"
    else:
        action   = "HOLD"
        strength = "weak"

    return {
        "action":   action,
        "strength": strength,
        "score":    score,
        "reason":   " | ".join(reasons),
        "signals": {
            "ml":         {"prediction": ml_prediction, "confidence": round(ml_confidence, 4)},
            "sentiment":  {"label": sentiment, "confidence": round(sentiment_confidence, 4)},
            "fear_greed": fear_greed or {},
        },
    }