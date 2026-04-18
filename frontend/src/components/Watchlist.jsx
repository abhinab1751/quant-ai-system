/**
 * frontend/src/components/GlobalWatchlist.jsx
 * ---------------------------------------------
 * Multi-exchange watchlist with:
 *   - Exchange selector per symbol
 *   - Country flag + local time
 *   - Price in native currency + optional USD conversion
 *   - Market open/closed indicator per exchange
 *   - Popular symbol quick-add per exchange
 *
 * Replaces: Watchlist.jsx
 * Drop-in compatible: same props (activeSymbol, onSelect)
 */

import { useState, useEffect, useRef } from 'react'
import { C, FONTS, RADIUS } from './theme'
import { toast } from './Toast'

const BASE = '/api'

const REGIONS = ['Americas', 'Europe', 'Asia-Pacific', 'Middle East & Africa']

const REGION_COLOR = {
  'Americas':              C.blue,
  'Europe':                '#8B5CF6',
  'Asia-Pacific':          C.green,
  'Middle East & Africa':  C.amber,
}

const DEFAULT_WATCHLIST = [
  { symbol: 'AAPL',         exchange: 'NYSE',  name: 'Apple Inc' },
  { symbol: 'MSFT',         exchange: 'NYSE',  name: 'Microsoft' },
  { symbol: 'RELIANCE.NS',  exchange: 'NSE',   name: 'Reliance Industries' },
  { symbol: 'TCS.NS',       exchange: 'NSE',   name: 'TCS' },
  { symbol: 'HSBA.L',       exchange: 'LSE',   name: 'HSBC' },
  { symbol: 'SAP.DE',       exchange: 'XETRA', name: 'SAP' },
  { symbol: '7203.T',       exchange: 'TSE',   name: 'Toyota' },
  { symbol: 'NVDA',         exchange: 'NASDAQ','name': 'NVIDIA' },
]

async function fetchPrice(symbol, convert = null) {
  const url = `${BASE}/market/price?symbol=${symbol}${convert ? `&convert=${convert}` : ''}`
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) return null
  return res.json()
}

async function fetchExchanges() {
  const res = await fetch(`${BASE}/market/exchanges`).catch(() => null)
  if (!res?.ok) return []
  const d = await res.json()
  return d.exchanges || []
}

async function fetchPopularSymbols(exchange) {
  const res = await fetch(`${BASE}/market/exchanges/${exchange}/symbols`).catch(() => null)
  if (!res?.ok) return []
  const d = await res.json()
  return d.symbols || []
}

