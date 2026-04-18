import { useEffect, useState } from 'react'
import { getHistory, getHistorySummary } from '../api/client'
import { C, FONTS, RADIUS, Card, CardHeader, Spinner } from './theme'

const AC = { BUY: C.green, SELL: C.red, HOLD: C.amber }
const ML = { UP: C.green, DOWN: C.red }
const SC = { POSITIVE: C.green, NEGATIVE: C.red, NEUTRAL: C.amber }

export function HistoryTable({ symbol }) {
  const [rows,    setRows]    = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('ALL')

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    Promise.all([getHistory(symbol, 50), getHistorySummary(symbol)])
      .then(([h, s]) => { setRows(h.history || []); setSummary(s.summary) })
      .catch(console.error).finally(() => setLoading(false))
  }, [symbol])

  const filtered = filter === 'ALL' ? rows : rows.filter(r => r.action === filter)
  const total    = (summary?.BUY ?? 0) + (summary?.SELL ?? 0) + (summary?.HOLD ?? 0)

  if (loading) return <Card><Spinner label="Loading history…" /></Card>

  return (
    <Card>
      <CardHeader
        title={`Decision History — ${symbol}`}
        right={
          <div style={{ display: 'flex', gap: 4 }}>
            {['ALL', 'BUY', 'SELL', 'HOLD'].map(f => {
              const active = filter === f
              const color  = f === 'BUY' ? C.green : f === 'SELL' ? C.red : f === 'HOLD' ? C.amber : C.blue
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: active ? `${color}15` : 'transparent',
                  border: `1.5px solid ${active ? color : C.border}`,
                  borderRadius: RADIUS.md, color: active ? color : C.text2,
                  padding: '4px 12px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: FONTS.sans,
                }}>{f}</button>
              )
            })}
          </div>
        }
      />

      {summary && total > 0 && (
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: C.inputBg }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
            {[['BUY', summary.BUY ?? 0, C.green], ['SELL', summary.SELL ?? 0, C.red], ['HOLD', summary.HOLD ?? 0, C.amber]].map(([l, cnt, color]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color }}>{l}</span>
                <span style={{ fontSize: 12, color: C.text2 }}>{cnt}</span>
                <span style={{ fontSize: 11, color: C.text3 }}>({total > 0 ? Math.round(cnt / total * 100) : 0}%)</span>
              </div>
            ))}
          </div>
          <div style={{ height: 4, borderRadius: RADIUS.full, background: C.border, overflow: 'hidden', display: 'flex', gap: 1 }}>
            {[['BUY', summary.BUY ?? 0, C.green], ['SELL', summary.SELL ?? 0, C.red], ['HOLD', summary.HOLD ?? 0, C.amber]].map(([l, cnt, color]) => (
              <div key={l} style={{ flex: cnt, background: color, minWidth: cnt > 0 ? 3 : 0, transition: 'flex 0.5s' }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.text2, fontSize: 13 }}>
            {rows.length === 0 ? `No decisions yet for ${symbol}` : `No ${filter} decisions found`}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.inputBg }}>
                {['Time', 'Action', 'ML Pred', 'ML Conf', 'Sentiment', 'Sent Conf', 'Reason'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.text2, fontFamily: FONTS.sans, letterSpacing: '0.04em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = C.inputBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: C.text2, fontFamily: FONTS.mono, whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: AC[r.action] || C.text1,
                      background: `${AC[r.action] || C.text2}15`,
                      borderRadius: RADIUS.full, padding: '3px 10px',
                    }}>{r.action}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ML[r.ml_prediction] || C.text1 }}>{r.ml_prediction}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 48, height: 4, background: C.border, borderRadius: RADIUS.full, overflow: 'hidden' }}>
                        <div style={{ width: `${r.ml_confidence * 100}%`, height: '100%', background: ML[r.ml_prediction] || C.blue, borderRadius: RADIUS.full }} />
                      </div>
                      <span style={{ fontSize: 11, color: C.text2, fontFamily: FONTS.mono }}>{(r.ml_confidence * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: SC[r.sentiment] || C.text1 }}>{r.sentiment}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: C.text2, fontFamily: FONTS.mono }}>
                    {(r.sent_confidence * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 16px', maxWidth: 240, fontSize: 12, color: C.text2 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ padding: '8px 20px', borderTop: `1px solid ${C.border}`, background: C.inputBg }}>
        <span style={{ fontSize: 11, color: C.text3 }}>Showing {filtered.length} / {rows.length} records</span>
      </div>
    </Card>
  )
}

export default HistoryTable