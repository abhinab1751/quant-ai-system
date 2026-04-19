import { useState, useId } from 'react'
import { C, FONTS, RADIUS, Card, CardHeader, Spinner } from './theme'

const SVG = {
  green:      '#16A34A',
  red:        '#DC2626',
  amber:      '#D97706',
  border:     '#E2E8F0',    
  text:       '#94A3B8',
  gridLine:   '#E2E8F0',
  baseline:   '#94A3B8',
  darkBorder: '#1E2D45',
  darkText:   '#64748B',
}

async function runBT(symbol, capital, timeoutMs = 90_000) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(
      `/api/backtest/run/${encodeURIComponent(symbol)}?initial_capital=${capital}`,
      { signal: ctrl.signal }
    )
    clearTimeout(timer)
    if (!res.ok) {
      let detail = `HTTP ${res.status}`
      try { const j = await res.json(); detail = j.detail || j.message || detail } catch {}
      throw new Error(detail)
    }
    return res.json()
  } catch (e) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new Error('Backtest timed out after 90 s — try a shorter period or smaller dataset')
    throw e
  }
}

export default function EquityChart({ symbol }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error,   setError]   = useState(null)
  const [capital, setCapital] = useState(10_000)
  const [view,    setView]    = useState('chart')  

  const run = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    setElapsed(0)
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000)
    try {
      const result = await runBT(symbol, capital)
      setData(result)
      setView('chart')
    } catch (e) {
      setError(e.message)
    } finally {
      clearInterval(timer)
      setLoading(false)
    }
  }

  const positiveReturn = (data?.total_return_pct ?? 0) >= 0
  const rc = positiveReturn ? C.green : C.red

  const metrics = data ? [
    {
      label: 'Total Return',
      val:   `${data.total_return_pct >= 0 ? '+' : ''}${Number(data.total_return_pct).toFixed(2)}%`,
      color: rc,
    },
    {
      label: 'Sharpe Ratio',
      val:   Number(data.sharpe_ratio).toFixed(3),
      color: data.sharpe_ratio > 1 ? C.green : data.sharpe_ratio > 0 ? C.amber : C.red,
    },
    {
      label: 'Max Drawdown',
      val:   `${Number(data.max_drawdown_pct).toFixed(2)}%`,
      color: C.red,
    },
    {
      label: 'Win Rate',
      val:   `${Number(data.win_rate_pct).toFixed(1)}%`,
      color: data.win_rate_pct >= 50 ? C.green : C.amber,
    },
    {
      label: 'Total Trades',
      val:   data.total_trades,
      color: C.text1,
    },
    {
      label: 'Final Value',
      val:   `$${Number(data.final_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      color: rc,
    },
  ] : []

  return (
    <Card>
      <CardHeader
        title={`Strategy Backtest — ${symbol}`}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>Capital $</span>
            <input
              type="number"
              value={capital}
              min={1000}
              step={1000}
              onChange={e => setCapital(Math.max(1000, Number(e.target.value)))}
              disabled={loading}
              style={{
                width: 100, background: C.inputBg,
                border: `1.5px solid ${C.border}`,
                borderRadius: RADIUS.md, color: C.text1,
                padding: '5px 10px', fontSize: 12,
                fontFamily: FONTS.mono,
              }}
            />
            <button
              onClick={run}
              disabled={loading}
              style={{
                background:   loading ? C.inputBg : C.blue,
                border:       `1.5px solid ${loading ? C.border : C.blue}`,
                borderRadius: RADIUS.md,
                color:        loading ? C.text2 : '#fff',
                padding:      '7px 18px',
                fontSize:     12,
                fontWeight:   600,
                cursor:       loading ? 'not-allowed' : 'pointer',
                transition:   'all 0.2s',
                fontFamily:   FONTS.sans,
                minWidth:     130,
              }}
            >
              {loading ? `Running… ${elapsed}s` : 'Run Backtest'}
            </button>
          </div>
        }
      />

      <div style={{ padding: 20 }}>

        {/* Loading */}
        {loading && (
          <div>
            <Spinner label={`Simulating strategy… ${elapsed}s elapsed`} />
            <p style={{
              textAlign: 'center', fontSize: 12, color: C.text3,
              marginTop: 4, fontFamily: FONTS.sans,
            }}>
              Training ML model + walk-forward simulation on 2 years of data
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            padding: '14px 16px',
            background: C.redBg,
            border: `1px solid ${C.red}40`,
            borderRadius: RADIUS.md,
            color: C.red,
            fontSize: 13,
            lineHeight: 1.5,
            fontFamily: FONTS.sans,
          }}>
            <strong>Backtest error:</strong> {error}
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <>
            {/* Metric cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 10,
              marginBottom: 20,
            }}>
              {metrics.map(({ label, val, color }) => (
                <div key={label} style={{
                  background:   C.inputBg,
                  border:       `1px solid ${C.border}`,
                  borderRadius: RADIUS.md,
                  padding:      '12px 14px',
                  borderTop:    `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 11, color: C.text2, fontWeight: 600, marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.02em' }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Sub-tab bar */}
            <div style={{
              display: 'flex', gap: 0,
              borderBottom: `1px solid ${C.border}`,
              marginBottom: 16,
            }}>
              {['chart', 'trades'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background:   'none',
                  border:       'none',
                  borderBottom: `2px solid ${view === v ? C.blue : 'transparent'}`,
                  color:        view === v ? C.blue : C.text2,
                  padding:      '8px 18px',
                  fontSize:     12,
                  fontWeight:   view === v ? 700 : 500,
                  cursor:       'pointer',
                  fontFamily:   FONTS.sans,
                  transition:   'all 0.15s',
                }}>
                  {v === 'chart' ? 'Equity Curve' : `Trade Log (${(data.trades || []).length})`}
                </button>
              ))}
            </div>

            {/* Chart */}
            {view === 'chart' && (
              <EquityCurve
                curve={data.equity_curve || []}
                capital={capital}
                trades={data.trades || []}
              />
            )}

            {/* Trade log */}
            {view === 'trades' && (
              <TradeLog trades={data.trades || []} />
            )}
          </>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div style={{
            textAlign: 'center', padding: '52px 0',
            color: C.text3, fontSize: 14, fontFamily: FONTS.sans,
          }}>
            Set a starting capital and click{' '}
            <strong style={{ color: C.blue }}>Run Backtest</strong>{' '}
            to simulate the strategy on {symbol}.
          </div>
        )}

      </div>
    </Card>
  )
}

