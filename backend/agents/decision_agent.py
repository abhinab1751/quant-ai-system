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
            score += 3; reasons.append("strong ML↑"); strength = "strong"
        elif ml_confidence >= 0.55:
            score += 2; reasons.append("moderate ML↑")
        else:
            score += 1; reasons.append("weak ML↑")
    else:
        if ml_confidence >= 0.65:
            score -= 3; reasons.append("strong ML↓"); strength = "strong"
        elif ml_confidence >= 0.55:
            score -= 2; reasons.append("moderate ML↓")
        else:
            score -= 1; reasons.append("weak ML↓")

    if sentiment == "POSITIVE" and sentiment_confidence > 0.2:
        pts = 2 if sentiment_confidence > 0.5 else 1
        score += pts; reasons.append(f"positive sentiment ({sentiment_confidence:.0%})")
    elif sentiment == "NEGATIVE" and sentiment_confidence > 0.2:
        pts = 2 if sentiment_confidence > 0.5 else 1
        score -= pts; reasons.append(f"negative sentiment ({sentiment_confidence:.0%})")
    else:
        reasons.append("neutral sentiment")

    fg_label = ""
    if fear_greed:
        fg_val = fear_greed.get("value", 50)
        fg_label = fear_greed.get("label", "")
        if fg_val >= 75:          
            score -= 1; reasons.append(f"extreme greed ({fg_val})")
        elif fg_val >= 55:        
            score += 1; reasons.append(f"greed index ({fg_val})")
        elif fg_val <= 25:        
            score += 1; reasons.append(f"extreme fear — contrarian buy ({fg_val})")
        elif fg_val <= 45:        
            score -= 1; reasons.append(f"fear index ({fg_val})")

    if score >= 4:
        action   = "BUY"
        strength = "strong" if score >= 6 else "moderate"
    elif score <= -4:
        action   = "SELL"
        strength = "strong" if score <= -6 else "moderate"
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