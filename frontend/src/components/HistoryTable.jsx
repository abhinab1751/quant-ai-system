import { useEffect, useState } from 'react'
import { getHistory, getHistorySummary } from '../api/client'

const ACTION_COLOR = { BUY: '#22c55e', SELL: '#ef4444', HOLD: '#a0a0c0' }

export default function HistoryTable({ symbol }) {
  const [rows,    setRows]    = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    Promise.all([getHistory(symbol), getHistorySummary(symbol)])
      .then(([h, s]) => { setRows(h.history); setSummary(s.summary) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) return <div style={styles.card}><p style={styles.muted}>Loading history…</p></div>

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>Decision history — {symbol}</span>
        {summary && (
          <div style={styles.pills}>
            {Object.entries(summary).map(([action, count]) => (
              <span key={action} style={{ ...styles.pill, color: ACTION_COLOR[action] }}>
                {action} {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p style={styles.muted}>No decisions yet. Hit /decision/{symbol} to generate one.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Time', 'Action', 'ML', 'ML conf', 'Sentiment', 'S. conf', 'Reason'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ ...styles.td, color: ACTION_COLOR[r.action], fontWeight: 600 }}>{r.action}</td>
                  <td style={{ ...styles.td, color: r.ml_prediction === 'UP' ? '#22c55e' : '#ef4444' }}>{r.ml_prediction}</td>
                  <td style={styles.td}>{(r.ml_confidence * 100).toFixed(1)}%</td>
                  <td style={styles.td}>{r.sentiment}</td>
                  <td style={styles.td}>{(r.sent_confidence * 100).toFixed(1)}%</td>
                  <td style={{ ...styles.td, color: '#888', maxWidth: 200 }}>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  card:      { background: '#1e1e2e', border: '1px solid #33334a', borderRadius: 12, padding: 20 },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  title:     { fontSize: 15, fontWeight: 600, color: '#e0e0f0' },
  pills:     { display: 'flex', gap: 8 },
  pill:      { background: '#2a2a3e', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  tableWrap: { overflowX: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:        { color: '#666', fontWeight: 500, textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid #2a2a3e' },
  tr:        { borderBottom: '1px solid #2a2a3e' },
  td:        { color: '#c0c0d8', padding: '7px 10px', whiteSpace: 'nowrap' },
  muted:     { color: '#666', fontSize: 13 },
}