function EquityCurve({ curve, capital, trades }) {
  const uid = useId().replace(/:/g, '')

  if (!curve || curve.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: C.text3, fontSize: 13 }}>
        Not enough data points to render the equity curve.
      </div>
    )
  }

  const W = 660, H = 200
  const pad = { t: 14, b: 30, l: 72, r: 14 }
  const iw  = W - pad.l - pad.r
  const ih  = H - pad.t - pad.b

  const raw_min = Math.min(...curve)
  const raw_max = Math.max(...curve)
  const spread  = raw_max - raw_min || 1
  const mn = raw_min - spread * 0.05
  const mx = raw_max + spread * 0.05
  const rng = mx - mn

  const xOf  = i  => pad.l + (i / (curve.length - 1)) * iw
  const yOf  = v  => pad.t + ih - ((v - mn) / rng) * ih
  const pts  = curve.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  const bl   = yOf(capital)
  const last = curve[curve.length - 1]
  const lc   = last >= capital ? SVG.green : SVG.red
  const gradId = `ecg-${uid}`

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: pad.t + ih * (1 - f),
    v: mn + rng * f,
  }))

  const buys  = (trades || []).filter(t => t.action === 'BUY').slice(0, 15)
  const sells = (trades || []).filter(t => t.action?.startsWith('SELL')).slice(0, 15)

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lc} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lc} stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Grid lines + Y axis labels */}
        {ticks.map(({ y, v }, i) => (
          <g key={i}>
            <line
              x1={pad.l} x2={W - pad.r} y1={y} y2={y}
              stroke={SVG.gridLine} strokeWidth="0.5" strokeDasharray={i === 0 ? '' : ''}
            />
            <text
              x={pad.l - 6} y={y}
              textAnchor="end" dominantBaseline="middle"
              fill={SVG.text} fontSize={9}
              style={{ fontFamily: FONTS.mono }}
            >
              ${Math.round(v).toLocaleString()}
            </text>
          </g>
        ))}

        {/* Starting capital baseline */}
        {bl >= pad.t && bl <= pad.t + ih && (
          <line
            x1={pad.l} x2={W - pad.r} y1={bl} y2={bl}
            stroke={SVG.baseline} strokeWidth="0.8" strokeDasharray="6,4"
          />
        )}

        {/* Area fill */}
        <polygon
          points={`${pad.l},${pad.t + ih} ${pts} ${xOf(curve.length - 1)},${pad.t + ih}`}
          fill={`url(#${gradId})`}
        />

        {/* Equity line */}
        <polyline
          points={pts}
          fill="none"
          stroke={lc}
          strokeWidth="2"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 3px ${lc}60)` }}
        />

        {/* Buy markers (small upward triangles below the line) */}
        {buys.map((t, i) => {
          const idx = Math.round((i / buys.length) * (curve.length - 1))
          const cx  = xOf(idx)
          const cy  = yOf(curve[idx])
          return (
            <polygon
              key={`b${i}`}
              points={`${cx},${cy + 2} ${cx - 4},${cy + 10} ${cx + 4},${cy + 10}`}
              fill={SVG.green} opacity="0.85"
            />
          )
        })}

        {/* Sell markers (small downward triangles above the line) */}
        {sells.map((t, i) => {
          const idx = Math.round((i / sells.length) * (curve.length - 1))
          const cx  = xOf(idx)
          const cy  = yOf(curve[idx])
          return (
            <polygon
              key={`s${i}`}
              points={`${cx},${cy - 2} ${cx - 4},${cy - 10} ${cx + 4},${cy - 10}`}
              fill={SVG.red} opacity="0.85"
            />
          )
        })}

        {/* End dot */}
        <circle
          cx={xOf(curve.length - 1)}
          cy={yOf(last)}
          r={5}
          fill={lc}
          stroke="#fff"
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 4px ${lc})` }}
        />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Portfolio value', color: lc,       dashed: false },
          { label: 'Start capital',   color: SVG.text,  dashed: true  },
          { label: 'Buy signal',      color: SVG.green, marker: 'buy' },
          { label: 'Sell signal',     color: SVG.red,   marker: 'sell'},
        ].map(({ label, color, dashed, marker }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {marker === 'buy'  && <span style={{ fontSize: 10, color: SVG.green }}>▲</span>}
            {marker === 'sell' && <span style={{ fontSize: 10, color: SVG.red   }}>▼</span>}
            {!marker && (
              <div style={{
                width: 18, height: 2,
                background:  dashed ? 'none'  : color,
                borderTop:   dashed ? `1.5px dashed ${color}` : 'none',
              }} />
            )}
            <span style={{ fontSize: 11, color: C.text2, fontFamily: FONTS.sans }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TradeLog({ trades }) {
  if (!trades.length) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: C.text3, fontSize: 13 }}>
        No trades were executed in this backtest run.
      </div>
    )
  }

  return (
    <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: RADIUS.md, border: `1px solid ${C.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <tr style={{ background: C.inputBg }}>
            {['Date', 'Action', 'Price', 'Shares', 'P&L', 'Confidence', 'Threshold'].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 12px',
                borderBottom: `1px solid ${C.border}`,
                fontSize: 10, fontWeight: 700, color: C.text2,
                background: C.inputBg,
                letterSpacing: '0.04em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const isBuy = t.action?.startsWith('BUY')
            const ac    = isBuy ? C.green : C.red
            const acBg  = isBuy ? C.greenBg : C.redBg
            return (
              <tr
                key={i}
                style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => (e.currentTarget.style.background = C.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '7px 12px', color: C.text2, fontFamily: FONTS.mono, whiteSpace: 'nowrap' }}>
                  {t.date}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: ac,
                    background: acBg, borderRadius: RADIUS.full,
                    padding: '2px 9px',
                  }}>
                    {t.action}
                  </span>
                </td>
                <td style={{ padding: '7px 12px', color: C.text1, fontFamily: FONTS.mono }}>
                  ${Number(t.price).toFixed(2)}
                </td>
                <td style={{ padding: '7px 12px', color: C.text2, fontFamily: FONTS.mono }}>
                  {Number(t.shares ?? 0).toFixed(4)}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  {t.pnl != null ? (
                    <span style={{ fontWeight: 700, color: t.pnl >= 0 ? C.green : C.red }}>
                      {t.pnl >= 0 ? '+' : ''}${Number(t.pnl).toFixed(2)}
                    </span>
                  ) : (
                    <span style={{ color: C.text3 }}>—</span>
                  )}
                </td>
                <td style={{ padding: '7px 12px', color: C.text2, fontFamily: FONTS.mono }}>
                  {t.conf != null ? `${(Number(t.conf) * 100).toFixed(0)}%` : '—'}
                </td>
                <td style={{ padding: '7px 12px', color: C.text3, fontFamily: FONTS.mono }}>
                  {t.threshold != null ? `${(Number(t.threshold) * 100).toFixed(0)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}