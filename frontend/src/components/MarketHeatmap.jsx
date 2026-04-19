import { useState, useEffect } from 'react'
import { C, FONTS, RADIUS, Card, CardHeader } from './theme'

const SECTORS = [
  { label: 'Technology',   syms: ['AAPL', 'MSFT', 'NVDA', 'META', 'GOOGL', 'AMD'] },
  { label: 'Consumer',     syms: ['AMZN', 'TSLA', 'NKE', 'MCD', 'SBUX']           },
  { label: 'Finance',      syms: ['JPM', 'GS', 'BAC', 'V', 'MA']                  },
  { label: 'Healthcare',   syms: ['JNJ', 'PFE', 'UNH', 'ABBV']                    },
  { label: 'Energy',       syms: ['XOM', 'CVX', 'SLB']                             },
  { label: 'Index ETFs',   syms: ['SPY', 'QQQ', 'DIA', 'IWM']                     },
]

async function parseResponseBody(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json().catch(() => null)
  }

  const text = await res.text().catch(() => '')
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

function tileColor(chg) {
  if (chg == null) return { bg: C.inputBg, border: C.border, text: C.text3 }
  const intensity = Math.min(Math.abs(chg) / 4, 1)
  if (chg > 0) return {
    bg:     `rgba(22,163,74,${0.06 + intensity * 0.22})`,
    border: `rgba(22,163,74,${0.2 + intensity * 0.4})`,
    text:   C.green,
  }
  return {
    bg:     `rgba(220,38,38,${0.06 + intensity * 0.22})`,
    border: `rgba(220,38,38,${0.2 + intensity * 0.4})`,
    text:   C.red,
  }
}

export default function MarketHeatmap({ onSelect }) {
  const [prices,  setPrices]  = useState({})
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState(null)
  const allSyms = SECTORS.flatMap(s => s.syms)

  useEffect(() => {
    const f = () => {
      setLoading(true)
      let done = 0
      allSyms.forEach(sym =>
        fetch(`/api/market/price?symbol=${sym}`).then(parseResponseBody)
          .then(d => { if (d.price) setPrices(p => ({ ...p, [sym]: d })) })
          .catch(() => {})
          .finally(() => { done++; if (done === allSyms.length) setLoading(false) })
      )
    }
    f(); const id = setInterval(f, 20_000); return () => clearInterval(id)
  }, [])

  const sectorAvg = syms => {
    const v = syms.map(s => prices[s]?.change_pct).filter(x => x != null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
  }

  const allPriced = allSyms.filter(s => prices[s]?.change_pct != null)
  const sorted    = [...allPriced].sort((a, b) => (prices[b].change_pct ?? 0) - (prices[a].change_pct ?? 0))
  const gainers   = sorted.slice(0, 3)
  const losers    = sorted.slice(-3).reverse()

  return (
    <Card>
      <CardHeader
        title="Market Heatmap"
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {[['Gain', C.green, C.greenBg], ['Loss', C.red, C.redBg]].map(([l, c, bg]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1px solid ${c}40` }} />
                <span style={{ fontSize: 11, color: C.text2, fontWeight: 500 }}>{l}</span>
              </div>
            ))}
            {loading && <span style={{ fontSize: 11, color: C.text3 }}>Updating…</span>}
          </div>
        }
      />

      <div style={{ padding: 20 }}>
        {/* Gainers / Losers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
          {[['▲ Top Gainers', gainers, C.green, C.greenBg, '#BBF7D0'],
            ['▼ Top Losers',  losers,  C.red,   C.redBg,   '#FECACA']].map(([title, syms, color, bg, border]) => (
            <div key={title} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: RADIUS.lg, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.04em', marginBottom: 10 }}>{title}</div>
              {syms.map(sym => (
                <div key={sym} onClick={() => onSelect(sym)} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: '5px 0', borderBottom: `1px solid ${border}40` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{sym.slice(0, 2)}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{sym}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color }}>
                    {(prices[sym]?.change_pct >= 0 ? '+' : '')}{prices[sym]?.change_pct?.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Sector grids */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SECTORS.map(sector => {
            const avg  = sectorAvg(sector.syms)
            const avgC = avg !== null ? (avg >= 0 ? C.green : C.red) : C.text3
            return (
              <div key={sector.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text1 }}>{sector.label}</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  {avg !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: avgC, background: avg >= 0 ? C.greenBg : C.redBg, borderRadius: RADIUS.full, padding: '2px 8px' }}>
                      {avg >= 0 ? '+' : ''}{avg.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sector.syms.map(sym => {
                    const d   = prices[sym]
                    const chg = d?.change_pct ?? null
                    const col = tileColor(chg)
                    const isH = hovered === sym
                    return (
                      <div key={sym} onClick={() => onSelect(sym)}
                        onMouseEnter={() => setHovered(sym)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          width: 84, padding: '10px 8px', textAlign: 'center',
                          background: col.bg,
                          border: `1.5px solid ${isH ? col.text : col.border}`,
                          borderRadius: RADIUS.md,
                          cursor: 'pointer',
                          transition: 'all .15s ease',
                          transform: isH ? 'translateY(-1px)' : 'translateY(0)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: C.text1, marginBottom: 4 }}>{sym}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: col.text }}>
                          {chg == null ? '—' : `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`}
                        </div>
                        {d?.price != null && (
                          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                            ${Number(d.price).toFixed(2)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}