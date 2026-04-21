import logging
import io
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api.routes import market, prediction, news
from api.routes.backtest      import router as backtest_router
from api.routes.ws            import router as ws_router
from api.routes.paper         import router as paper_router
from api.routes.auth          import router as auth_router
from api.routes.market        import router as market_router_v2
from api.routes.cache_admin   import router as cache_router
from api.routes.kafka_admin   import router as kafka_router

from agents.prediction_agent  import PredictionAgent
from agents.research_agent    import ResearchAgent
from agents.decision_agent    import decide_action
from agents.data_agent        import DataAgent

from db.database              import init_db, save_prediction, save_price, get_decision_history, get_action_summary
from db.auth_models           import init_auth_tables
from core.markets             import market_utils, EXCHANGES
from core.ws.scheduler        import start_scheduler, stop_scheduler
from core.ws.paper_scheduler  import start_paper_scheduler, stop_paper_scheduler
from core.cache               import cache, TTL_OHLCV, TTL_DECISION
from core.kafka_producer      import kafka
from core.kafka_consumer      import kafka_consumer

from services.auth_service    import get_current_user
from db.auth_models           import User
from api.routes.trade_intelligence import router as trade_intelligence_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_auth_tables()
    start_scheduler()
    start_paper_scheduler()
    kafka_consumer.start()       

    try:
        logger.info(f"[Cache]  mode={cache._mode}  ping={cache.ping()}")
        logger.info(f"[Kafka]  enabled={kafka.is_enabled}  status={kafka.status()}")
    except Exception:
        pass

    yield

    stop_scheduler()
    stop_paper_scheduler()
    kafka_consumer.stop()
    kafka.flush(timeout=5)
    kafka.close()


app = FastAPI(title="Quant AI System", version="8.0.0", lifespan=lifespan)

prediction_agent = PredictionAgent()
research_agent   = ResearchAgent()
data_agent       = DataAgent()

app.include_router(market.router,          prefix="/market")
app.include_router(market_router_v2,       prefix="/market")
app.include_router(prediction.router,      prefix="/prediction")
app.include_router(news.router,            prefix="/news")
app.include_router(backtest_router,        prefix="/backtest")
app.include_router(ws_router,              prefix="/ws")
app.include_router(paper_router,           prefix="/paper")
app.include_router(auth_router,            prefix="/auth")
app.include_router(cache_router,           prefix="/cache")
app.include_router(kafka_router,           prefix="/kafka")
app.include_router(trade_intelligence_router, prefix="/trade-intelligence")
app.include_router(trade_intelligence_router, prefix="/api/trade-intelligence")

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:5173", "http://localhost:3000"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


@app.get("/")
def root():
    return {
        "message":     "Quant AI System v8",
        "cache_mode":  cache._mode,
        "cache_ok":    cache.ping(),
        "kafka_ok":    kafka.is_enabled,
    }

@app.get("/ohlcv/{symbol}")
def get_ohlcv(symbol: str, period: str = Query("6mo")):
    sym    = symbol.upper()
    cached = cache.get_ohlcv(sym, period)
    if cached:
        cached["_cached"] = True
        return cached

    df = data_agent.get_historical_data(sym, period=period)
    if df.empty:
        return {"symbol": sym, "candles": [], "period": period}

    df       = df.reset_index()
    date_col = "Date" if "Date" in df.columns else df.columns[0]
    candles  = []
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

    result = {"symbol": sym, "candles": candles, "period": period}
    cache.cache_ohlcv(sym, period, result)
    return result

