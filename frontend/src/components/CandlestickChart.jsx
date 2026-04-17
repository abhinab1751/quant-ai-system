import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'

const PERIODS = ['1mo', '3mo', '6mo', '1y', '2y']

export default function CandlestickChart({ symbol, trades = [] }) {
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const seriesRef    = useRef(null)
  const [period,  setPeriod]  = useState('6mo')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#12121e' },
        textColor:  '#888',
      },
      grid: {
        vertLines:  { color: '#2a2a3e' },
        horzLines:  { color: '#2a2a3e' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#2a2a3e' },
      timeScale: {
        borderColor:     '#2a2a3e',
        timeVisible:     true,
        secondsVisible:  false,
      },
      width:  containerRef.current.clientWidth,
      height: 360,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor:      '#22c55e',
      downColor:    '#ef4444',
      borderVisible: false,
      wickUpColor:   '#22c55e',
      wickDownColor: '#ef4444',
    })

    chartRef.current  = chart
    seriesRef.current = candleSeries

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !symbol) return
    setLoading(true)
    setError(null)

    fetch(`/api/ohlcv/${symbol}?period=${period}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        const candles = data.candles || []
        if (!candles.length) { setError('No data'); setLoading(false); return }

        seriesRef.current.setData(
          candles.map(c => ({
            time:  c.time,
            open:  c.open,
            high:  c.high,
            low:   c.low,
            close: c.close,
          }))
        )

        if (trades.length) {
          const markers = trades
            .filter(t => t.date && (t.action === 'BUY' || t.action === 'SELL'))
            .map(t => ({
              time:      t.date,
              position:  t.action === 'BUY' ? 'belowBar' : 'aboveBar',
              color:     t.action === 'BUY' ? '#22c55e' : '#ef4444',
              shape:     t.action === 'BUY' ? 'arrowUp'  : 'arrowDown',
              text:      t.action,
              size:      1,
            }))
          seriesRef.current.setMarkers(markers)
        }

        chartRef.current.timeScale().fitContent()
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [symbol, period, trades])

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>{symbol} — Price chart</span>
        <div style={styles.periodBtns}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{ ...styles.pBtn, ...(p === period ? styles.pBtnActive : {}) }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={styles.overlay}>Loading chart…</div>
      )}
      {error && (
        <div style={{ ...styles.overlay, color: '#ef4444' }}>{error}</div>
      )}

      <div ref={containerRef} style={{ opacity: loading ? 0.3 : 1 }} />
    </div>
  )
}

const styles = {
  card:       { background: '#1e1e2e', border: '1px solid #33334a', borderRadius: 12, padding: 20 },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:      { fontSize: 15, fontWeight: 600, color: '#e0e0f0' },
  periodBtns: { display: 'flex', gap: 4 },
  pBtn:       { background: '#2a2a3e', border: '1px solid #44445a', borderRadius: 4,
                color: '#888', padding: '3px 8px', fontSize: 11, cursor: 'pointer' },
  pBtnActive: { background: '#7c6af7', borderColor: '#7c6af7', color: '#fff' },
  overlay:    { textAlign: 'center', padding: '40px 0', color: '#666', fontSize: 13 },
}