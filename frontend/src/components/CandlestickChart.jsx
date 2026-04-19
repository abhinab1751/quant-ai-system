import { useEffect, useRef, useState } from 'react'
import { createChart } from 'lightweight-charts'
import { C, FONTS, RADIUS } from './theme'

const PERIODS = ['1mo', '3mo', '6mo', '1y', '2y']

export default function CandlestickChart({ symbol, trades = [] }) {
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const seriesRef    = useRef(null)
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light')
  const [period,  setPeriod]  = useState('6mo')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => {
      setTheme(el.getAttribute('data-theme') || 'light')
    })
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const isDark = theme === 'dark'
    const palette = isDark
      ? {
          bg: '#0A0A0A',
          text: '#A3A3A3',
          grid: '#262626',
          green: '#22C55E',
          red: '#FB7185',
          btnBg: '#111111',
          btnBorder: '#262626',
          btnText: '#A3A3A3',
        }
      : {
          bg: '#FFFFFF',
          text: '#64748B',
          grid: '#E2E8F0',
          green: '#16A34A',
          red: '#DC2626',
          btnBg: '#F4F6FB',
          btnBorder: '#E2E8F0',
          btnText: '#64748B',
        }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: palette.bg },
        textColor:  palette.text,
      },
      grid: {
        vertLines:  { color: palette.grid },
        horzLines:  { color: palette.grid },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: palette.grid },
      timeScale: {
        borderColor:     palette.grid,
        timeVisible:     true,
        secondsVisible:  false,
      },
      width:  containerRef.current.clientWidth,
      height: 360,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor:      palette.green,
      downColor:    palette.red,
      borderVisible: false,
      wickUpColor:   palette.green,
      wickDownColor: palette.red,
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
  }, [theme])

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
              color:     t.action === 'BUY' ? (theme === 'dark' ? '#22C55E' : '#16A34A') : (theme === 'dark' ? '#FB7185' : '#DC2626'),
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
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text0, fontFamily: FONTS.sans }}>{symbol} — Price chart</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: p === period ? C.blue : C.inputBg,
                border: `1px solid ${p === period ? C.blue : C.border}`,
                borderRadius: RADIUS.sm,
                color: p === period ? '#fff' : C.text2,
                padding: '3px 8px',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: FONTS.sans,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.text3, fontSize: 13 }}>Loading chart…</div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.red, fontSize: 13 }}>{error}</div>
      )}

      <div ref={containerRef} style={{ opacity: loading ? 0.3 : 1 }} />
    </div>
  )
}