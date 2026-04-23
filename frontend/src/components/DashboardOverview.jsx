import { useState, useEffect } from 'react'
import { C, FONTS, RADIUS, Card, CardHeader } from './theme'
import { getPrice, getNews, getBacktestHistory } from '../api/client'
import DecisionCard from './DecisionCard'
import CandlestickChart from './CandlestickChart'

const TRENDING_SEEDS = [
  { symbol: 'NVDA', name: 'NVIDIA', price: 875.50, change: 15.3, color: '#76B900' },
  { symbol: 'MSFT', name: 'Microsoft', price: 420.25, change: 12.1, color: '#00A4EF' },
  { symbol: 'GOOGL', name: 'Alphabet', price: 180.40, change: 8.9, color: '#4285F4' },
  { symbol: 'META', name: 'Meta', price: 525.80, change: -2.3, color: '#1877F2' },
]

export default function DashboardOverview({ symbol, liveDecision, onSelectSymbol }) {
  const [watchlist, setWatchlist] = useState([
    { symbol: 'AAPL', name: 'Apple Inc', price: 4008.65, change: 11.01 },
    { symbol: 'SPOT', name: 'Spotify Com', price: 11689.00, change: 9.48 },
    { symbol: 'ABNB', name: 'Airbnb Inc', price: 32227.00, change: -0.29 },
  ])

  const [backtestRuns, setBacktestRuns] = useState([])
  const [perfLoading, setPerfLoading] = useState(true)
  const [perfError, setPerfError] = useState('')

  const [newsItems, setNewsItems] = useState([])
  const [newsMeta, setNewsMeta] = useState({ sentiment: 'NEUTRAL', confidence: 0, summary: '' })
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState('')

  const [trendingStocks, setTrendingStocks] = useState(TRENDING_SEEDS)

  // Fetch real prices for trending symbols
  useEffect(() => {
    TRENDING_SEEDS.forEach(({ symbol: sym }) => {
      getPrice(sym)
        .then(d => {
          setTrendingStocks(prev =>
            prev.map(s => s.symbol === sym ? { ...s, price: d.price, change: d.change || s.change } : s)
          )
        })
        .catch(() => {})
    })
  }, [])

  useEffect(() => {
    let alive = true

    const loadPerformance = async () => {
      if (!symbol) return
      setPerfLoading(true)
      setPerfError('')

      try {
        const data = await getBacktestHistory(symbol)
        if (!alive) return
        const runs = Array.isArray(data?.runs) ? data.runs : []
        runs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        setBacktestRuns(runs)
      } catch (e) {
        if (!alive) return
        setBacktestRuns([])
        setPerfError(e?.message || 'Failed to load performance data')
      } finally {
        if (alive) setPerfLoading(false)
      }
    }

    loadPerformance()
    const id = setInterval(loadPerformance, 45000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [symbol])

  useEffect(() => {
    let alive = true

    const loadNews = async () => {
      if (!symbol) return
      setNewsLoading(true)
      setNewsError('')

      try {
        const data = await getNews(symbol)
        if (!alive) return
        setNewsItems(Array.isArray(data?.articles) ? data.articles : [])
        setNewsMeta({
          sentiment: data?.sentiment || 'NEUTRAL',
          confidence: Number(data?.confidence || 0),
          summary: data?.summary || '',
        })
      } catch (e) {
        if (!alive) return
        setNewsItems([])
        setNewsError(e?.message || 'Failed to load news')
      } finally {
        if (alive) setNewsLoading(false)
      }
    }

    loadNews()
    const id = setInterval(loadNews, 45000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [symbol])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* AI Decision */}
      <DecisionCard symbol={symbol} liveDecision={liveDecision} />

      {/* Top Trending Stock Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {trendingStocks.map((stock) => (
          <div
            key={stock.symbol}
            onClick={() => onSelectSymbol?.(stock.symbol)}
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.lg,
              padding: 20,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = C.shadowLg
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: stock.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                  {stock.symbol[0]}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text0 }}>
                  {stock.symbol}
                </div>
                <div style={{ fontSize: 12, color: C.text2 }}>
                  {stock.name}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.text0 }}>
                ${stock.price.toFixed(2)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: stock.change >= 0 ? C.green : C.red,
                  background: stock.change >= 0 ? C.greenBg : C.redBg,
                  padding: '4px 10px',
                  borderRadius: RADIUS.full,
                }}
              >
                {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* Portfolio Performance */}
        <PortfolioPerformanceChart symbol={symbol} runs={backtestRuns} loading={perfLoading} error={perfError} />

        {/* Live News */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LiveNewsSection
            symbol={symbol}
            items={newsItems}
            meta={newsMeta}
            loading={newsLoading}
            error={newsError}
          />
          <MyWatchlist watchlist={watchlist} onSelect={onSelectSymbol} />
        </div>
      </div>

      {/* Trending Stocks */}
      <TrendingStocks stocks={trendingStocks} onSelect={onSelectSymbol} />

    {/* Trading Chart */}
    <CandlestickChart symbol={symbol} trades={[]} />
    </div>
  )
}

function PortfolioPerformanceChart({ symbol, runs, loading, error }) {
  const [period, setPeriod] = useState('Monthly')

  const fmtMonth = (v) => {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return 'N/A'
    return d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
  }

  const makeQuarterLabel = (d) => {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} ${String(d.getFullYear()).slice(-2)}`
  }

  const transformed = (() => {
    if (!Array.isArray(runs) || runs.length === 0) return []

    if (period === 'Monthly') {
      return runs.slice(-12).map((r, idx) => ({
        x: fmtMonth(r.created_at),
        value: Number(r.final_value || 0),
        runId: r.run_id || idx,
      }))
    }

    const group = new Map()
    runs.forEach((r) => {
      const d = new Date(r.created_at)
      if (Number.isNaN(d.getTime())) return

      const key = period === 'Quarterly'
        ? `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
        : `${d.getFullYear()}`

      const prev = group.get(key)
      if (!prev || new Date(r.created_at).getTime() > new Date(prev.created_at).getTime()) {
        group.set(key, r)
      }
    })

    const rows = [...group.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return rows.map((r, idx) => {
      const d = new Date(r.created_at)
      return {
        x: period === 'Quarterly' ? makeQuarterLabel(d) : String(d.getFullYear()),
        value: Number(r.final_value || 0),
        runId: r.run_id || idx,
      }
    })
  })()

  const fallback = [
    { x: 'Jun 25', value: 10320 },
    { x: 'Jul 25', value: 10140 },
    { x: 'Aug 25', value: 10480 },
    { x: 'Sep 25', value: 10620 },
    { x: 'Oct 25', value: 10910 },
    { x: 'Nov 25', value: 11140 },
    { x: 'Dec 25', value: 11480 },
  ]

  const data = transformed.length > 0 ? transformed : fallback
  const minVal = Math.min(...data.map(d => d.value))
  const maxVal = Math.max(...data.map(d => d.value))
  const range = maxVal - minVal || 1
  const latest = data[data.length - 1]?.value || 0
  const first = data[0]?.value || 0
  const deltaPct = first ? ((latest - first) / first) * 100 : 0

  const chartWidth = 640
  const chartHeight = 200
  const xPad = 20
  const yTop = 0
  const yBottom = 200
  const usableWidth = Math.max(chartWidth - xPad * 2, 1)
  const stepX = data.length > 1 ? usableWidth / (data.length - 1) : 0
  const getX = (i) => xPad + i * stepX
  const getY = (value) => yBottom - ((value - minVal) / range) * (yBottom - yTop)

  const compactMoney = (v) => {
    if (!Number.isFinite(v)) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v)
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardHeader
        title={`Portfolio Performance · ${symbol}`}
        subtitle={loading ? 'Refreshing backtest history...' : error ? 'Unable to refresh from API, showing fallback trend' : 'Based on your latest backtest history'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {['Monthly', 'Quarterly', 'Annually'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  border: 'none',
                  background: p === period ? C.blue : 'transparent',
                  color: p === period ? '#fff' : C.text2,
                  borderRadius: RADIUS.md,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />
      <div style={{
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 12, color: C.text2 }}>
          Latest Value
          <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 800, color: C.text0 }}>{compactMoney(latest)}</span>
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: deltaPct >= 0 ? C.green : C.red,
          background: deltaPct >= 0 ? C.greenBg : C.redBg,
          borderRadius: RADIUS.full,
          padding: '4px 10px',
        }}>
          {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(2)}%
        </div>
      </div>
      <div style={{ padding: '16px 20px 12px', position: 'relative', minHeight: 240, flex: 1 }}>
        <svg
          style={{ width: '100%', height: '100%' }}
          viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={C.blue} stopOpacity="0.3" />
              <stop offset="100%" stopColor={C.blue} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 50, 100, 150, 200].map((y) => (
            <line
              key={`grid-${y}`}
              x1="0"
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke={C.border}
              strokeWidth="1"
              opacity="0.5"
            />
          ))}

          {/* Y-axis labels */}
          {[0, 50, 100, 150, 200].map((y) => (
            <text
              key={`label-${y}`}
              x="8"
              y={y + 4}
              fontSize="10"
              fill={C.text3}
              textAnchor="end"
            >
              {compactMoney(minVal + ((200 - y) / 200) * range)}
            </text>
          ))}

          {/* Line path */}
          <polyline
            points={data
              .map((d, i) => {
                const x = getX(i)
                const y = getY(d.value)
                return `${x},${y}`
              })
              .join(' ')}
            fill="none"
            stroke={C.blue}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Area under line */}
          <polygon
            points={`${xPad},${yBottom} ${data
              .map((d, i) => {
                const x = getX(i)
                const y = getY(d.value)
                return `${x},${y}`
              })
              .join(' ')} ${getX(data.length - 1)},${yBottom}`}
            fill="url(#chart-gradient)"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = getX(i)
            const y = getY(d.value)
            return (
              <circle
                key={`point-${i}`}
                cx={x}
                cy={y}
                r="3"
                fill={C.blue}
                opacity="0.8"
              />
            )
          })}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={`month-${i}`}
              x={getX(i)}
              y="220"
              fontSize="10"
              fill={C.text3}
              textAnchor="middle"
            >
              {d.x}
            </text>
          ))}
        </svg>
      </div>
    </Card>
  )
}