export default function GlobalWatchlist({ activeSymbol, onSelect }) {
  const [items,     setItems]     = useState(DEFAULT_WATCHLIST)
  const [prices,    setPrices]    = useState({})
  const [exchanges, setExchanges] = useState([])
  const [showAdd,   setShowAdd]   = useState(false)
  const [showPop,   setShowPop]   = useState(null)    
  const [popSyms,   setPopSyms]   = useState([])
  const [newSym,    setNewSym]    = useState('')
  const [newEx,     setNewEx]     = useState('NYSE')
  const [convert,   setConvert]   = useState(null)     
  const [alertMap,  setAlertMap]  = useState({})
  const [showAlert, setShowAlert] = useState(null)
  const [groupBy,   setGroupBy]   = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    fetchExchanges().then(setExchanges)
  }, [])

  useEffect(() => {
    const fetchAll = () => {
      items.forEach(({ symbol }) => {
        fetchPrice(symbol, convert).then(d => {
          if (d) setPrices(p => ({ ...p, [symbol]: d }))
        })
      })
    }
    fetchAll()
    clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchAll, 12_000)
    return () => clearInterval(pollRef.current)
  }, [items, convert])

  useEffect(() => {
    Object.entries(alertMap).forEach(([sym, { above, below }]) => {
      const p = prices[sym]?.price
      if (!p) return
      if (above && p >= above) {
        toast({ title: `Alert: ${sym}`, message: `Price crossed above ${above}`, action: 'BUY', symbol: sym })
        setAlertMap(a => { const n = { ...a }; delete n[sym]; return n })
      }
      if (below && p <= below) {
        toast({ title: `Alert: ${sym}`, message: `Price fell below ${below}`, action: 'SELL', symbol: sym })
        setAlertMap(a => { const n = { ...a }; delete n[sym]; return n })
      }
    })
  }, [prices])

  const addSymbol = () => {
    const s = newSym.trim().toUpperCase()
    if (!s) return
    if (items.find(i => i.symbol === s)) { setShowAdd(false); return }
    setItems(p => [...p, { symbol: s, exchange: newEx, name: s }])
    setNewSym('')
    setShowAdd(false)
  }

  const removeItem = (symbol) => setItems(p => p.filter(i => i.symbol !== symbol))

  const openPopular = async (exchange) => {
    setShowPop(exchange)
    const syms = await fetchPopularSymbols(exchange)
    setPopSyms(syms)
  }

  const addPopular = (sym, exId) => {
    if (!items.find(i => i.symbol === sym)) {
      setItems(p => [...p, { symbol: sym, exchange: exId, name: sym }])
    }
    setShowPop(null)
  }

  const grouped = {}
  if (groupBy) {
    items.forEach(item => {
      const ex = exchanges.find(e => e.id === item.exchange)
      const region = ex?.region || 'Other'
      grouped[region] = grouped[region] || []
      grouped[region].push(item)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Global Watchlist
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setGroupBy(v => !v)} title="Group by region" style={{
              background: groupBy ? C.blueLight : C.inputBg, border: `1px solid ${groupBy ? C.blue : C.border}`,
              borderRadius: RADIUS.sm, color: groupBy ? C.blue : C.text2, padding: '2px 7px', fontSize: 10, cursor: 'pointer',
            }}>Region</button>
            <button onClick={() => setShowAdd(v => !v)} style={{
              background: C.blue, border: 'none', borderRadius: RADIUS.sm,
              color: '#fff', width: 22, height: 22, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
            }}>+</button>
          </div>
        </div>

        {/* Currency toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setConvert(null)} style={{
            flex: 1, padding: '4px', fontSize: 10, fontWeight: 600,
            background: !convert ? C.inputBg : 'transparent',
            border: `1px solid ${!convert ? C.border : 'transparent'}`,
            borderRadius: RADIUS.sm, color: !convert ? C.text1 : C.text3, cursor: 'pointer',
          }}>Native</button>
          <button onClick={() => setConvert('USD')} style={{
            flex: 1, padding: '4px', fontSize: 10, fontWeight: 600,
            background: convert === 'USD' ? C.blueLight : 'transparent',
            border: `1px solid ${convert === 'USD' ? C.blue : 'transparent'}`,
            borderRadius: RADIUS.sm, color: convert === 'USD' ? C.blue : C.text3, cursor: 'pointer',
          }}>$ USD</button>
        </div>
      </div>

      {/* Add symbol form */}
      {showAdd && (
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, background: C.inputBg }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text2, marginBottom: 6 }}>Add symbol</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <input value={newSym} onChange={e => setNewSym(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addSymbol()}
              placeholder="e.g. RELIANCE.NS, 7203.T, AAPL" autoFocus
              style={{
                background: C.cardBg, border: `1.5px solid ${C.border}`, borderRadius: RADIUS.sm,
                color: C.text1, padding: '6px 8px', fontSize: 12, fontFamily: FONTS.sans,
              }} />
            <select value={newEx} onChange={e => setNewEx(e.target.value)} style={{
              background: C.cardBg, border: `1.5px solid ${C.border}`, borderRadius: RADIUS.sm,
              color: C.text1, padding: '5px 8px', fontSize: 11,
            }}>
              {exchanges.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.flag} {ex.name} ({ex.id})</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={addSymbol} style={{
                flex: 1, background: C.blue, border: 'none', borderRadius: RADIUS.sm,
                color: '#fff', padding: '5px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>Add</button>
              <button onClick={() => setShowAdd(false)} style={{
                flex: 1, background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
                color: C.text2, padding: '5px', fontSize: 11, cursor: 'pointer',
              }}>Cancel</button>
            </div>
            {/* Popular symbols shortcut */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
              {['NSE', 'BSE', 'TSE', 'LSE', 'XETRA'].map(ex => {
                const exData = exchanges.find(e => e.id === ex)
                if (!exData) return null
                return (
                  <button key={ex} onClick={() => openPopular(ex)} style={{
                    background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.full,
                    color: C.text2, padding: '2px 8px', fontSize: 10, cursor: 'pointer',
                  }}>{exData.flag} {ex}</button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Popular symbols modal */}
      {showPop && (
        <div style={{ padding: '10px', borderBottom: `1px solid ${C.border}`, background: C.inputBg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>
              {exchanges.find(e => e.id === showPop)?.flag} {showPop} popular
            </span>
            <button onClick={() => setShowPop(null)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 160, overflowY: 'auto' }}>
            {popSyms.map(sym => (
              <button key={sym} onClick={() => addPopular(sym, showPop)} style={{
                background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
                color: C.text1, padding: '5px 8px', fontSize: 11, cursor: 'pointer', textAlign: 'left',
              }}>{sym}</button>
            ))}
          </div>
        </div>
      )}

      {/* Symbol list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        {(groupBy ? Object.entries(grouped) : [['all', items]]).map(([region, regionItems]) => (
          <div key={region}>
            {groupBy && (
              <div style={{
                fontSize: 9, fontWeight: 700, color: REGION_COLOR[region] || C.text3,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '8px 8px 4px', borderBottom: `1px solid ${C.border}`,
              }}>{region}</div>
            )}
            {regionItems.map(item => {
              const d       = prices[item.symbol]
              const active  = item.symbol === activeSymbol
              const exData  = exchanges.find(e => e.id === item.exchange)
              const isOpen  = exData?.is_open
              const chg     = d?.change_pct ?? null
              const up      = chg !== null && chg >= 0
              const hasAlert = !!alertMap[item.symbol]

              return (
                <div key={item.symbol}>
                  <div
                    onClick={() => onSelect(item.symbol)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 8px', borderRadius: RADIUS.md, cursor: 'pointer',
                      background: active ? C.blueLight : 'transparent',
                      borderLeft: `3px solid ${active ? C.blue : 'transparent'}`,
                      transition: 'all 0.15s',
                      marginBottom: 1,
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.inputBg }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Flag + symbol */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                        <span style={{ fontSize: 12 }}>{exData?.flag || '🌍'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: active ? C.blue : C.text0, lineHeight: 1 }}>
                          {item.symbol}
                        </span>
                        {/* Market open dot */}
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                          background: isOpen ? C.green : C.text4,
                        }} title={isOpen ? 'Market open' : 'Market closed'} />
                        {hasAlert && <span style={{ fontSize: 10, color: C.amber }}>⚑</span>}
                      </div>
                      {d?.price && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 11, color: C.text1, fontFamily: FONTS.mono }}>
                            {d.formatted || `${d.currency} ${d.price?.toFixed(2)}`}
                          </span>
                          {chg !== null && (
                            <span style={{
                              fontSize: 9, fontWeight: 700,
                              color: up ? C.green : C.red,
                              background: up ? C.greenBg : C.redBg,
                              borderRadius: RADIUS.full, padding: '1px 5px',
                            }}>
                              {up ? '+' : ''}{chg.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); setShowAlert(showAlert === item.symbol ? null : item.symbol) }}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: C.text3, cursor: 'pointer', padding: '0 1px' }}
                        title="Set price alert">⚑</button>
                      <button onClick={e => { e.stopPropagation(); removeItem(item.symbol) }}
                        style={{ background: 'none', border: 'none', fontSize: 14, color: C.text3, cursor: 'pointer', lineHeight: 1, padding: '0 1px' }}>×</button>
                    </div>
                  </div>

                  {/* Alert panel */}
                  {showAlert === item.symbol && (
                    <AlertPanel
                      sym={item.symbol}
                      alertMap={alertMap}
                      setAlertMap={setAlertMap}
                      onClose={() => setShowAlert(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Exchange status strip */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}`, background: C.inputBg }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Market Status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {exchanges.filter(ex => ['NYSE', 'NSE', 'TSE', 'LSE', 'HKEX'].includes(ex.id)).map(ex => (
            <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.text2 }}>{ex.flag} {ex.id}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10, color: C.text3, fontFamily: FONTS.mono }}>{ex.local_time}</span>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: ex.is_open ? C.green : C.text4,
                  animation: ex.is_open ? 'cb-pulse 2s infinite' : 'none',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AlertPanel({ sym, alertMap, setAlertMap, onClose }) {
  const existing = alertMap[sym] || {}
  const [above, setAbove] = useState(existing.above ?? '')
  const [below, setBelow] = useState(existing.below ?? '')

  const save = () => {
    setAlertMap(a => ({
      ...a, [sym]: {
        above: above !== '' ? parseFloat(above) : null,
        below: below !== '' ? parseFloat(below) : null,
      },
    }))
    onClose()
  }

  return (
    <div style={{
      background: C.amberBg, border: `1.5px solid #FDE68A`,
      borderRadius: RADIUS.md, padding: '8px 10px', marginBottom: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, marginBottom: 6, textTransform: 'uppercase' }}>
        Alert — {sym}
      </div>
      {[['Above', above, setAbove], ['Below', below, setBelow]].map(([l, v, s]) => (
        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: C.text2, width: 40 }}>{l}</span>
          <input type="number" value={v} onChange={e => s(e.target.value)} placeholder="—"
            style={{
              flex: 1, background: C.cardBg, border: `1.5px solid ${C.border}`,
              borderRadius: RADIUS.sm, color: C.text1, padding: '4px 7px', fontSize: 11,
            }} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={save} style={{ flex: 1, background: C.amber, border: 'none', borderRadius: RADIUS.sm, color: '#fff', padding: '4px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Set</button>
        <button onClick={onClose} style={{ flex: 1, background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text2, padding: '4px', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}