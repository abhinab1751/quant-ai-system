import { useState, useEffect, useRef, useCallback } from 'react'
import { C, FONTS, RADIUS } from './theme'

const SECTORS = {
  Technology:   ['AAPL','MSFT','NVDA','META','GOOGL','AMD','INTC','ORCL','CRM','ADBE'],
  Consumer:     ['AMZN','TSLA','NKE','MCD','SBUX','WMT','COST','TGT','HD','LOW'],
  Finance:      ['JPM','GS','BAC','WFC','V','MA','MS','BLK','AXP','C'],
  Healthcare:   ['JNJ','PFE','UNH','ABBV','MRK','LLY','TMO','ABT','BMY','AMGN'],
  Energy:       ['XOM','CVX','SLB','COP','EOG','PXD','MPC','VLO','PSX','OXY'],
  'Index ETFs': ['SPY','QQQ','DIA','IWM','VTI','GLD','SLV','TLT','HYG','EEM'],
}
const ALL_SYMBOLS = [...new Set(Object.values(SECTORS).flat())]

function getColor(pct) {
  if (pct == null) return { bg: 'rgba(100,100,120,0.12)', border: 'rgba(100,100,120,0.2)', text: '#94A3B8', glow: 'none' }
  const abs = Math.abs(pct)
  const green = pct > 0
  const step = abs >= 4 ? 4 : abs >= 2.5 ? 3 : abs >= 1.5 ? 2 : abs >= 0.5 ? 1 : 0
  const G = [
    ['rgba(22,163,74,0.08)',  'rgba(22,163,74,0.18)',  '#16A34A', 'none'],
    ['rgba(22,163,74,0.14)',  'rgba(22,163,74,0.30)',  '#15803D', `0 0 8px rgba(22,163,74,0.2)`],
    ['rgba(22,163,74,0.22)',  'rgba(22,163,74,0.45)',  '#14532D', `0 0 12px rgba(22,163,74,0.3)`],
    ['rgba(22,163,74,0.32)',  'rgba(22,163,74,0.60)',  '#DCFCE7', `0 0 16px rgba(22,163,74,0.4)`],
    ['rgba(22,163,74,0.50)',  'rgba(22,163,74,0.80)',  '#F0FDF4', `0 0 20px rgba(22,163,74,0.5)`],
  ]
  const R = [
    ['rgba(220,38,38,0.08)',  'rgba(220,38,38,0.18)',  '#DC2626', 'none'],
    ['rgba(220,38,38,0.14)',  'rgba(220,38,38,0.30)',  '#B91C1C', `0 0 8px rgba(220,38,38,0.2)`],
    ['rgba(220,38,38,0.22)',  'rgba(220,38,38,0.45)',  '#7F1D1D', `0 0 12px rgba(220,38,38,0.3)`],
    ['rgba(220,38,38,0.32)',  'rgba(220,38,38,0.60)',  '#FEE2E2', `0 0 16px rgba(220,38,38,0.4)`],
    ['rgba(220,38,38,0.50)',  'rgba(220,38,38,0.80)',  '#FFF1F2', `0 0 20px rgba(220,38,38,0.5)`],
  ]
  const [bg, border, text, glow] = (green ? G : R)[step]
  return { bg, border, text, glow }
}