function LiveNewsSection({ symbol, items, meta, loading, error }) {
  const sentimentColor =
    meta.sentiment === 'POSITIVE' ? C.green :
    meta.sentiment === 'NEGATIVE' ? C.red : C.amber

  const formatTime = (value) => {
    if (!value) return 'Unknown time'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return 'Unknown time'
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader
        title={`Live News · ${symbol}`}
        subtitle="Auto-refreshes every 45 seconds"
        actions={
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: sentimentColor,
            background: `${sentimentColor}18`,
            border: `1px solid ${sentimentColor}40`,
            borderRadius: RADIUS.full,
            padding: '3px 8px',
          }}>
            {meta.sentiment} {meta.confidence ? `${Math.round(meta.confidence * 100)}%` : ''}
          </div>
        }
      />

      <div style={{ padding: 16, maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ fontSize: 12, color: C.text3, padding: '8px 2px' }}>
            Loading latest headlines...
          </div>
        )}

        {!loading && error && (
          <div style={{
            fontSize: 12,
            color: C.red,
            background: C.redBg,
            border: `1px solid ${C.redBorder}`,
            borderRadius: RADIUS.md,
            padding: '8px 10px',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && meta.summary && (
          <div style={{
            fontSize: 12,
            color: C.text2,
            background: C.inputBg,
            borderRadius: RADIUS.md,
            padding: '8px 10px',
            borderLeft: `3px solid ${sentimentColor}`,
          }}>
            {meta.summary}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div style={{ fontSize: 12, color: C.text3, padding: '8px 2px' }}>
            No recent news found for {symbol}.
          </div>
        )}

        {!loading && !error && items.map((article, i) => {
          const title = article?.title || 'Untitled article'
          const source = article?.source?.name || 'Unknown source'
          const when = formatTime(article?.publishedAt)
          const link = article?.url

          const content = (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text0, lineHeight: 1.45 }}>
                {title}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, color: C.text3 }}>
                <span>{source}</span>
                <span>•</span>
                <span>{when}</span>
              </div>
            </>
          )

          if (!link) {
            return (
              <div key={i} style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: '10px 12px' }}>
                {content}
              </div>
            )
          }

          return (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                background: C.inputBg,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.md,
                padding: '10px 12px',
                display: 'block',
              }}
            >
              {content}
            </a>
          )
        })}
      </div>
    </Card>
  )
}

