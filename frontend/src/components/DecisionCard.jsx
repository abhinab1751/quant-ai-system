import { useEffect, useState } from 'react'
import { getDecision } from '../api/client'

const ACTION_STYLE = {
  BUY:  { bg: '#0d3d26', border: '#1a7a47', text: '#22c55e' },
  SELL: { bg: '#3d0d0d', border: '#7a1a1a', text: '#ef4444' },
  HOLD: { bg: '#1e1e2e', border: '#44445a', text: '#a0a0c0' },
}
const STRENGTH_COLOR = { strong: '#f59e0b', moderate: '#7c6af7', weak: '#555' }

export default function DecisionCard({ symbol, liveDecision }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    getDecision(symbol)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [symbol])

  const display = liveDecision ? {
    decision:             { action: liveDecision.action, reason: liveDecision.reason,
                            strength: liveDecision.strength, score: liveDecision.score,
                            signals: liveDecision.signals },
    ml_prediction:        liveDecision.ml_prediction,
    ml_confidence:        liveDecision.ml_confidence,
    sentiment:            liveDecision.sentiment,
    sentiment_confidence: liveDecision.sent_confidence,
  } : data

  if (loading) return <div style={styles.card}><p style={styles.muted}>Analysing {symbol}…</p></div>
  if (error)   return <div style={styles.card}><p style={{ color:'#ef4444' }}>{error}</p></div>
  if (!display) return null

  const action   = display.decision?.action   || 'HOLD'
  const strength = display.decision?.strength || 'weak'
  const score    = display.decision?.score    ?? 0
  const signals  = display.decision?.signals  || {}
  const s        = ACTION_STYLE[action] || ACTION_STYLE.HOLD

  const fg = signals.fear_greed || {}

  return (
    <div style={{ ...styles.card, background: s.bg, borderColor: s.border }}>

      {/* Header row */}
      <div style={styles.header}>
        <span style={{ ...styles.badge, color: s.text, borderColor: s.text }}>
          {action}
        </span>
        <div style={styles.strengthWrap}>
          <span style={{ ...styles.strengthDot, background: STRENGTH_COLOR[strength] }} />
          <span style={{ color: STRENGTH_COLOR[strength], fontSize: 12 }}>{strength}</span>
          <span style={{ color: '#444', fontSize: 12, marginLeft: 4 }}>
            score {score > 0 ? '+' : ''}{score}
          </span>
        </div>
      </div>

      {/* Reason */}
      <p style={styles.reason}>{display.decision?.reason}</p>

      {/* Confidence bars */}
      <div style={styles.barsRow}>
        <ConfBar label="ML confidence"  value={display.ml_confidence}        color={s.text} />
        <ConfBar label="Sentiment conf" value={display.sentiment_confidence}  color={s.text} />
      </div>

      {/* Signal pills */}
      <div style={styles.pills}>
        <Pill label="ML"        value={display.ml_prediction} />
        <Pill label="Sentiment" value={display.sentiment} />
        {fg.value != null && (
          <Pill label="Fear/Greed" value={`${fg.value} — ${fg.label}`} />
        )}
      </div>
    </div>
  )
}

function ConfBar({ label, value, color }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={styles.label}>{label}</span>
        <span style={{ ...styles.label, color }}>{pct}%</span>
      </div>
      <div style={styles.barBg}>
        <div style={{ ...styles.barFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function Pill({ label, value }) {
  return (
    <span style={styles.pill}>
      <span style={styles.muted}>{label}:</span> {value}
    </span>
  )
}

const styles = {
  card:         { background:'#1e1e2e', border:'1px solid #44445a', borderRadius:12, padding:20 },
  header:       { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  badge:        { fontSize:22, fontWeight:700, border:'1px solid', borderRadius:6, padding:'2px 12px' },
  strengthWrap: { display:'flex', alignItems:'center', gap:6 },
  strengthDot:  { width:8, height:8, borderRadius:'50%' },
  reason:       { color:'#c0c0d8', fontSize:13, marginBottom:14, lineHeight:1.5 },
  barsRow:      { display:'flex', gap:14, marginBottom:12 },
  pills:        { display:'flex', gap:6, flexWrap:'wrap' },
  pill:         { background:'#2a2a3e', borderRadius:6, padding:'4px 10px', fontSize:12, color:'#e0e0f0' },
  barBg:        { background:'#2a2a3e', borderRadius:4, height:6 },
  barFill:      { borderRadius:4, height:6, transition:'width 0.4s ease' },
  label:        { fontSize:11, color:'#888' },
  muted:        { color:'#888', fontSize:12 },
}