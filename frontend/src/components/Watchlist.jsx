import { useState, useEffect } from 'react'
import { C, FONTS, RADIUS } from './theme'
import { getPrice } from '../api/client'
import { toast } from './Toast'

const DEFAULT_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL', 'AMZN']

export default function Watchlist({ activeSymbol, onSelect }) {
  const [symbols,   setSymbols]   = useState(DEFAULT_SYMBOLS)
  const [prices,    setPrices]    = useState({})
  const [newSym,    setNewSym]    = useState('')
  const [alertMap,  setAlertMap]  = useState({})
  const [showAlert, setShowAlert] = useState(null)
  const [showAdd,   setShowAdd]   = useState(false)

  useEffect(() => {
    const fetch_ = () =>
      symbols.forEach(sym =>
        getPrice(sym).then(d => setPrices(p => ({ ...p, [sym]: d }))).catch(() => {})
      )
    fetch_()
    const id = setInterval(fetch_, 10_000)
    return () => clearInterval(id)
  }, [symbols])

  useEffect(() => {
    Object.entries(alertMap).forEach(([sym, { above, below }]) => {
      const p = prices[sym]?.price
      if (!p) return
      if (above && p >= above) {
        toast({ title: `🔔 ${sym}`, message: `Price $${p.toFixed(2)} crossed $${above}`, action: 'BUY', symbol: sym })
        setAlertMap(a => { const n = { ...a }; delete n[sym]; return n })
      }
      if (below && p <= below) {
        toast({ title: `🔔 ${sym}`, message: `Price $${p.toFixed(2)} fell below $${below}`, action: 'SELL', symbol: sym })
        setAlertMap(a => { const n = { ...a }; delete n[sym]; return n })
      }
    })
  }, [prices, alertMap])

  const addSymbol = () => {
    const s = newSym.trim().toUpperCase()
    if (s && !symbols.includes(s)) setSymbols(p => [...p, s])
    setNewSym(''); setShowAdd(false)
  }

  const remove = (sym) => setSymbols(p => p.filter(s => s !== sym))

  const isMarketOpen = () => {
    const now = new Date()
    const et  = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const day = et.getDay(); const mins = et.getHours() * 60 + et.getMinutes()
    return day >= 1 && day <= 5 && mins >= 570 && mins < 960
  }

  return (
    <div style={{ padding: '16px 12px 8px' }}>
      {/* Section heading */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 8px', marginBottom: 10,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          WATCHLIST
        </span>
        <button
          onClick={() => setShowAdd(s => !s)}
          style={{
            background: C.blueLight, border: 'none', borderRadius: RADIUS.sm,
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.blue, fontSize: 16, cursor: 'pointer', fontWeight: 700, lineHeight: 1,
          }}
        >+</button>
      </div>

      {/* Add input */}
      {showAdd && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, padding: '0 2px' }}>
          <input
            value={newSym}
            onChange={e => setNewSym(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && addSymbol()}
            placeholder="TICKER"
            autoFocus
            style={{
              flex: 1, background: C.inputBg,
              border: `1.5px solid ${C.border}`,
              borderRadius: RADIUS.sm, color: C.text1,
              padding: '6px 10px', fontSize: 12,
              fontFamily: FONTS.sans, fontWeight: 600,
            }}
          />
          <button onClick={addSymbol} style={{
            background: C.blue, border: 'none', borderRadius: RADIUS.sm,
            color: '#fff', padding: '6px 10px', fontSize: 12, fontWeight: 700,
          }}>Add</button>
        </div>
      )}

      {/* Symbol list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {symbols.map(sym => {
          const d      = prices[sym]
          const active = sym === activeSymbol
          const chg    = d?.change_pct ?? null
          const up     = chg !== null && chg >= 0
          const hasAlert = !!alertMap[sym]

          return (
            <div key={sym}>
              <div
                onClick={() => onSelect(sym)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: RADIUS.md, cursor: 'pointer',
                  background: active ? C.blueLight : 'transparent',
                  borderLeft: `3px solid ${active ? C.blue : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.inputBg }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Symbol + price */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {/* Mini avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: active
                      ? `linear-gradient(135deg, ${C.blue}, #60A5FA)`
                      : `linear-gradient(135deg, ${C.text3}, ${C.text4})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>
                      {sym.slice(0, 2)}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? C.blue : C.text1, lineHeight: 1 }}>
                      {sym}
                    </div>
                    {d?.price && (
                      <div style={{ fontSize: 10, color: C.text2, marginTop: 1, fontFamily: FONTS.mono }}>
                        ${d.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: change + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {chg !== null && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: up ? C.green : C.red,
                      background: up ? C.greenBg : C.redBg,
                      borderRadius: RADIUS.full, padding: '1px 6px',
                    }}>
                      {up ? '+' : ''}{chg.toFixed(1)}%
                    </span>
                  )}
                  {hasAlert && <span style={{ fontSize: 11, color: C.amber }} title="Alert set">🔔</span>}
                  <button
                    onClick={e => { e.stopPropagation(); setShowAlert(showAlert === sym ? null : sym) }}
                    style={{ background: 'none', border: 'none', fontSize: 11, color: C.text3, cursor: 'pointer', padding: '0 1px' }}
                    title="Set alert"
                  >⚑</button>
                  <button
                    onClick={e => { e.stopPropagation(); remove(sym) }}
                    style={{ background: 'none', border: 'none', fontSize: 14, color: C.text3, cursor: 'pointer', lineHeight: 1, padding: '0 1px' }}
                  >×</button>
                </div>
              </div>

              {/* Alert panel */}
              {showAlert === sym && (
                <AlertPanel sym={sym} alertMap={alertMap} setAlertMap={setAlertMap} onClose={() => setShowAlert(null)} />
              )}
            </div>
          )
        })}
      </div>

      {/* Market status strip */}
      <div style={{
        margin: '16px 2px 0',
        background: C.inputBg, border: `1px solid ${C.border}`,
        borderRadius: RADIUS.md, padding: '10px 12px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          SYS STATUS
        </div>
        {[
          { label: 'NYSE', val: isMarketOpen() ? 'OPEN' : 'CLOSED', ok: isMarketOpen() },
          { label: 'DATA FEED', val: 'LIVE', ok: true },
          { label: 'ML ENGINE', val: 'READY', ok: true },
        ].map(({ label, val, ok }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.text2 }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: ok ? C.green : C.red,
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: ok ? C.green : C.red }}>
                {val}
              </span>
            </div>
          </div>
        ))}
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
      borderRadius: RADIUS.md, padding: '10px 12px', margin: '4px 0',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Price Alert — {sym}
      </div>
      {[
        { label: 'Above $', val: above, set: setAbove },
        { label: 'Below $', val: below, set: setBelow },
      ].map(({ label, val, set }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: C.text2, width: 50, flexShrink: 0 }}>{label}</span>
          <input
            type="number" value={val} onChange={e => set(e.target.value)} placeholder="—"
            style={{
              flex: 1, background: C.cardBg, border: `1.5px solid ${C.border}`,
              borderRadius: RADIUS.sm, color: C.text1, padding: '4px 8px',
              fontSize: 12, fontFamily: FONTS.sans,
            }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} style={{
          flex: 1, background: C.amber, border: 'none', borderRadius: RADIUS.sm,
          color: '#fff', padding: '5px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}>Set Alert</button>
        <button onClick={onClose} style={{
          flex: 1, background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
          color: C.text2, padding: '5px', fontSize: 11, cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  )
}