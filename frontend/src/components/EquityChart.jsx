import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import { runBacktest, getBacktestHistory } from '../api/client'

export default function EquityChart({ symbol }) {
  const [curve,   setCurve]   = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [trades,  setTrades]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [capital, setCapital] = useState(10000)

  const run = () => {
    setLoading(true)
    setError(null)
    runBacktest(symbol, capital)
      .then(data => {
        setCurve(data.equity_curve.map((v, i) => ({ day: i, value: v })))
        setMetrics(data)
        setTrades(data.trades || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  if (!symbol) return null

  const returnColor = metrics?.total_return_pct >= 0 ? '#22c55e' : '#ef4444'

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>Backtest — {symbol}</span>
        <div style={styles.controls}>
          <label style={styles.label}>Capital $</label>
          <input
            type="number"
            value={capital}
            min={100}
            step={1000}
            onChange={e => setCapital(Number(e.target.value))}
            style={styles.input}
          />
          <button onClick={run} disabled={loading} style={styles.btn}>
            {loading ? 'Running…' : 'Run Backtest'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

      {metrics && (
        <div style={styles.metricsRow}>
          <Metric label="Return"    value={`${metrics.total_return_pct}%`}  color={returnColor} />
          <Metric label="Sharpe"    value={metrics.sharpe_ratio} />
          <Metric label="Drawdown"  value={`${metrics.max_drawdown_pct}%`}  color="#ef4444" />
          <Metric label="Win rate"  value={`${metrics.win_rate_pct}%`} />
          <Metric label="Trades"    value={metrics.total_trades} />
          <Metric label="Final"     value={`$${metrics.final_value?.toLocaleString()}`} color={returnColor} />
        </div>
      )}

      {curve && (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={curve} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#2a2a3e" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 11 }} />
            <YAxis tick={{ fill: '#666', fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#1e1e2e', border: '1px solid #44445a', borderRadius: 8 }}
              labelStyle={{ color: '#888' }}
              formatter={(v) => [`$${v.toLocaleString()}`, 'Portfolio']}
            />
            <ReferenceLine y={capital} stroke="#555" strokeDasharray="4 4" label={{ value: 'Start', fill: '#555', fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7c6af7"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#7c6af7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {trades.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ ...styles.label, marginBottom: 8 }}>Trade log</p>
          <div style={styles.tradeList}>
            {trades.slice(0, 20).map((t, i) => (
              <div key={i} style={styles.tradeRow}>
                <span style={{ color: t.action.startsWith('BUY') ? '#22c55e' : '#ef4444', width: 80 }}>
                  {t.action}
                </span>
                <span style={styles.muted}>{t.date}</span>
                <span style={{ color: '#e0e0f0' }}>${t.price}</span>
                {t.pnl != null && (
                  <span style={{ color: t.pnl >= 0 ? '#22c55e' : '#ef4444' }}>
                    {t.pnl >= 0 ? '+' : ''}{t.pnl?.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color = '#e0e0f0' }) {
  return (
    <div style={styles.metric}>
      <span style={styles.muted}>{label}</span>
      <span style={{ ...styles.metricVal, color }}>{value}</span>
    </div>
  )
}

const styles = {
  card:       { background: '#1e1e2e', border: '1px solid #33334a', borderRadius: 12, padding: 20 },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  title:      { fontSize: 15, fontWeight: 600, color: '#e0e0f0' },
  controls:   { display: 'flex', alignItems: 'center', gap: 8 },
  label:      { fontSize: 12, color: '#666' },
  input:      { background: '#2a2a3e', border: '1px solid #44445a', borderRadius: 6, color: '#e0e0f0', padding: '4px 8px', width: 90, fontSize: 13 },
  btn:        { background: '#7c6af7', border: 'none', borderRadius: 6, color: '#fff', padding: '6px 14px', fontSize: 13, cursor: 'pointer' },
  metricsRow: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 },
  metric:     { display: 'flex', flexDirection: 'column', gap: 2 },
  metricVal:  { fontSize: 16, fontWeight: 600 },
  muted:      { color: '#666', fontSize: 12 },
  tradeList:  { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' },
  tradeRow:   { display: 'flex', gap: 16, fontSize: 12, padding: '4px 0', borderBottom: '1px solid #2a2a3e' },
}