function Tooltip({ d, x, y, visible }) {
  if (!visible || !d) return null
  const pct  = d.change_pct
  const up   = pct == null ? null : pct >= 0
  const col  = pct == null ? C.text3 : up ? '#16A34A' : '#DC2626'
  return (
    <div style={{
      position: 'fixed', left: x + 12, top: y - 8,
      background: '#0F172A', border: '1px solid #334155',
      borderRadius: 10, padding: '10px 14px', zIndex: 9999,
      minWidth: 140, pointerEvents: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#F8FAFC', marginBottom: 4, fontFamily: FONTS.sans }}>
        {d.symbol}
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6, fontFamily: FONTS.sans }}>{d.sector}</div>
      {d.price != null && (
        <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', fontFamily: FONTS.mono, marginBottom: 3 }}>
          ${d.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
      {pct != null && (
        <div style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: FONTS.mono }}>
          {pct >= 0 ? '▲ +' : '▼ '}{pct.toFixed(2)}%
        </div>
      )}
      {d.price == null && <div style={{ fontSize: 12, color: '#64748B' }}>Loading…</div>}
    </div>
  )
}

function Tile({ d, size, onClick, onMouseEnter, onMouseLeave }) {
  const col   = getColor(d.change_pct)
  const flash = useRef(null)
  const ref   = useRef(null)

  useEffect(() => {
    if (d.price == null) return
    const el = ref.current
    if (!el) return
    el.style.transition = 'none'
    el.style.outline = `2px solid ${d.change_pct >= 0 ? '#22C55E' : '#EF4444'}`
    flash.current = setTimeout(() => {
      if (el) el.style.outline = ''
      el.style.transition = 'all 0.4s ease'
    }, 600)
    return () => clearTimeout(flash.current)
  }, [d.price])

  const SZ = {
    compact: { w: 68,  h: 52,  fSym: 10, fPct: 11 },
    normal:  { w: 90,  h: 68,  fSym: 12, fPct: 13 },
    large:   { w: 116, h: 88,  fSym: 14, fPct: 15 },
  }
  const s = SZ[size] || SZ.normal

  return (
    <div
      ref={ref}
      onClick={() => onClick(d.symbol)}
      onMouseEnter={(e) => onMouseEnter(d, e)}
      onMouseLeave={onMouseLeave}
      title={`${d.symbol}  ${d.price ? '$' + d.price.toFixed(2) : '—'}  ${d.change_pct != null ? (d.change_pct >= 0 ? '+' : '') + d.change_pct.toFixed(2) + '%' : ''}`}
      style={{
        width:          s.w,
        height:         s.h,
        background:     col.bg,
        border:         `1.5px solid ${col.border}`,
        borderRadius:   RADIUS.md,
        cursor:         'pointer',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            2,
        transition:     'all 0.25s ease',
        boxShadow:      col.glow,
        userSelect:     'none',
        flexShrink:     0,
      }}
    >
      <div style={{ fontSize: s.fSym, fontWeight: 800, color: col.step >= 3 ? col.text : C.text0, fontFamily: FONTS.sans, letterSpacing: '-0.02em' }}>
        {d.symbol}
      </div>
      <div style={{ fontSize: s.fPct, fontWeight: 700, color: col.text, fontFamily: FONTS.mono, lineHeight: 1 }}>
        {d.change_pct == null ? '—' : `${d.change_pct >= 0 ? '+' : ''}${d.change_pct.toFixed(2)}%`}
      </div>
      {size !== 'compact' && d.price != null && (
        <div style={{ fontSize: 10, color: col.text, fontFamily: FONTS.mono, opacity: 0.75 }}>
          ${d.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      )}
    </div>
  )
}
export default function MarketHeatmap({ onSelect }) {
  const [prices,    setPrices]    = useState({})      
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [sector,    setSector]    = useState('All')
  const [size,      setSize]      = useState('normal')
  const [sortBy,    setSortBy]    = useState('change_pct')
  const [sortAsc,   setSortAsc]   = useState(false)
  const [search,    setSearch]    = useState('')
  const [tooltip,   setTooltip]   = useState({ visible: false, d: null, x: 0, y: 0 })
  const intervalRef = useRef(null)

  const fetchPrices = useCallback(async (syms) => {
    const results = await Promise.allSettled(
      syms.map(sym =>
        fetch(`/api/market/price?symbol=${sym}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d && d.price != null ? { sym, data: d } : null)
          .catch(() => null)
      )
    )
    setPrices(prev => {
      const next = { ...prev }
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          const { sym, data } = r.value
          next[sym] = {
            price:      data.price,
            change_pct: data.change_pct ?? null,
            change:     data.change     ?? 0,
          }
        }
      })
      return next
    })
  }, [])

  useEffect(() => {
    const syms = ALL_SYMBOLS
    setLoading(true)
    setError(null)
    fetchPrices(syms).finally(() => setLoading(false))
    intervalRef.current = setInterval(() => fetchPrices(syms), 20_000)
    return () => clearInterval(intervalRef.current)
  }, [fetchPrices])

  const sectorSyms = sector === 'All' ? ALL_SYMBOLS : (SECTORS[sector] || [])
  const sectorName  = (sym) => Object.entries(SECTORS).find(([, v]) => v.includes(sym))?.[0] || ''

  let displayData = sectorSyms
    .filter(sym => sym.toLowerCase().includes(search.toLowerCase()))
    .map(sym => ({
      symbol:     sym,
      sector:     sectorName(sym),
      price:      prices[sym]?.price      ?? null,
      change_pct: prices[sym]?.change_pct ?? null,
      change:     prices[sym]?.change     ?? 0,
    }))

  displayData.sort((a, b) => {
    let va, vb
    if (sortBy === 'change_pct') {
      va = a.change_pct ?? -Infinity
      vb = b.change_pct ?? -Infinity
    } else if (sortBy === 'price') {
      va = a.price ?? 0; vb = b.price ?? 0
    } else {
      va = a.symbol; vb = b.symbol
    }
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortAsc ? va - vb : vb - va
  })

  const priced  = displayData.filter(d => d.change_pct != null)
  const gainers = priced.filter(d => d.change_pct > 0).length
  const losers  = priced.filter(d => d.change_pct < 0).length
  const avgChg  = priced.length ? (priced.reduce((s, d) => s + d.change_pct, 0) / priced.length) : null

  const sectorStats = Object.entries(SECTORS).map(([name, syms]) => {
    const vals = syms.map(s => prices[s]?.change_pct).filter(v => v != null)
    const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { name, avg }
  })

  const handleTileEnter = (d, e) => {
    setTooltip({ visible: true, d, x: e.clientX, y: e.clientY })
  }
  const handleTileLeave = () => setTooltip(t => ({ ...t, visible: false }))

  const handleMouseMove = (e) => {
    if (tooltip.visible) setTooltip(t => ({ ...t, x: e.clientX, y: e.clientY }))
  }

  const cycleSort = (field) => {
    if (sortBy === field) setSortAsc(v => !v)
    else { setSortBy(field); setSortAsc(false) }
  }

  const SortBtn = ({ field, label }) => (
    <button
      onClick={() => cycleSort(field)}
      style={{
        background:   sortBy === field ? C.blueLight : 'transparent',
        border:       `1.5px solid ${sortBy === field ? C.blue : C.border}`,
        borderRadius: RADIUS.sm,
        color:        sortBy === field ? C.blue : C.text2,
        padding:      '4px 10px',
        fontSize:     11,
        fontWeight:   600,
        cursor:       'pointer',
        fontFamily:   FONTS.sans,
        display:      'flex',
        alignItems:   'center',
        gap:          4,
      }}
    >
      {label}
      {sortBy === field && <span style={{ fontSize: 9 }}>{sortAsc ? '▲' : '▼'}</span>}
    </button>
  )

  return (
    <div onMouseMove={handleMouseMove} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tooltip {...tooltip} />

      {/* ── Header card ── */}
      <div style={{
        background:   C.cardBg,
        border:       `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        padding:      '16px 20px',
        boxShadow:    C.shadow,
      }}>
        {/* Row 1: title + stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text0, letterSpacing: '-0.02em' }}>Market Heatmap</div>
            <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
              {loading ? 'Loading prices…' : `${priced.length} / ${displayData.length} priced · updates every 20s`}
            </div>
          </div>
          {/* Stats chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {avgChg != null && (
              <div style={{
                background:   avgChg >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                border:       `1px solid ${avgChg >= 0 ? '#BBF7D0' : '#FECACA'}`,
                borderRadius: RADIUS.full,
                padding:      '4px 12px',
                fontSize:     12,
                fontWeight:   700,
                color:        avgChg >= 0 ? '#16A34A' : '#DC2626',
                fontFamily:   FONTS.mono,
              }}>
                Avg {avgChg >= 0 ? '+' : ''}{avgChg.toFixed(2)}%
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', background: 'rgba(22,163,74,0.08)', border: '1px solid #BBF7D0', borderRadius: RADIUS.full, padding: '3px 10px' }}>
                ▲ {gainers}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', background: 'rgba(220,38,38,0.08)', border: '1px solid #FECACA', borderRadius: RADIUS.full, padding: '3px 10px' }}>
                ▼ {losers}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: sector mini bar chart */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {sectorStats.map(({ name, avg }) => {
            const col = avg == null ? C.text4 : avg >= 0 ? '#16A34A' : '#DC2626'
            const pct = avg == null ? 0 : Math.min(Math.abs(avg) * 15, 60)
            return (
              <button
                key={name}
                onClick={() => setSector(s => s === name ? 'All' : name)}
                style={{
                  display:      'flex',
                  flexDirection:'column',
                  alignItems:   'center',
                  gap:          3,
                  background:   sector === name ? C.blueLight : C.inputBg,
                  border:       `1.5px solid ${sector === name ? C.blue : C.border}`,
                  borderRadius: RADIUS.md,
                  padding:      '6px 10px',
                  cursor:       'pointer',
                  minWidth:     68,
                  transition:   'all 0.15s',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: sector === name ? C.blue : C.text2 }}>
                  {name.replace(' ETFs', '')}
                </div>
                {/* mini bar */}
                <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: col, fontFamily: FONTS.mono }}>
                  {avg == null ? '—' : `${avg >= 0 ? '+' : ''}${avg.toFixed(1)}%`}
                </div>
              </button>
            )
          })}
        </div>

        {/* Row 3: controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 160px', maxWidth: 220 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: C.text3 }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value.toUpperCase())}
              placeholder="Filter…"
              style={{
                width:        '100%',
                background:   C.inputBg,
                border:       `1.5px solid ${C.border}`,
                borderRadius: RADIUS.md,
                color:        C.text1,
                padding:      '6px 10px 6px 28px',
                fontSize:     12,
                fontFamily:   FONTS.sans,
              }}
            />
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', gap: 4 }}>
            <SortBtn field="change_pct" label="% Chg" />
            <SortBtn field="price"      label="Price" />
            <SortBtn field="symbol"     label="A–Z" />
          </div>

          {/* Size */}
          <div style={{ display: 'flex', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, overflow: 'hidden' }}>
            {[['compact','▤'],['normal','⊞'],['large','□']].map(([s, icon]) => (
              <button key={s} onClick={() => setSize(s)} style={{
                padding:    '5px 10px',
                border:     'none',
                background: size === s ? C.blue : 'transparent',
                color:      size === s ? '#fff' : C.text2,
                fontSize:   13,
                cursor:     'pointer',
                transition: 'all 0.15s',
              }}>{icon}</button>
            ))}
          </div>

          {/* Sector pill */}
          {sector !== 'All' && (
            <button onClick={() => setSector('All')} style={{
              background:   C.blueLight,
              border:       `1px solid ${C.blue}`,
              borderRadius: RADIUS.full,
              color:        C.blue,
              padding:      '4px 12px',
              fontSize:     11,
              fontWeight:   700,
              cursor:       'pointer',
              fontFamily:   FONTS.sans,
            }}>
              {sector} ×
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={() => { setLoading(true); fetchPrices(ALL_SYMBOLS).finally(() => setLoading(false)) }}
            disabled={loading}
            style={{
              background:   'transparent',
              border:       `1.5px solid ${C.border}`,
              borderRadius: RADIUS.md,
              color:        loading ? C.text4 : C.text2,
              padding:      '5px 10px',
              fontSize:     14,
              cursor:       loading ? 'not-allowed' : 'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:          4,
              fontFamily:   FONTS.sans,
            }}
          >
            <span style={{ display: 'inline-block', animation: loading ? 'cb-spin 0.8s linear infinite' : 'none' }}>⟳</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{loading ? 'Updating…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid #FECACA', borderRadius: RADIUS.md, padding: '12px 16px', fontSize: 13, color: '#DC2626' }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Colour legend ── */}
      <div style={{
        background:   C.cardBg,
        border:       `1px solid ${C.border}`,
        borderRadius: RADIUS.md,
        padding:      '10px 16px',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        flexWrap:     'wrap',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.text2 }}>Colour scale:</span>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {[
            ['rgba(220,38,38,0.50)', '< −4%'],
            ['rgba(220,38,38,0.32)', '−2.5%'],
            ['rgba(220,38,38,0.14)', '−0.5%'],
            ['rgba(100,100,120,0.12)', '0%'],
            ['rgba(22,163,74,0.14)',  '+0.5%'],
            ['rgba(22,163,74,0.32)',  '+2.5%'],
            ['rgba(22,163,74,0.50)',  '> +4%'],
          ].map(([bg, label]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 26, height: 16, background: bg, borderRadius: 3 }} />
              <span style={{ fontSize: 9, color: C.text3, fontFamily: FONTS.mono }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: C.text3 }}>
          Click a tile to analyse
        </div>
      </div>

      {/* ── Tile grid ── */}
      <div style={{
        background:   C.cardBg,
        border:       `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        padding:      16,
        boxShadow:    C.shadow,
      }}>
        {displayData.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: C.text3, fontSize: 14 }}>
            {search ? `No symbols match "${search}"` : 'No data available.'}
          </div>
        ) : (
          sector === 'All' ? (
            Object.entries(SECTORS).map(([name, syms]) => {
              const filtered = displayData.filter(d => d.sector === name)
              if (filtered.length === 0) return null
              const avg = filtered.filter(d => d.change_pct != null)
              const avgV = avg.length ? avg.reduce((s, d) => s + d.change_pct, 0) / avg.length : null
              return (
                <div key={name} style={{ marginBottom: 20 }}>
                  {/* Sector header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <button
                      onClick={() => setSector(name)}
                      style={{
                        fontSize: 12, fontWeight: 700, color: C.text1,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: FONTS.sans, padding: 0,
                        textDecoration: 'underline dotted',
                      }}
                    >
                      {name}
                    </button>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                    {avgV != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color:      avgV >= 0 ? '#16A34A' : '#DC2626',
                        background: avgV >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                        border:     `1px solid ${avgV >= 0 ? '#BBF7D0' : '#FECACA'}`,
                        borderRadius: RADIUS.full,
                        padding:    '2px 8px',
                        fontFamily: FONTS.mono,
                      }}>
                        {avgV >= 0 ? '+' : ''}{avgV.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {/* Tiles */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {filtered.map(d => (
                      <Tile
                        key={d.symbol}
                        d={d}
                        size={size}
                        onClick={(sym) => onSelect(sym)}
                        onMouseEnter={handleTileEnter}
                        onMouseLeave={handleTileLeave}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {displayData.map(d => (
                <Tile
                  key={d.symbol}
                  d={d}
                  size={size}
                  onClick={(sym) => onSelect(sym)}
                  onMouseEnter={handleTileEnter}
                  onMouseLeave={handleTileLeave}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Top movers table ── */}
      {priced.length > 0 && (
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 14,
        }}>
          {[
            { title: '▲ Top Gainers', items: [...priced].sort((a, b) => b.change_pct - a.change_pct).slice(0, 5), color: '#16A34A', bg: 'rgba(22,163,74,0.06)', border: '#BBF7D0' },
            { title: '▼ Top Losers',  items: [...priced].sort((a, b) => a.change_pct - b.change_pct).slice(0, 5), color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: '#FECACA' },
          ].map(({ title, items, color, bg, border }) => (
            <div key={title} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, background: bg, fontSize: 12, fontWeight: 700, color }}>
                {title}
              </div>
              {items.map((d, i) => (
                <div
                  key={d.symbol}
                  onClick={() => onSelect(d.symbol)}
                  style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    padding:        '10px 16px',
                    borderBottom:   i < items.length - 1 ? `1px solid ${C.border}` : 'none',
                    cursor:         'pointer',
                    transition:     'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.inputBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width:          32, height: 32, borderRadius: '50%',
                      background:     color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow:      `0 2px 8px ${color}40`,
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{d.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text0 }}>{d.symbol}</div>
                      <div style={{ fontSize: 10, color: C.text3 }}>{d.sector}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: FONTS.mono }}>
                      {d.change_pct >= 0 ? '+' : ''}{d.change_pct.toFixed(2)}%
                    </div>
                    {d.price != null && (
                      <div style={{ fontSize: 11, color: C.text2, fontFamily: FONTS.mono }}>${d.price.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}