import logging
import io
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Query, Depends, HTTPException
from fastapi.responses import Response
from contextlib import asynccontextmanager

from api.routes import market, prediction, news
from api.routes.backtest import router as backtest_router
from api.routes.ws       import router as ws_router
from agents.prediction_agent import PredictionAgent
from agents.research_agent   import ResearchAgent
from agents.decision_agent   import decide_action
from db.database import init_db, save_prediction, save_price, get_decision_history, get_action_summary
from core.markets import market_utils, EXCHANGES
from agents.data_agent       import DataAgent
from core.ws.scheduler import start_scheduler, stop_scheduler
from api.routes.paper import router as paper_router                 
from core.ws.paper_scheduler import (                               
    start_paper_scheduler, stop_paper_scheduler                     
) 
from api.routes.market import router as market_router_v2
from api.routes.auth import router as auth_router          
from db.auth_models import init_auth_tables                 
from services.auth_service import get_current_user  
from db.auth_models import User
from fastapi.middleware.cors import CORSMiddleware

from api.routes.trade_intelligence import router as trade_intelligence_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_auth_tables()        
    start_scheduler()
    start_paper_scheduler()
    yield
    stop_scheduler()
    stop_paper_scheduler()


app = FastAPI(title="Quant AI System", version="6.0.0", lifespan=lifespan)

prediction_agent = PredictionAgent()
research_agent   = ResearchAgent()
data_agent       = DataAgent()

app.include_router(market.router,     prefix="/market")
app.include_router(market_router_v2,  prefix="/market")
app.include_router(prediction.router, prefix="/prediction")
app.include_router(news.router,       prefix="/news")
app.include_router(backtest_router,   prefix="/backtest")
app.include_router(ws_router,         prefix="/ws")
app.include_router(paper_router,      prefix="/paper")
app.include_router(auth_router, prefix="/auth")
app.include_router(trade_intelligence_router, prefix="/trade-intelligence")
app.include_router(trade_intelligence_router, prefix="/api/trade-intelligence")

@app.get("/")
def root():
    return {"message": "Quant AI System v6"}


@app.get("/ohlcv/{symbol}")
def get_ohlcv(symbol: str, period: str = Query("6mo")):
    sym = symbol.upper()
    df  = data_agent.get_historical_data(sym, period=period)
    if df.empty:
        return {"symbol": sym, "candles": []}

    df = df.reset_index()
    date_col = "Date" if "Date" in df.columns else df.columns[0]

    candles = []
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

    return {"symbol": sym, "candles": candles}


def _compute_decision_payload(symbol: str, current_user: User):
    sym = symbol.upper()

    ml_prediction = "DOWN"
    ml_confidence = 0.5
    sentiment_label = "NEUTRAL"
    sentiment_confidence = 0.0
    fear_greed = {"value": 50, "label": "NEUTRAL"}

    try:
        prediction_agent.train(sym)
        pred, ml_confidence = prediction_agent.predict(sym)
        ml_prediction = "UP" if pred == 1 else "DOWN"
    except Exception as e:
        logger.warning(f"Decision ML pipeline failed for {sym}: {e}")

    try:
        articles = research_agent.fetch_news(sym)
        sentiment_label, sentiment_confidence = research_agent.analyze_sentiment(articles)
    except Exception as e:
        logger.warning(f"Decision sentiment pipeline failed for {sym}: {e}")

    try:
        fear_greed = data_agent.get_fear_greed()
    except Exception as e:
        logger.warning(f"Fear/Greed fetch failed for {sym}: {e}")

    decision = decide_action(
        ml_prediction, ml_confidence,
        sentiment_label, sentiment_confidence,
        fear_greed,
    )

    price = None
    try:
        price = data_agent.get_current_price(sym)
        if price is not None:
            save_price(sym, price)
    except Exception as e:
        logger.warning(f"Live price fetch/save failed for {sym}: {e}")

    try:
        save_prediction(
            symbol=sym,
            ml_prediction=ml_prediction,
            ml_confidence=round(ml_confidence, 4),
            sentiment=sentiment_label,
            sent_confidence=round(sentiment_confidence, 4),
            action=decision["action"],
            reason=decision["reason"],
        )
    except Exception as e:
        logger.warning(f"Decision persistence failed for {sym}: {e}")

    return {
        "symbol": sym,
        "price": price,
        "ml_prediction": ml_prediction,
        "ml_confidence": round(ml_confidence, 4),
        "sentiment": sentiment_label,
        "sentiment_confidence": round(sentiment_confidence, 4),
        "fear_greed": fear_greed,
        "decision": decision,
        "user": current_user.email,
    }


