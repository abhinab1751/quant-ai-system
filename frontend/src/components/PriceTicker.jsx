import { useEffect, useRef } from 'react'

export default function PriceTicker({ symbol, priceData, connected }) {
  const prevRef = useRef(null)

  if (!priceData) {
    return (
      <div style={styles.wrap}>
        <span style={styles.symbol}>{symbol}</span>
        <span style={styles.muted}>{connected ? 'Waiting for tick…' : 'Connecting…'}</span>
        <StatusDot connected={connected} />
      </div>
    )
  }

  const { price, change, change_pct } = priceData
  const up    = change >= 0
  const color = up ? '#22c55e' : '#ef4444'
  const arrow = up ? '▲' : '▼'

  return (
    <div style={styles.wrap}>
      <span style={styles.symbol}>{symbol}</span>

      <span style={{ ...styles.price, color }}>
        ${price?.toFixed(2)}
      </span>

      <span style={{ ...styles.change, color }}>
        {arrow} {Math.abs(change)?.toFixed(2)} ({Math.abs(change_pct)?.toFixed(2)}%)
      </span>

      <StatusDot connected={connected} />
    </div>
  )
}

function StatusDot({ connected }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: connected ? '#22c55e' : '#ef4444',
      display: 'inline-block',
      boxShadow: connected ? '0 0 6px #22c55e' : 'none',
    }} title={connected ? 'Live' : 'Disconnected'} />
  )
}

const styles = {
  wrap:   { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
            background: '#1e1e2e', borderRadius: 10, border: '1px solid #33334a' },
  symbol: { fontSize: 16, fontWeight: 700, color: '#e0e0f0' },
  price:  { fontSize: 28, fontWeight: 700 },
  change: { fontSize: 14, fontWeight: 500 },
  muted:  { color: '#666', fontSize: 13 },
}