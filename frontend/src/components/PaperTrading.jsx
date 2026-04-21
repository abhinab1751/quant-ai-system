import { useState, useEffect, useMemo } from 'react'
import { C, FONTS, RADIUS, Card, CardHeader, Spinner, Badge } from './theme'
import { usePaperTrading } from '../hooks/usePaperTrading'

const pnlColor = (v) => v >= 0 ? C.green : C.red
const pnlBg    = (v) => v >= 0 ? C.greenBg : C.redBg
const pnlSign  = (v) => v >= 0 ? '+' : ''
const fmtUSD   = (v, dec = 2) => `$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
const fmtPct   = (v, dec = 2) => `${pnlSign(v)}${v.toFixed(dec)}%`


function Stat({ label, value, sub, color, style }) {
  return (
    <div style={{
      background: C.inputBg, border: `1px solid ${C.border}`,
      borderRadius: RADIUS.md, padding: '12px 16px',
      borderTop: color ? `3px solid ${color}` : undefined,
      ...style,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 5, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || C.text0, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
function OrderTicket({ symbol, pt, onClose }) {
  const [side,       setSide]       = useState('BUY')
  const [qty,        setQty]        = useState('')
  const [orderType,  setOrderType]  = useState('MARKET')
  const [limitPrice, setLimitPrice] = useState('')
  const [confirm,    setConfirm]    = useState(false)
  const [localErr,   setLocalErr]   = useState('')

  const isBuy        = side === 'BUY'
  const accentColor  = isBuy ? C.green : C.red
  const cash         = pt.portfolio?.cash || 0
  const estimatedCost = qty && limitPrice ? +qty * +limitPrice : null

  const validate = () => {
    if (!qty || +qty <= 0) return 'Enter a valid quantity'
    if (orderType === 'LIMIT' && (!limitPrice || +limitPrice <= 0)) return 'Enter a limit price'
    if (isBuy && orderType === 'MARKET' && +qty * 1 > cash) return 'Insufficient cash'
    return ''
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setLocalErr(err); return }
    if (!confirm) { setConfirm(true); return }
    setLocalErr('')
    try {
      await pt.submitOrder(symbol, side, +qty, orderType, limitPrice ? +limitPrice : null)
      setConfirm(false)
      setQty('')
      setLimitPrice('')
      onClose?.()
    } catch (e) {
      setLocalErr(e.message)
      setConfirm(false)
    }
  }

  const btnBg   = pt.orderLoading ? C.inputBg : (isBuy ? C.green : C.red)
  const btnTxt  = pt.orderLoading ? C.text2    : '#fff'

  return (
    <div style={{
      background: C.cardBg, border: `1.5px solid ${accentColor}30`,
      borderRadius: RADIUS.lg, padding: 20,
      boxShadow: C.shadowLg,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text0, letterSpacing: '-0.02em' }}>{symbol}</div>
          <div style={{ fontSize: 11, color: C.text2 }}>Paper Order Ticket</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text2, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
            ✕ Close
          </button>
        )}
      </div>

      {/* BUY / SELL toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: C.inputBg, borderRadius: RADIUS.md, padding: 3 }}>
        {['BUY', 'SELL'].map(s => (
          <button key={s} onClick={() => { setSide(s); setConfirm(false); setLocalErr('') }} style={{
            flex: 1, padding: '8px', fontSize: 13, fontWeight: 700,
            border: 'none', borderRadius: RADIUS.sm, cursor: 'pointer',
            background: side === s ? (s === 'BUY' ? C.green : C.red) : 'transparent',
            color: side === s ? '#fff' : C.text2,
            transition: 'all 0.15s',
            boxShadow: side === s ? `0 2px 8px ${s === 'BUY' ? C.green : C.red}40` : 'none',
          }}>{s}</button>
        ))}
      </div>

      {/* Order type */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: 'block', marginBottom: 5 }}>
          Order Type
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['MARKET', 'LIMIT'].map(t => (
            <button key={t} onClick={() => { setOrderType(t); setConfirm(false) }} style={{
              flex: 1, padding: '7px', fontSize: 12, fontWeight: 600,
              background: orderType === t ? C.blueLight : C.inputBg,
              border: `1.5px solid ${orderType === t ? C.blue : C.border}`,
              borderRadius: RADIUS.md, color: orderType === t ? C.blue : C.text2,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: 'block', marginBottom: 5 }}>
          Quantity (shares)
        </label>
        <input type="number" value={qty} onChange={e => { setQty(e.target.value); setConfirm(false) }}
          placeholder="0.00" min="0.001" step="0.001"
          style={{
            width: '100%', background: C.inputBg,
            border: `1.5px solid ${C.border}`, borderRadius: RADIUS.md,
            color: C.text0, padding: '9px 12px', fontSize: 14,
            fontFamily: FONTS.sans, fontWeight: 600,
          }} />
      </div>

      {/* Limit price (conditional) */}
      {orderType === 'LIMIT' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: 'block', marginBottom: 5 }}>
            Limit Price ($)
          </label>
          <input type="number" value={limitPrice} onChange={e => { setLimitPrice(e.target.value); setConfirm(false) }}
            placeholder="0.00" min="0.01" step="0.01"
            style={{
              width: '100%', background: C.inputBg,
              border: `1.5px solid ${C.border}`, borderRadius: RADIUS.md,
              color: C.text0, padding: '9px 12px', fontSize: 14,
              fontFamily: FONTS.sans, fontWeight: 600,
            }} />
        </div>
      )}

      {/* Cost preview */}
      {qty && +qty > 0 && (
        <div style={{
          background: C.inputBg, border: `1px solid ${C.border}`,
          borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: C.text2 }}>Est. {isBuy ? 'Cost' : 'Proceeds'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text0, fontFamily: FONTS.mono }}>
              {limitPrice ? fmtUSD(+qty * +limitPrice) : '(at market)'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.text2 }}>Available cash</span>
            <span style={{ fontSize: 11, color: C.text1, fontFamily: FONTS.mono }}>{fmtUSD(cash)}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {(localErr || pt.error) && (
        <div style={{
          background: C.redBg, border: `1px solid ${C.redBorder}`,
          borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 14,
          fontSize: 12, color: C.red, lineHeight: 1.4,
        }}>
          ⚠ {localErr || pt.error}
        </div>
      )}

      {/* Confirm / Submit */}
      {confirm && (
        <div style={{
          background: `${accentColor}10`, border: `1.5px solid ${accentColor}40`,
          borderRadius: RADIUS.md, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.text1,
        }}>
          Confirm: {side} <strong>{qty}</strong> shares of <strong>{symbol}</strong>
          {orderType === 'LIMIT' && ` @ $${limitPrice}`}
        </div>
      )}

      <button onClick={handleSubmit} disabled={pt.orderLoading} style={{
        width: '100%', padding: '11px', fontSize: 14, fontWeight: 800,
        background: btnBg, color: btnTxt, border: 'none',
        borderRadius: RADIUS.md, cursor: pt.orderLoading ? 'not-allowed' : 'pointer',
        letterSpacing: '0.03em', boxShadow: pt.orderLoading ? 'none' : `0 4px 16px ${accentColor}40`,
        transition: 'all 0.2s', fontFamily: FONTS.sans,
      }}>
        {pt.orderLoading ? 'Placing order…' : confirm ? `Confirm ${side}` : `${side} ${symbol}`}
      </button>

      {confirm && (
        <button onClick={() => setConfirm(false)} style={{
          width: '100%', padding: '8px', marginTop: 6, fontSize: 12,
          background: 'transparent', border: `1px solid ${C.border}`,
          borderRadius: RADIUS.md, color: C.text2, cursor: 'pointer', fontFamily: FONTS.sans,
        }}>Cancel</button>
      )}
    </div>
  )
}
function EquityCurveMini({ equity, initialCapital }) {
  if (!equity.length) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: C.text3, fontSize: 13 }}>
      No equity data yet — place your first trade.
    </div>
  )

  const W = 620, H = 140
  const pad = { t: 12, b: 28, l: 60, r: 12 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b
  const vals = equity.map(e => e.v)
  const mn = Math.min(...vals, initialCapital * 0.95)
  const mx = Math.max(...vals, initialCapital * 1.02)
  const rng = mx - mn || 1
  const xOf = i => pad.l + (i / (vals.length - 1 || 1)) * iw
  const yOf = v => pad.t + ih - ((v - mn) / rng) * ih
  const pts  = vals.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')
  const bl   = yOf(initialCapital)
  const last = vals[vals.length - 1]
  const lc   = last >= initialCapital ? C.green : C.red

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="pteq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={lc} stopOpacity="0.18" />
          <stop offset="100%" stopColor={lc} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0, 0.5, 1].map(f => {
        const y = pad.t + ih * (1 - f)
        const v = mn + rng * f
        return (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke={C.border} strokeWidth="0.5" />
            <text x={pad.l - 6} y={y + 4} textAnchor="end" fill={C.text3} fontSize={9} fontFamily={FONTS.sans}>
              ${Math.round(v).toLocaleString()}
            </text>
          </g>
        )
      })}
      {/* Baseline */}
      <line x1={pad.l} x2={W - pad.r} y1={bl} y2={bl} stroke={C.text3} strokeDasharray="5,4" strokeWidth="0.5" />
      {/* Area */}
      <polygon points={`${pad.l},${pad.t + ih} ${pts} ${xOf(vals.length - 1)},${pad.t + ih}`} fill="url(#pteq)" />
      {/* Line */}
      <polyline points={pts} fill="none" stroke={lc} strokeWidth="2" />
      {/* End dot */}
      <circle cx={xOf(vals.length - 1)} cy={yOf(last)} r={4} fill={lc} stroke={C.cardBg} strokeWidth="2" />
    </svg>
  )
}
export default function PaperTrading({ userId, activeSymbol = 'AAPL', liveDecision = null }) {
  const pt = usePaperTrading(userId)

  const [view,          setView]         = useState('dashboard') 
  const [showTicket,    setShowTicket]    = useState(false)
  const [showNewSession, setShowNewSession] = useState(false)
  const [newName,       setNewName]       = useState('')
  const [newCapital,    setNewCapital]    = useState(100_000)
  const [aiAutoTrade,   setAiAutoTrade]   = useState(false)

  useEffect(() => {
    if (!aiAutoTrade || !liveDecision || !pt.sessionId) return
    if (liveDecision.action === 'HOLD') return
    pt.submitAIOrder(
      activeSymbol,
      liveDecision.action,
      liveDecision.ml_confidence || 0.6,
      liveDecision.reason || '',
    ).catch(() => {})
  }, [liveDecision?.action, liveDecision?.timestamp])

  const pnlC = pt.portfolio ? pnlColor(pt.portfolio.total_pnl) : C.text1
  if (showNewSession) {
    return (
      <Card style={{ maxWidth: 440, margin: '0 auto', padding: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text0, marginBottom: 4 }}>New Paper Session</div>
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 20 }}>Start fresh with a virtual account.</div>
        {[
          { label: 'Session name', val: newName, set: setNewName, ph: 'e.g. Momentum Strategy', type: 'text' },
          { label: 'Starting capital ($)', val: newCapital, set: v => setNewCapital(+v), ph: '100000', type: 'number' },
        ].map(({ label, val, set, ph, type }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.text2, display: 'block', marginBottom: 5 }}>{label}</label>
            <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
              style={{
                width: '100%', background: C.inputBg, border: `1.5px solid ${C.border}`,
                borderRadius: RADIUS.md, color: C.text0, padding: '9px 12px', fontSize: 14, fontFamily: FONTS.sans,
              }} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={async () => {
            await pt.newSession(newName || 'Session', newCapital)
            setShowNewSession(false)
          }} style={{
            flex: 1, padding: '10px', background: C.blue, border: 'none', borderRadius: RADIUS.md,
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: FONTS.sans,
          }}>Create Session</button>
          <button onClick={() => setShowNewSession(false)} style={{
            flex: 1, padding: '10px', background: C.inputBg, border: `1px solid ${C.border}`,
            borderRadius: RADIUS.md, color: C.text2, fontSize: 13, cursor: 'pointer', fontFamily: FONTS.sans,
          }}>Cancel</button>
        </div>
      </Card>
    )
  }

  if (pt.loading && !pt.portfolio) return <Card><Spinner label="Loading paper account…" /></Card>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 2 }}>
            PAPER TRADING — {pt.activeSession?.name || 'No session'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text0, letterSpacing: '-0.02em' }}>
            {fmtUSD(pt.portfolio?.portfolio_value || 0, 0)}
            {pt.portfolio && (
              <span style={{ fontSize: 14, fontWeight: 700, color: pnlC, marginLeft: 10 }}>
                {pnlSign(pt.portfolio.total_pnl)}{fmtUSD(pt.portfolio.total_pnl)}
                {' '}({fmtPct(pt.portfolio.total_pnl_pct)})
              </span>
            )}
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* AI auto-trade toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: C.text2 }}>
            <div style={{
              width: 36, height: 20, borderRadius: 10, background: aiAutoTrade ? C.blue : C.border,
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }} onClick={() => setAiAutoTrade(v => !v)}>
              <div style={{
                position: 'absolute', top: 3, left: aiAutoTrade ? 18 : 3,
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: C.shadow,
              }} />
            </div>
            AI auto-trade
          </label>

          <button onClick={() => setShowTicket(v => !v)} style={{
            background: C.blue, border: 'none', borderRadius: RADIUS.md,
            color: '#fff', padding: '8px 16px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: `0 4px 12px ${C.blue}30`, fontFamily: FONTS.sans,
          }}>+ Order</button>

          <button onClick={() => setShowNewSession(true)} style={{
            background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
            color: C.text2, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: FONTS.sans,
          }}>New Session</button>

          <button onClick={pt.reset} style={{
            background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: RADIUS.md,
            color: C.red, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: FONTS.sans,
          }}>Reset</button>
        </div>
      </div>

      {/* ── Order ticket (collapsible) ── */}
      {showTicket && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <OrderTicket symbol={activeSymbol} pt={pt} onClose={() => setShowTicket(false)} />

          {/* Recent fill confirmation */}
          {pt.lastOrderResult?.status === 'FILLED' && (
            <Card style={{ padding: 20, borderTop: `3px solid ${C.green}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 8 }}>✓ Order Filled</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Symbol',  pt.lastOrderResult.symbol],
                  ['Side',    pt.lastOrderResult.side],
                  ['Qty',     pt.lastOrderResult.quantity],
                  ['Price',   `$${pt.lastOrderResult.fill_price}`],
                  ['Value',   fmtUSD(pt.lastOrderResult.value)],
                  ['P&L',     pt.lastOrderResult.realised_pnl ? `${pnlSign(pt.lastOrderResult.realised_pnl)}${fmtUSD(pt.lastOrderResult.realised_pnl)}` : '—'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10, color: C.text3, fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, fontFamily: FONTS.mono }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Metrics grid ── */}
      {pt.portfolio && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <Stat label="Cash"         value={fmtUSD(pt.portfolio.cash, 0)}            color={C.blue} />
          <Stat label="Positions"    value={fmtUSD(pt.portfolio.positions_value, 0)} color={C.text1} />
          <Stat label="Realised P&L" value={`${pnlSign(pt.portfolio.total_realised)}${fmtUSD(pt.portfolio.total_realised)}`} color={pnlC} />
          <Stat label="Win Rate"     value={`${pt.portfolio.win_rate.toFixed(0)}%`}  color={pt.portfolio.win_rate >= 50 ? C.green : C.red} sub={`${pt.portfolio.total_trades} trades`} />
          <Stat label="Today P&L"    value={fmtPct(pt.portfolio.daily_pnl_pct)}      color={pnlColor(pt.portfolio.daily_pnl_pct)} />
          <Stat label="Total Return" value={fmtPct(pt.portfolio.total_pnl_pct)}      color={pnlC} />
        </div>
      )}

      {/* ── Equity curve ── */}
      <Card>
        <CardHeader title="Portfolio Equity Curve" right={
          <span style={{ fontSize: 11, color: C.text3, fontFamily: FONTS.mono }}>
            Start: {fmtUSD(pt.activeSession?.initial_capital || 0, 0)}
          </span>
        } />
        <div style={{ padding: '12px 16px 16px' }}>
          <EquityCurveMini equity={pt.equity} initialCapital={pt.activeSession?.initial_capital || 100_000} />
        </div>
      </Card>

      {/* ── Sub-view tabs ── */}
      <Card>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {[
            ['dashboard', 'Positions'],
            ['trades',    'Trade History'],
            ['orders',    'Orders'],
          ].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              background: 'none', border: 'none',
              borderBottom: `2px solid ${view === v ? C.blue : 'transparent'}`,
              color: view === v ? C.blue : C.text2,
              padding: '10px 20px', fontSize: 12, fontWeight: view === v ? 700 : 500,
              cursor: 'pointer', fontFamily: FONTS.sans, transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>

        {/* Positions */}
        {view === 'dashboard' && (
          <PositionsTable positions={pt.portfolio?.positions || []} symbol={activeSymbol} pt={pt} />
        )}

        {/* Trade history */}
        {view === 'trades' && <TradesTable trades={pt.trades} />}

        {/* Orders */}
        {view === 'orders' && <OrdersTable orders={pt.orders} onCancel={pt.cancelPendingOrder} />}
      </Card>

    </div>
  )
}
function PositionsTable({ positions, symbol, pt }) {
  if (!positions.length) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: C.text3, fontSize: 13 }}>
      No open positions. Place an order to get started.
    </div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: C.inputBg }}>
            {['Symbol', 'Qty', 'Avg Cost', 'Current', 'Mkt Value', 'Unrealised P&L', 'Realised P&L', 'Quick Sell'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '9px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.text2 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map(p => {
            const uC = pnlColor(p.unrealised_pnl)
            const rC = pnlColor(p.realised_pnl)
            return (
              <tr key={p.symbol} style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.inputBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text0 }}>{p.symbol}</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>{p.symbol} / USD</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: FONTS.mono, color: C.text1 }}>{p.quantity}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: FONTS.mono, color: C.text2 }}>${p.avg_cost.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: FONTS.mono, fontWeight: 600, color: C.text0 }}>${p.current_price.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: FONTS.mono, color: C.text1 }}>{fmtUSD(p.market_value)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: uC }}>{pnlSign(p.unrealised_pnl)}{fmtUSD(p.unrealised_pnl)}</div>
                  <div style={{ fontSize: 11, color: uC }}>{fmtPct(p.unrealised_pct)}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: rC }}>{pnlSign(p.realised_pnl)}{fmtUSD(p.realised_pnl)}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => pt.submitOrder(p.symbol, 'SELL', p.quantity)}
                    disabled={pt.orderLoading}
                    style={{
                      background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: RADIUS.sm,
                      color: C.red, padding: '5px 12px', fontSize: 11, fontWeight: 700,
                      cursor: pt.orderLoading ? 'not-allowed' : 'pointer', fontFamily: FONTS.sans,
                    }}
                  >
                    Sell All
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
function TradesTable({ trades }) {
  if (!trades.length) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: C.text3, fontSize: 13 }}>
      No trades yet.
    </div>
  )

  return (
    <div style={{ overflowX: 'auto', maxHeight: 380, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <tr style={{ background: C.inputBg }}>
            {['Time', 'Symbol', 'Side', 'Qty', 'Fill Price', 'Value', 'P&L', 'Source'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '9px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.text2, background: C.inputBg }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map(t => {
            const isBuy = t.side === 'BUY'
            const ac    = isBuy ? C.green : C.red
            const pC    = pnlColor(t.pnl)
            return (
              <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.inputBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '9px 14px', fontSize: 11, color: C.text2, fontFamily: FONTS.mono, whiteSpace: 'nowrap' }}>
                  {new Date(t.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 800, color: C.text0 }}>{t.symbol}</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ac, background: isBuy ? C.greenBg : C.redBg, borderRadius: RADIUS.full, padding: '2px 10px' }}>
                    {t.side}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: FONTS.mono, color: C.text1 }}>{t.quantity}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: FONTS.mono, color: C.text1 }}>${t.fill_price.toFixed(2)}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: FONTS.mono, color: C.text1 }}>{fmtUSD(t.value)}</td>
                <td style={{ padding: '9px 14px' }}>
                  {t.pnl !== 0 ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: pC }}>
                      {pnlSign(t.pnl)}{fmtUSD(t.pnl)}
                    </span>
                  ) : <span style={{ color: C.text3, fontSize: 12 }}>—</span>}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: t.source === 'AI_SIGNAL' ? C.blue : C.text2,
                    background: t.source === 'AI_SIGNAL' ? C.blueLight : C.inputBg,
                    borderRadius: RADIUS.full, padding: '2px 8px',
                  }}>{t.source === 'AI_SIGNAL' ? 'AI' : 'Manual'}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