def _compute_decision_payload(symbol: str, current_user: User):
    sym    = symbol.upper()
    cached = cache.get_decision(sym)
    if cached:
        cached["_cached"] = True
        cached["user"]    = current_user.email
        return cached

    ml_prediction = "DOWN"; ml_confidence = 0.5
    sentiment_label = "NEUTRAL"; sentiment_confidence = 0.0
    fear_greed = {"value": 50, "label": "NEUTRAL"}

    try:
        prediction_agent.train(sym)
        pred, ml_confidence = prediction_agent.predict(sym)
        ml_prediction = "UP" if pred == 1 else "DOWN"
    except Exception as e:
        logger.warning(f"ML pipeline failed {sym}: {e}")

    try:
        articles = research_agent.fetch_news(sym)
        sentiment_label, sentiment_confidence = research_agent.analyze_sentiment(articles)
    except Exception as e:
        logger.warning(f"Sentiment pipeline failed {sym}: {e}")

    try:
        fg = cache.get_fear_greed()
        if fg:
            fear_greed = fg
        else:
            fear_greed = data_agent.get_fear_greed()
            cache.cache_fear_greed(fear_greed)
    except Exception as e:
        logger.warning(f"Fear/Greed failed {sym}: {e}")

    decision = decide_action(ml_prediction, ml_confidence, sentiment_label, sentiment_confidence, fear_greed)

    price = None
    try:
        price = data_agent.get_current_price(sym)
        if price is not None:
            save_price(sym, price)
    except Exception as e:
        logger.warning(f"Price fetch failed {sym}: {e}")

    try:
        save_prediction(
            symbol=sym, ml_prediction=ml_prediction,
            ml_confidence=round(ml_confidence, 4),
            sentiment=sentiment_label,
            sent_confidence=round(sentiment_confidence, 4),
            action=decision["action"], reason=decision["reason"],
            user_id=current_user.id,
        )
    except Exception as e:
        logger.warning(f"Persistence failed {sym}: {e}")

    kafka.publish_decision(
        symbol=sym, action=decision["action"],
        score=decision.get("score", 0), strength=decision.get("strength", "weak"),
        reason=decision["reason"], ml_prediction=ml_prediction,
        ml_confidence=ml_confidence, sentiment=sentiment_label,
        sent_confidence=sentiment_confidence, fear_greed=fear_greed,
        user_email=current_user.email,
    )

    payload = {
        "symbol": sym, "price": price,
        "ml_prediction": ml_prediction, "ml_confidence": round(ml_confidence, 4),
        "sentiment": sentiment_label, "sentiment_confidence": round(sentiment_confidence, 4),
        "fear_greed": fear_greed, "decision": decision,
    }
    cache.cache_decision(sym, payload)
    return {**payload, "user": current_user.email}


def _resolve_pdf_logo_path():
    try:
        p = Path(__file__).resolve().parents[1] / "frontend" / "src" / "assets" / "candleStick.png"
        return str(p) if p.exists() else None
    except Exception:
        return None