function MyWatchlist({ watchlist, onSelect }) {
  return (
    <Card>
      <CardHeader title="My Watchlist" />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {watchlist.map((stock, i) => (
          <div
            key={i}
            onClick={() => onSelect?.(stock.symbol)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              background: C.inputBg,
              borderRadius: RADIUS.md,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.border
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.inputBg
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.blue}, #60A5FA)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  {stock.symbol[0]}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text0 }}>
                  {stock.symbol}
                </div>
                <div style={{ fontSize: 11, color: C.text3 }}>
                  {stock.name}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text0 }}>
                ${stock.price.toFixed(2)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: stock.change >= 0 ? C.green : C.red,
                }}
              >
                {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function TrendingStocks({ stocks, onSelect }) {
  return (
    <Card>
      <CardHeader
        title="Trending Stocks"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                width: 32,
                height: 32,
                borderRadius: RADIUS.md,
                border: `1px solid ${C.border}`,
                background: C.inputBg,
                color: C.text2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              ‹
            </button>
            <button
              style={{
                width: 32,
                height: 32,
                borderRadius: RADIUS.md,
                border: `1px solid ${C.border}`,
                background: C.inputBg,
                color: C.text2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              ›
            </button>
          </div>
        }
      />
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
        {stocks.map((stock, i) => (
          <div
            key={i}
            onClick={() => onSelect?.(stock.symbol)}
            style={{
              background: C.inputBg,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md,
              padding: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = C.shadowLg
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.blue}, #60A5FA)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {stock.symbol[0]}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text0, marginBottom: 4 }}>
              {stock.symbol}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginBottom: 8 }}>
              ${stock.price.toFixed(2)}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: stock.change >= 0 ? C.green : C.red,
                background: stock.change >= 0 ? C.greenBg : C.redBg,
                padding: '4px 8px',
                borderRadius: RADIUS.full,
                width: 'fit-content',
                margin: '0 auto',
              }}
            >
              {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
