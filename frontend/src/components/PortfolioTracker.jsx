import { useState, useEffect } from 'react'
import { C, FONTS, RADIUS, Card, CardHeader } from './theme'
import { getPrice } from '../api/client'

const HUES = [C.blue, '#8B5CF6', C.amber, C.green, C.red, '#EC4899', '#14B8A6']
const DEFAULT = [
  { symbol: 'AAPL', shares: 10, avgCost: 175.0 },
  { symbol: 'NVDA', shares: 5,  avgCost: 420.0 },
  { symbol: 'TSLA', shares: 8,  avgCost: 240.0 },
]

export function PortfolioTracker() {
  const [positions, setPositions] = useState(DEFAULT)
  const [prices,    setPrices]    = useState({})
  const [newSym,    setNewSym]    = useState('')
  const [newShares, setNewShares] = useState('')
  const [newCost,   setNewCost]   = useState('')

  useEffect(() => {
    const syms = [...new Set(positions.map(p => p.symbol))]
    const f = () => syms.forEach(sym =>
      getPrice(sym).then(d => setPrices(p => ({ ...p, [sym]: d.price }))).catch(() => {})
    )
    f(); const id = setInterval(f, 12_000); return () => clearInterval(id)
  }, [positions])

  const add = () => {
    const s = newSym.trim().toUpperCase()
    if (!s || !newShares || !newCost) return
    setPositions(p => [...p, { symbol: s, shares: +newShares, avgCost: +newCost }])
    setNewSym(''); setNewShares(''); setNewCost('')
  }

  const rows = positions.map((p, i) => {
    const cur   = prices[p.symbol] || p.avgCost
    const value = p.shares * cur
    const cost  = p.shares * p.avgCost
    const pnl   = value - cost
    const pct   = cost > 0 ? (pnl / cost) * 100 : 0
    return { ...p, cur, value, cost, pnl, pct, color: HUES[i % HUES.length] }
  })

  const totalValue = rows.reduce((s, r) => s + r.value, 0)
  const totalCost  = rows.reduce((s, r) => s + r.cost, 0)
  const totalPnL   = totalValue - totalCost
  const totalPct   = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0
  const pnlC       = totalPnL >= 0 ? C.green : C.red

  return (
    <Card>
      <CardHeader
        title="Portfolio Tracker"
        right={
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 2 }}>TOTAL VALUE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text0, letterSpacing: '-0.02em' }}>
                ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 2 }}>TOTAL P&L</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: pnlC, letterSpacing: '-0.02em' }}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)} ({totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}%)
              </div>
            </div>
          </div>
        }
      />

      <div style={{ padding: 20 }}>
        {/* Allocation bar */}
        {rows.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Allocation</div>
            <div style={{ display: 'flex', height: 10, borderRadius: RADIUS.full, overflow: 'hidden', gap: 1 }}>
              {rows.map(r => (
                <div key={r.symbol} title={`${r.symbol}: ${totalValue > 0 ? ((r.value / totalValue) * 100).toFixed(1) : 0}%`}
                  style={{ flex: r.value, background: r.color, minWidth: r.value > 0 ? 3 : 0, transition: 'flex 0.5s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {rows.map(r => (
                <div key={r.symbol} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                  <span style={{ fontSize: 11, color: C.text2 }}>{r.symbol} {totalValue > 0 ? ((r.value / totalValue) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add row */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 20, padding: 14,
          background: C.inputBg, border: `1.5px solid ${C.border}`,
          borderRadius: RADIUS.lg, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text2, alignSelf: 'center', width: '100%', marginBottom: 4 }}>Add Position</span>
          {[
            { val: newSym, set: v => setNewSym(v.toUpperCase()), ph: 'Ticker', w: 90 },
            { val: newShares, set: setNewShares, ph: 'Shares', w: 80, type: 'number' },
            { val: newCost, set: setNewCost, ph: 'Avg Cost $', w: 110, type: 'number' },
          ].map(({ val, set, ph, w, type }) => (
            <input key={ph} value={val} onChange={e => set(e.target.value)} placeholder={ph} type={type}
              style={{
                width: w, background: C.cardBg,
                border: `1.5px solid ${C.border}`, borderRadius: RADIUS.md,
                color: C.text1, padding: '7px 10px', fontSize: 12, fontFamily: FONTS.sans,
              }} />
          ))}
          <button onClick={add} style={{
            background: C.blue, border: 'none', borderRadius: RADIUS.md,
            color: '#fff', padding: '7px 18px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', boxShadow: `0 4px 12px ${C.blue}30`,
          }}>+ Add</button>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.inputBg }}>
                {['', 'Symbol', 'Shares', 'Avg Cost', 'Current', 'Value', 'P&L', 'P&L %', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '9px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.text2 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = C.inputBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '11px 14px', width: 28 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color }} />
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text0 }}>{r.symbol}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{r.symbol} / USD</div>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: C.text1, fontFamily: FONTS.mono }}>{r.shares}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: C.text2, fontFamily: FONTS.mono }}>${r.avgCost.toFixed(2)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: C.text0, fontFamily: FONTS.mono }}>${r.cur.toFixed(2)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: C.text1, fontFamily: FONTS.mono }}>${r.value.toFixed(0)}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.pnl >= 0 ? C.green : C.red }}>
                      {r.pnl >= 0 ? '+' : ''}${r.pnl.toFixed(2)}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: r.pct >= 0 ? C.green : C.red,
                      background: r.pct >= 0 ? C.greenBg : C.redBg,
                      borderRadius: RADIUS.full, padding: '3px 8px',
                    }}>{r.pct >= 0 ? '+' : ''}{r.pct.toFixed(2)}%</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <button onClick={() => setPositions(p => p.filter((_, idx) => idx !== i))}
                      style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text2, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr style={{ background: C.inputBg, borderTop: `1.5px solid ${C.border}` }}>
                  <td colSpan={4} style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: C.text2 }}>TOTAL</td>
                  <td style={{ padding: '11px 14px' }}/>
                  <td style={{ padding: '11px 14px', fontSize: 14, fontWeight: 800, color: C.text0, fontFamily: FONTS.mono }}>
                    ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: pnlC }}>{totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pnlC, background: pnlC === C.green ? C.greenBg : C.redBg, borderRadius: RADIUS.full, padding: '3px 10px' }}>
                      {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(2)}%
                    </span>
                  </td>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.text3, fontSize: 14 }}>No positions added yet.</div>
        )}
      </div>
    </Card>
  )
}

export default PortfolioTracker