def _build_decision_pdf_report(payload: dict, user_email: str) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except Exception as exc:
        raise HTTPException(status_code=503, detail="ReportLab not installed.") from exc

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=18*mm, bottomMargin=18*mm)
    st  = getSampleStyleSheet()
    ts  = ParagraphStyle("T", parent=st["Title"],    fontName="Helvetica-Bold", fontSize=20, textColor=colors.HexColor("#111827"), spaceAfter=4)
    ss  = ParagraphStyle("S", parent=st["BodyText"], fontName="Helvetica",      fontSize=10, textColor=colors.HexColor("#6B7280"), spaceAfter=10)
    hs  = ParagraphStyle("H", parent=st["Heading2"], fontName="Helvetica-Bold", fontSize=12, textColor=colors.HexColor("#111827"), spaceBefore=10, spaceAfter=6)
    bs  = ParagraphStyle("B", parent=st["BodyText"], fontName="Helvetica",      fontSize=10, textColor=colors.HexColor("#1F2937"), leading=14)
    xs  = ParagraphStyle("X", parent=st["BodyText"], fontName="Helvetica",      fontSize=8,  textColor=colors.HexColor("#6B7280"), leading=11)
    brs = ParagraphStyle("R", parent=st["BodyText"], fontName="Helvetica-Bold", fontSize=16, textColor=colors.HexColor("#111827"))
    bss = ParagraphStyle("RS",parent=st["BodyText"], fontName="Helvetica",      fontSize=9,  textColor=colors.HexColor("#6B7280"), spaceAfter=8)

    decision = payload.get("decision") or {}
    fg       = payload.get("fear_greed") or {}
    logo_el  = ""
    lp = _resolve_pdf_logo_path()
    if lp:
        try: logo_el = Image(lp, width=17*mm, height=17*mm)
        except Exception: pass

    bt = Table([[logo_el, Paragraph("Quant AI", brs)]], colWidths=[20*mm, 142*mm])
    bt.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))

    rows = [
        ["Symbol", payload.get("symbol","-")], ["Action", decision.get("action","HOLD")],
        ["Score",  str(decision.get("score","-"))], ["Strength", decision.get("strength","-")],
        ["Price",  "-" if payload.get("price") is None else f"{payload['price']:.2f}"],
        ["ML Prediction", payload.get("ml_prediction","-")],
        ["ML Confidence", f"{round((payload.get('ml_confidence') or 0)*100)}%"],
        ["Sentiment", payload.get("sentiment","-")],
        ["Sent. Confidence", f"{round((payload.get('sentiment_confidence') or 0)*100)}%"],
        ["Fear/Greed", "-" if fg.get("value") is None else f"{fg.get('value')} ({fg.get('label','-')})"],
        ["Generated", datetime.now(timezone.utc).isoformat()], ["Requested By", user_email],
    ]
    st_tbl = Table(rows, colWidths=[48*mm, 114*mm])
    st_tbl.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),colors.whitesmoke), ("BACKGROUND",(0,0),(0,-1),colors.HexColor("#EEF2FF")),
        ("TEXTCOLOR",(0,0),(-1,-1),colors.HexColor("#111827")), ("FONTNAME",(0,0),(-1,-1),"Helvetica"),
        ("FONTNAME",(0,0),(0,-1),"Helvetica-Bold"), ("FONTSIZE",(0,0),(-1,-1),9),
        ("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#D1D5DB")), ("VALIGN",(0,0),(-1,-1),"TOP"),
        ("LEFTPADDING",(0,0),(-1,-1),8), ("RIGHTPADDING",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),6), ("BOTTOMPADDING",(0,0),(-1,-1),6),
    ]))

    doc.build([bt, Paragraph("AI Trading Intelligence Platform", bss), Paragraph("Decision Engine Report", ts),
               Paragraph("Buy / Hold / Sell signal summary", ss), st_tbl, Spacer(1,8),
               Paragraph("Decision Rationale", hs), Paragraph(decision.get("reason","No reason."), bs),
               Spacer(1,8), Paragraph("Disclaimer", hs),
               Paragraph("Not financial advice. For educational purposes only.", xs)])
    pdf = buf.getvalue(); buf.close(); return pdf


@app.get("/decision/{symbol}")
def get_decision(symbol: str, current_user: User = Depends(get_current_user)):
    return _compute_decision_payload(symbol, current_user)


@app.get("/decision/{symbol}/report")
def get_decision_report(symbol: str, current_user: User = Depends(get_current_user)):
    payload   = _compute_decision_payload(symbol, current_user)
    pdf_bytes = _build_decision_pdf_report(payload, current_user.email)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{symbol.upper()}_decision_report.pdf"'})


@app.get("/history/{symbol}")
def get_history(symbol: str, limit: int = 50, current_user: User = Depends(get_current_user)):
    return {
        "symbol": symbol.upper(),
        "history": get_decision_history(symbol, user_id=current_user.id, limit=limit),
    }


@app.get("/history/{symbol}/summary")
def get_summary(symbol: str, current_user: User = Depends(get_current_user)):
    return {
        "symbol": symbol.upper(),
        "summary": get_action_summary(symbol, user_id=current_user.id),
    }


@app.get("/markets")
def get_all_markets():
    return {"exchanges": market_utils.all_exchange_status()}