def _resolve_pdf_logo_path() -> str | None:
    try:
        project_root = Path(__file__).resolve().parents[1]
        logo_path = project_root / "frontend" / "src" / "assets" / "candleStick.png"
        if logo_path.exists():
            return str(logo_path)
    except Exception:
        return None
    return None


def _build_decision_pdf_report(payload: dict, user_email: str) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="PDF report generation is unavailable because ReportLab is not installed in the active backend environment.",
        ) from exc

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DecisionReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#111827"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DecisionReportSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#6B7280"),
        spaceAfter=10,
    )
    section_style = ParagraphStyle(
        "DecisionReportSection",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#111827"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "DecisionReportBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1F2937"),
    )
    small_style = ParagraphStyle(
        "DecisionReportSmall",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#6B7280"),
    )
    brand_style = ParagraphStyle(
        "DecisionReportBrand",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        textColor=colors.HexColor("#111827"),
    )
    brand_subtitle_style = ParagraphStyle(
        "DecisionReportBrandSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#6B7280"),
        spaceAfter=8,
    )

    decision = payload.get("decision") or {}
    fear_greed = payload.get("fear_greed") or {}

    summary_rows = [
        ["Symbol", payload.get("symbol", "-")],
        ["Action", decision.get("action", "HOLD")],
        ["Score", str(decision.get("score", "-"))],
        ["Strength", decision.get("strength", "-" )],
        ["Price", "-" if payload.get("price") is None else f"{payload.get('price'):.2f}"],
        ["ML Prediction", payload.get("ml_prediction", "-")],
        ["ML Confidence", f"{round((payload.get('ml_confidence') or 0) * 100)}%"],
        ["Sentiment", payload.get("sentiment", "-")],
        ["Sentiment Confidence", f"{round((payload.get('sentiment_confidence') or 0) * 100)}%"],
        ["Fear/Greed", "-" if fear_greed.get("value") is None else f"{fear_greed.get('value')} ({fear_greed.get('label', '-')})"],
        ["Generated", datetime.now(timezone.utc).isoformat()],
        ["Requested By", user_email],
    ]

    logo_path = _resolve_pdf_logo_path()
    logo_element = ""
    if logo_path:
        try:
            logo_element = Image(logo_path, width=17 * mm, height=17 * mm)
        except Exception:
            logo_element = ""

    brand_table = Table([[logo_element, Paragraph("Quant AI", brand_style)]], colWidths=[20 * mm, 142 * mm])
    brand_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    elements = [
        brand_table,
        Paragraph("AI Trading Intelligence Platform", brand_subtitle_style),
        Paragraph("Decision Engine Report", title_style),
        Paragraph("Buy / Hold / Sell signal summary", subtitle_style),
    ]

    summary_table = Table(summary_rows, colWidths=[48 * mm, 114 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF2FF")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.extend([summary_table, Spacer(1, 8)])

    elements.append(Paragraph("Decision Rationale", section_style))
    elements.append(Paragraph(decision.get("reason", "No reason provided."), body_style))
    elements.append(Spacer(1, 8))

    elements.append(Paragraph("Disclaimer", section_style))
    elements.append(
        Paragraph(
            "Not financial advice. This report is generated by AI models for educational purposes only. "
            "Always perform your own research and consult a qualified advisor before investing.",
            small_style,
        )
    )

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


@app.get("/decision/{symbol}")
def get_decision(
    symbol: str,
    current_user: User = Depends(get_current_user),  
):
    return _compute_decision_payload(symbol, current_user)


@app.get("/decision/{symbol}/report")
def get_decision_report(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    payload = _compute_decision_payload(symbol, current_user)
    pdf_bytes = _build_decision_pdf_report(payload, current_user.email)
    filename = f"{symbol.upper()}_decision_report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/history/{symbol}")
def get_history(symbol: str, limit: int = 50):
    return {"symbol": symbol.upper(), "history": get_decision_history(symbol, limit=limit)}


@app.get("/history/{symbol}/summary")
def get_summary(symbol: str):
    return {"symbol": symbol.upper(), "summary": get_action_summary(symbol)}

@app.get("/markets")
def get_all_markets():
    return {"exchanges": market_utils.all_exchange_status()}

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:5173", "http://localhost:3000"],  
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)
