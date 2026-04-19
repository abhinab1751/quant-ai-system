import { useEffect, useState } from 'react'
import { getDecision } from '../api/client'
import { C, FONTS, RADIUS, Card, CardHeader, Badge, Spinner } from './theme'

const ACTION = {
  BUY:  { color: C.green,  bg: C.greenBg, border: C.greenBorder, label: 'Buy Signal'  },
  SELL: { color: C.red,    bg: C.redBg,   border: C.redBorder, label: 'Sell Signal' },
  HOLD: { color: C.amber,  bg: C.amberBg, border: C.amberBorder, label: 'Hold'        },
}

const STRENGTH_COLOR = { strong: C.green, moderate: C.amber, weak: C.text2 }

export default function DecisionCard({ symbol, liveDecision }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true); setError(null)
    getDecision(symbol)
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [symbol])

  const display = liveDecision ? {
    decision: { action: liveDecision.action, reason: liveDecision.reason, strength: liveDecision.strength, score: liveDecision.score, signals: liveDecision.signals },
    ml_prediction: liveDecision.ml_prediction, ml_confidence: liveDecision.ml_confidence,
    sentiment: liveDecision.sentiment, sentiment_confidence: liveDecision.sent_confidence,
  } : data

  if (loading) return <Card><Spinner label={`Analysing ${symbol}…`} /></Card>
  if (error)   return (
    <Card style={{ padding: 20 }}>
      <div style={{ fontSize: 13, color: C.red, background: C.redBg, padding: '10px 14px', borderRadius: RADIUS.md, border: `1px solid ${C.redBorder}` }}>
        ⚠ {error}
      </div>
    </Card>
  )
  if (!display) return null

  const action   = display.decision?.action   || 'HOLD'
  const strength = display.decision?.strength || 'weak'
  const score    = display.decision?.score    ?? 0
  const A        = ACTION[action] || ACTION.HOLD
  const fg       = display.decision?.signals?.fear_greed || {}

  const mlPct   = Math.round((display.ml_confidence || 0) * 100)
  const sentPct = Math.round((display.sentiment_confidence || 0) * 100)

  return (
    <Card>
      <CardHeader
        title="AI Decision Engine"
        right={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge
              value={`${strength.charAt(0).toUpperCase() + strength.slice(1)} Signal`}
              type={action === 'BUY' ? 'positive' : action === 'SELL' ? 'negative' : 'muted'}
            />
            <span style={{ fontSize: 11, color: C.text3, fontFamily: FONTS.mono }}>
              {score > 0 ? '+' : ''}{score}
            </span>
          </div>
        }
      />

      <div style={{ padding: '20px 20px 16px' }}>
        {/* Action banner */}
        <div style={{
          background: A.bg,
          border: `1.5px solid ${A.border}`,
          borderRadius: RADIUS.lg,
          padding: '16px 20px',
          marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          {/* Action icon circle */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: A.color, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px ${A.color}40`,
          }}>
            <span style={{ fontSize: 20, color: '#fff' }}>
              {action === 'BUY' ? '▲' : action === 'SELL' ? '▼' : '⟳'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: A.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {action}
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 3, fontWeight: 500 }}>
              {A.label} · Score {score > 0 ? '+' : ''}{score}
            </div>
          </div>
        </div>

        {/* Reason */}
        <div style={{
          fontSize: 13, color: C.text2, lineHeight: 1.65,
          background: C.inputBg, borderRadius: RADIUS.md,
          padding: '12px 14px', marginBottom: 18,
          borderLeft: `3px solid ${A.color}`,
          fontStyle: 'normal',
        }}>
          {display.decision?.reason || '—'}
        </div>

        {/* Confidence bars */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <ConfBar label="ML Confidence" pct={mlPct} color={C.blue} />
          <ConfBar label="Sentiment" pct={sentPct} color={C.amber} />
        </div>

        {/* Signal chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SignalChip
            label="ML"
            value={display.ml_prediction}
            type={display.ml_prediction === 'UP' ? 'positive' : 'negative'}
          />
          <SignalChip
            label="Sentiment"
            value={display.sentiment}
            type={display.sentiment === 'POSITIVE' ? 'positive' : display.sentiment === 'NEGATIVE' ? 'negative' : 'muted'}
          />
          {fg.value != null && (
            <SignalChip label="Fear/Greed" value={`${fg.value} — ${fg.label}`} type="neutral" />
          )}
        </div>

        {/* Score meter */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>Composite Score</span>
            <span style={{ fontSize: 11, color: C.text2, fontFamily: FONTS.mono }}>
              {score > 0 ? '+' : ''}{score} / 10
            </span>
          </div>
          <div style={{ height: 6, background: C.inputBg, borderRadius: RADIUS.full, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((Math.max(-5, Math.min(5, score)) + 5) / 10) * 100}%`,
              background: action === 'BUY' ? C.green : action === 'SELL' ? C.red : C.amber,
              borderRadius: RADIUS.full,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: C.red }}>Strong Sell</span>
            <span style={{ fontSize: 10, color: C.text3 }}>Neutral</span>
            <span style={{ fontSize: 10, color: C.green }}>Strong Buy</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function ConfBar({ label, pct, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: FONTS.mono }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: C.inputBg, borderRadius: RADIUS.full, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: RADIUS.full, transition: 'width 0.6s ease',
          boxShadow: `0 0 6px ${color}40`,
        }} />
      </div>
    </div>
  )
}

function SignalChip({ label, value, type }) {
  const colors = {
    positive: { bg: C.greenBg, color: C.green, border: C.greenBorder },
    negative: { bg: C.redBg,   color: C.red,   border: C.redBorder },
    neutral:  { bg: C.blueLight, color: C.blue, border: C.blueBorder },
    muted:    { bg: C.inputBg,  color: C.text2, border: C.border  },
  }
  const s = colors[type] || colors.muted
  return (
    <div style={{
      display: 'inline-flex', gap: 4, alignItems: 'center',
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: RADIUS.full, padding: '4px 10px',
    }}>
      <span style={{ fontSize: 10, color: C.text3, fontWeight: 600 }}>{label}:</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{value}</span>
    </div>
  )
}