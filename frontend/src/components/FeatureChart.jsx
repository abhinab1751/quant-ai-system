import { useEffect, useState } from 'react'

export default function FeatureChart({ symbol }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    fetch(`/api/prediction/${symbol}/features`)
      .then(r => r.json())
      .then(d => setData(d.feature_importance))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) return <div style={styles.card}><p style={styles.muted}>Loading feature data…</p></div>
  if (!data || !Object.keys(data).length) return null

  const entries = Object.entries(data)
  const max     = entries[0][1]

  return (
    <div style={styles.card}>
      <p style={styles.title}>What drives the {symbol} model</p>
      <div style={styles.list}>
        {entries.map(([feat, imp]) => (
          <div key={feat} style={styles.row}>
            <span style={styles.feat}>{feat.replace(/_/g, ' ')}</span>
            <div style={styles.barWrap}>
              <div style={{
                ...styles.bar,
                width: `${(imp / max) * 100}%`,
                background: imp / max > 0.6 ? '#7c6af7' : imp / max > 0.3 ? '#5b8af7' : '#3a5a8a',
              }} />
            </div>
            <span style={styles.val}>{(imp * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  card:    { background: '#1e1e2e', border: '1px solid #33334a', borderRadius: 12, padding: 20 },
  title:   { fontSize: 14, fontWeight: 600, color: '#e0e0f0', marginBottom: 14 },
  list:    { display: 'flex', flexDirection: 'column', gap: 8 },
  row:     { display: 'flex', alignItems: 'center', gap: 10 },
  feat:    { fontSize: 12, color: '#888', width: 110, flexShrink: 0, textAlign: 'right' },
  barWrap: { flex: 1, background: '#2a2a3e', borderRadius: 4, height: 8 },
  bar:     { height: 8, borderRadius: 4, transition: 'width 0.5s ease' },
  val:     { fontSize: 11, color: '#555', width: 36, textAlign: 'right' },
  muted:   { color: '#666', fontSize: 13 },
}