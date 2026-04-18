import { useEffect, useState } from 'react'
import { C, FONTS, RADIUS, Card, CardHeader, Spinner } from './theme'

const CATEGORIES = {
  Momentum:   ['rsi', 'rsi_signal', 'rsi_diverge', 'stoch_k', 'stoch_d', 'stoch_rsi'],
  Trend:      ['sma_ratio', 'price_vs_ema', 'macd_hist'],
  Volatility: ['bb_width', 'bb_position', 'atr_ratio', 'volatility'],
  Volume:     ['obv_ratio', 'volume_ratio', 'volume_trend'],
  Returns:    ['returns', 'returns_3', 'returns_5', 'returns_10', 'returns_20'],
}

const CAT_COLOR = {
  Momentum:   C.blue,
  Trend:      C.green,
  Volatility: C.red,
  Volume:     C.amber,
  Returns:    '#8B5CF6',
  Other:      C.text2,
}

const getCat  = f => Object.entries(CATEGORIES).find(([, v]) => v.includes(f))?.[0] || 'Other'
const getColor = f => CAT_COLOR[getCat(f)]

export default function FeatureChart({ symbol }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    if (!symbol) return
    setLoading(true); setError(null)
    fetch(`/api/prediction/${symbol}/features`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => setData(d.feature_importance))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) return <Card><Spinner label="Loading model data…" /></Card>
  if (error)   return <Card style={{ padding: 20 }}><div style={{ color: C.red, fontSize: 13 }}>⚠ {error}</div></Card>
  if (!data || !Object.keys(data).length) return null

  const entries = Object.entries(data)
  const max     = entries[0]?.[1] || 1
  const total   = entries.reduce((s, [, v]) => s + v, 0)

  return (
    <Card>
      <CardHeader
        title={`ML Model — Feature Importance · ${symbol}`}
        right={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(CAT_COLOR).filter(([k]) => k !== 'Other').map(([cat, color]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 11, color: C.text2, fontWeight: 500 }}>{cat}</span>
              </div>
            ))}
          </div>
        }
      />

      <div style={{ padding: 20 }}>
        {/* Top 3 spotlight */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {entries.slice(0, 3).map(([feat, imp], i) => {
            const color = getColor(feat)
            const cat   = getCat(feat)
            return (
              <div key={feat} style={{
                background: `${color}08`,
                border: `1.5px solid ${color}25`,
                borderRadius: RADIUS.lg, padding: '14px 16px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.7 }} />
                <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                  #{i + 1} · {cat}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 8, lineHeight: 1.3 }}>
                  {feat.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
                  {(imp * 100).toFixed(1)}%
                </div>
              </div>
            )
          })}
        </div>

        {/* Bar list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(([feat, imp], i) => {
            const pct   = (imp / max) * 100
            const color = getColor(feat)
            const isH   = hovered === i
            return (
              <div
                key={feat}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: hovered !== null && !isH ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                  padding: '3px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 130, flexShrink: 0, justifyContent: 'flex-end' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: isH ? color : C.text2, fontWeight: isH ? 600 : 400, transition: 'color 0.15s', textAlign: 'right', lineHeight: 1.2 }}>
                    {feat.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ flex: 1, height: 8, background: C.inputBg, borderRadius: RADIUS.full, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: color, borderRadius: RADIUS.full,
                    transition: 'width 0.6s ease',
                    boxShadow: isH ? `0 0 6px ${color}60` : 'none',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: isH ? color : C.text3, fontFamily: FONTS.mono, width: 38, textAlign: 'right', flexShrink: 0, transition: 'color 0.15s' }}>
                  {(imp * 100).toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>

        {/* Category totals */}
        <div style={{ marginTop: 24, padding: '16px', background: C.inputBg, borderRadius: RADIUS.lg, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text1, marginBottom: 12 }}>Category Breakdown</div>
          <div style={{ display: 'flex', height: 8, borderRadius: RADIUS.full, overflow: 'hidden', gap: 1, marginBottom: 10 }}>
            {Object.entries(CATEGORIES).map(([cat, keys]) => {
              const catTotal = entries.filter(([f]) => keys.includes(f)).reduce((s, [, v]) => s + v, 0)
              const pct      = total > 0 ? (catTotal / total) * 100 : 0
              const color    = CAT_COLOR[cat]
              return <div key={cat} style={{ flex: pct, background: color, minWidth: pct > 0 ? 2 : 0, transition: 'flex 0.5s' }} />
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(CATEGORIES).map(([cat, keys]) => {
              const catTotal = entries.filter(([f]) => keys.includes(f)).reduce((s, [, v]) => s + v, 0)
              const pct      = total > 0 ? (catTotal / total) * 100 : 0
              const color    = CAT_COLOR[cat]
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 11, color: C.text2 }}>{cat}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}