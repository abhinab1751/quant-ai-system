import logging
import io
from pathlib import Path
from xml.sax.saxutils import escape
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    REPORTLAB_AVAILABLE = True
except Exception:
    colors = None
    A4 = None
    ParagraphStyle = None
    getSampleStyleSheet = None
    mm = None
    Image = None
    Paragraph = None
    SimpleDocTemplate = None
    Spacer = None
    Table = None
    TableStyle = None
    REPORTLAB_AVAILABLE = False

from agents.trade_intelligence_agent import run_trade_intelligence
from services.auth_service import get_current_user
from db.auth_models import User

logger = logging.getLogger(__name__)
router = APIRouter(tags=["trade-intelligence"])


class TradeIntelligenceRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=15, description="Stock ticker symbol")
    intent: str = Field("EVALUATE", description="BUY | SELL | EVALUATE")


def _format_metric(value):
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def _resolve_pdf_logo_path() -> str | None:
    try:
        project_root = Path(__file__).resolve().parents[3]
        logo_path = project_root / "frontend" / "src" / "assets" / "candleStick.png"
        if logo_path.exists():
            return str(logo_path)
    except Exception:
        return None
    return None


def _build_pdf_report(result: dict, user_email: str) -> bytes:
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PDF report generation is unavailable because ReportLab is not installed in the active backend environment.",
        )

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
        "TradeReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#111827"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "TradeReportSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#6B7280"),
        spaceAfter=10,
    )
    section_style = ParagraphStyle(
        "TradeReportSection",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#111827"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "TradeReportBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1F2937"),
    )
    small_style = ParagraphStyle(
        "TradeReportSmall",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#6B7280"),
    )
    brand_style = ParagraphStyle(
        "TradeReportBrand",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=18,
        textColor=colors.HexColor("#111827"),
    )
    brand_subtitle_style = ParagraphStyle(
        "TradeReportBrandSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#6B7280"),
        spaceAfter=8,
    )

    symbol = result.get("symbol", "-")
    verdict = result.get("verdict", "-")
    confidence = result.get("confidence")
    intent = result.get("user_intent", "EVALUATE")
    timestamp = result.get("timestamp", "-")
    supporting = result.get("supporting_data") or {}
    brief = (result.get("brief") or "").strip()
    agents_used = result.get("agents_used") or []

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
        Paragraph("Trade Intelligence Report", title_style),
        Paragraph(
            f"{escape(symbol)} · {escape(intent)} · Generated for {escape(user_email)}",
            subtitle_style,
        ),
    ]

    summary_rows = [
        ["Symbol", symbol],
        ["Intent", intent],
        ["Verdict", verdict],
        ["Confidence", f"{confidence}%" if confidence is not None else "-"],
        ["Generated", timestamp],
        ["Agents Used", str(len(agents_used))],
    ]

    summary_table = Table(summary_rows, colWidths=[42 * mm, 120 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF2FF")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEADING", (0, 0), (-1, -1), 12),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    elements.extend([summary_table, Spacer(1, 8)])

    metric_rows = []
    metric_labels = [
        ("Price", supporting.get("price")),
        ("RSI", supporting.get("rsi")),
        ("Fear/Greed", supporting.get("fear_greed")),
        ("Sentiment Score", supporting.get("sentiment_score")),
        ("Volatility", supporting.get("volatility")),
        ("Risk Level", supporting.get("risk_level")),
        ("Technical Score", supporting.get("technical_score")),
    ]
    for label, value in metric_labels:
        if value is not None:
            metric_rows.append([label, _format_metric(value)])

    if metric_rows:
        elements.append(Paragraph("Key Signals", section_style))
        metrics_table = Table(metric_rows, colWidths=[48 * mm, 114 * mm])
        metrics_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.extend([metrics_table, Spacer(1, 8)])

    if brief:
        elements.append(Paragraph("Trade Brief", section_style))
        for raw_line in brief.splitlines():
            line = raw_line.strip()
            if not line:
                elements.append(Spacer(1, 3))
                continue
            cleaned = line.replace("**", "").replace("##", "")
            if line.startswith(("-", "•")):
                cleaned = cleaned.lstrip("-• ")
                elements.append(Paragraph(f"&bull; {escape(cleaned)}", body_style))
            else:
                elements.append(Paragraph(escape(cleaned), body_style))
        elements.append(Spacer(1, 8))

    elements.append(Paragraph("Disclaimer", section_style))
    elements.append(
        Paragraph(
            "Not financial advice. This report is generated by AI agents for educational purposes only. "
            "Always do your own research and consult a qualified financial advisor before making investment decisions.",
            small_style,
        )
    )

    def _draw_footer(canvas, _doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
        canvas.line(doc.leftMargin, 12 * mm, A4[0] - doc.rightMargin, 12 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawString(doc.leftMargin, 8 * mm, "Generated by Quant AI System")
        canvas.drawRightString(A4[0] - doc.rightMargin, 8 * mm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(elements, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


async def _run_analysis(symbol: str, intent: str, current_user: User):
    symbol = symbol.upper().strip()
    intent = intent.upper().strip()

    if intent not in ["BUY", "SELL", "EVALUATE"]:
        raise HTTPException(status_code=400, detail="Intent must be BUY, SELL, or EVALUATE")

    logger.info(f"[TradeIntelligence] {current_user.email} -> {intent} {symbol}")

    try:
        result = await run_trade_intelligence(symbol, intent)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Trade intelligence failed for {symbol}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis pipeline failed: {str(e)}"
        )


@router.post("/analyze", summary="Run multi-agent trade intelligence analysis")
async def analyze_trade(
    req: TradeIntelligenceRequest,
    current_user: User = Depends(get_current_user),
):
    return await _run_analysis(req.symbol, req.intent, current_user)


@router.get("/analyze", summary="Run multi-agent trade intelligence analysis (GET)")
async def analyze_trade_get(
    symbol: str = Query(..., min_length=1, max_length=15, description="Stock ticker symbol"),
    intent: str = Query("EVALUATE", description="BUY | SELL | EVALUATE"),
    current_user: User = Depends(get_current_user),
):
    return await _run_analysis(symbol, intent, current_user)


@router.post("/report", summary="Generate a PDF trade report")
async def trade_report(
    req: TradeIntelligenceRequest,
    current_user: User = Depends(get_current_user),
):
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PDF report generation is unavailable because ReportLab is not installed in the active backend environment.",
        )

    result = await _run_analysis(req.symbol, req.intent, current_user)
    pdf_bytes = _build_pdf_report(result, current_user.email)
    symbol = req.symbol.upper().strip()
    intent = req.intent.upper().strip()
    filename = f"{symbol}_{intent}_trade_report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/health", summary="Check if Trade Intelligence service is ready")
async def health_check():
    try:
        from agents.trade_intelligence_agent import get_graph
        get_graph()
        return {"status": "ready", "agents": 5, "framework": "LangGraph"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Agent graph not ready: {e}")