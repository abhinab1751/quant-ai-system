import { useState } from 'react'
import { C, FONTS, RADIUS, Card, CardHeader, Spinner } from './theme'

async function runBT(symbol, capital, ms = 90_000) {
  const ctrl = new AbortController()
  const t    = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(`/api/backtest/run/${symbol}?initial_capital=${capital}`, { signal: ctrl.signal })
    clearTimeout(t)
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `HTTP ${r.status}`) }
    return r.json()
  } catch (e) { clearTimeout(t); if (e.name === 'AbortError') throw new Error('Timed out'); throw e }
}

export function EquityChart({ symbol }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error,   setError]   = useState(null)
  const [capital, setCapital] = useState(10_000)
  const [view,    setView]    = useState('chart')

  const run = async () => {
    setLoading(true); setError(null); setData(null); setElapsed(0)
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000)
    try { setData(await runBT(symbol, capital)) } catch (e) { setError(e.message) }
    finally { clearInterval(timer); setLoading(false) }
  }

  const rc = data?.total_return_pct >= 0 ? C.green : C.red

  const metrics = data ? [
    { label: 'Total Return',  val: `${data.total_return_pct}%`,  color: rc },
    { label: 'Sharpe Ratio',  val: data.sharpe_ratio,             color: data.sharpe_ratio > 1 ? C.green : data.sharpe_ratio > 0 ? C.amber : C.red },
    { label: 'Max Drawdown',  val: `${data.max_drawdown_pct}%`,  color: C.red },
    { label: 'Win Rate',      val: `${data.win_rate_pct}%`,      color: data.win_rate_pct >= 50 ? C.green : C.amber },
    { label: 'Total Trades',  val: data.total_trades,             color: C.text1 },
    { label: 'Final Value',   val: `$${Number(data.final_value).toLocaleString()}`, color: rc },
  ] : []

  return (
    <Card>
      <CardHeader
        title={`Strategy Backtest — ${symbol}`}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>Capital</span>
            <input type="number" value={capital} min={100} step={1000} onChange={e => setCapital(+e.target.value)} disabled={loading}
              style={{
                width: 100, background: C.inputBg, border: `1.5px solid ${C.border}`,
                borderRadius: RADIUS.md, color: C.text1, padding: '5px 10px',
                fontSize: 12, fontFamily: FONTS.mono,
              }}
            />
            <button onClick={run} disabled={loading} style={{
              background: loading ? C.inputBg : C.blue,
              border: `1.5px solid ${loading ? C.border : C.blue}`,
              borderRadius: RADIUS.md, color: loading ? C.text2 : '#fff',
              padding: '7px 16px', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : `0 4px 12px ${C.blue}30`,
              transition: 'all 0.2s', fontFamily: FONTS.sans,
            }}>
              {loading ? `Running ${elapsed}s…` : 'Run Backtest'}
            </button>
          </div>
        }
      />

      <div style={{ padding: 20 }}>
        {loading && <Spinner label={`Simulating strategy… ${elapsed}s elapsed`} />}
        {error && (
          <div style={{ padding: '12px 16px', background: C.redBg, border: `1px solid #FECACA`, borderRadius: RADIUS.md, color: C.red, fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {metrics.map(({ label, val, color }) => (
                <div key={label} style={{
                  background: C.inputBg, border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.md, padding: '12px 14px',
                  borderTop: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 11, color: C.text2, fontWeight: 600, marginBottom: 5 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.02em' }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
              {['chart', 'trades'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: 'none', border: 'none',
                  borderBottom: `2px solid ${view === v ? C.blue : 'transparent'}`,
                  color: view === v ? C.blue : C.text2,
                  padding: '8px 16px', fontSize: 12, fontWeight: view === v ? 700 : 500,
                  cursor: 'pointer', fontFamily: FONTS.sans, transition: 'all 0.15s',
                }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
              ))}
            </div>

            {view === 'chart' && data.equity_curve?.length > 0 && (
              <EquitySVG curve={data.equity_curve} capital={capital} trades={data.trades || []} />
            )}
            {view === 'trades' && <TradeLog trades={data.trades || []} />}
          </>
        )}

        {!data && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: C.text3, fontSize: 14 }}>
            Configure capital above and click <strong style={{ color: C.blue }}>Run Backtest</strong> to simulate.
          </div>
        )}
      </div>
    </Card>
  )
}

function EquitySVG({ curve, capital, trades }) {
  const W = 700, H = 180
  const pad = { t: 16, b: 32, l: 72, r: 16 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b
  const mn = Math.min(...curve, capital * 0.9)
  const mx = Math.max(...curve, capital * 1.02)
  const rng = mx - mn || 1
  const xOf = i => pad.l + (i / (curve.length - 1)) * iw
  const yOf = v => pad.t + ih - ((v - mn) / rng) * ih
  const pts  = curve.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')
  const bl   = yOf(capital)
  const lc   = curve[curve.length - 1] >= capital ? C.green : C.red

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="ecg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lc} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={lc} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = pad.t + ih * (1 - f)
          const v = mn + rng * f
          return (
            <g key={f}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke={C.border} strokeWidth="0.5"/>
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fill={C.text3} fontSize={9} fontFamily={FONTS.mono}>
                ${Math.round(v).toLocaleString()}
              </text>
            </g>
          )
        })}
        <line x1={pad.l} x2={W - pad.r} y1={bl} y2={bl} stroke={C.text3} strokeDasharray="5,4"/>
        <polygon points={`${pad.l},${pad.t + ih} ${pts} ${pad.l + iw},${pad.t + ih}`} fill="url(#ecg)"/>
        <polyline points={pts} fill="none" stroke={lc} strokeWidth="2"/>
        <circle cx={xOf(curve.length - 1)} cy={yOf(curve[curve.length - 1])} r={5} fill={lc} stroke="#fff" strokeWidth="2"/>
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {[['Start Capital', C.text2, true], ['Portfolio Value', lc, false]].map(([l, c, d]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 2, background: d ? 'none' : c, borderTop: d ? `2px dashed ${c}` : 'none' }}/>
            <span style={{ fontSize: 11, color: C.text2 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TradeLog({ trades }) {
  if (!trades.length) return <div style={{ color: C.text2, fontSize: 13 }}>No trades recorded.</div>
  return (
    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: C.inputBg }}>
            {['Date', 'Action', 'Price', 'Shares', 'P&L', 'Conf'].map(h => (
              <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.text2, borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const buy = t.action.startsWith('BUY')
            return (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '7px 12px', fontSize: 11, color: C.text2, fontFamily: FONTS.mono }}>{t.date}</td>
                <td style={{ padding: '7px 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: buy ? C.green : C.red, background: buy ? C.greenBg : C.redBg, borderRadius: RADIUS.full, padding: '2px 8px' }}>{t.action}</span>
                </td>
                <td style={{ padding: '7px 12px', fontSize: 12, color: C.text1, fontFamily: FONTS.mono }}>${t.price}</td>
                <td style={{ padding: '7px 12px', fontSize: 11, color: C.text2, fontFamily: FONTS.mono }}>{t.shares?.toFixed(3)}</td>
                <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600, color: t.pnl >= 0 ? C.green : C.red }}>
                  {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl?.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '7px 12px', fontSize: 11, color: C.text2, fontFamily: FONTS.mono }}>
                  {t.conf != null ? `${(t.conf * 100).toFixed(0)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default EquityChart