function OrdersTable({ orders, onCancel }) {
  if (!orders.length) return (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: C.text3, fontSize: 13 }}>
      No orders placed yet.
    </div>
  )

  const statusColor = { FILLED: C.green, PENDING: C.amber, CANCELLED: C.text3, REJECTED: C.red }

  return (
    <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0 }}>
          <tr style={{ background: C.inputBg }}>
            {['Time', 'Symbol', 'Side', 'Type', 'Qty', 'Limit $', 'Status', 'Source', ''].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '9px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.text2, background: C.inputBg }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const isBuy = o.side === 'BUY'
            const sc    = statusColor[o.status] || C.text2
            return (
              <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '9px 14px', fontSize: 11, color: C.text2, fontFamily: FONTS.mono, whiteSpace: 'nowrap' }}>
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 800, color: C.text0 }}>{o.symbol}</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isBuy ? C.green : C.red, background: isBuy ? C.greenBg : C.redBg, borderRadius: RADIUS.full, padding: '2px 10px' }}>
                    {o.side}
                  </span>
                </td>
                <td style={{ padding: '9px 14px', fontSize: 11, color: C.text2 }}>{o.order_type}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: FONTS.mono, color: C.text1 }}>{o.quantity}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: FONTS.mono, color: C.text1 }}>{o.limit_price ? `$${o.limit_price}` : '—'}</td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: `${sc}15`, borderRadius: RADIUS.full, padding: '2px 9px' }}>
                    {o.status}
                  </span>
                </td>
                <td style={{ padding: '9px 14px' }}>
                  <span style={{ fontSize: 10, color: o.source === 'AI_SIGNAL' ? C.blue : C.text2 }}>
                    {o.source === 'AI_SIGNAL' ? 'AI' : 'Manual'}
                  </span>
                </td>
                <td style={{ padding: '9px 14px' }}>
                  {o.status === 'PENDING' && (
                    <button onClick={() => onCancel(o.id)} style={{
                      background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
                      color: C.text2, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
                    }}>Cancel</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}