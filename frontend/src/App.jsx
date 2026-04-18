import { useState, useEffect } from 'react'
import { C, FONTS, RADIUS }    from './components/theme'
import PriceTicker              from './components/PriceTicker'
import DecisionCard             from './components/DecisionCard'
import EquityChart              from './components/EquityChart'
import HistoryTable             from './components/HistoryTable'
import FeatureChart             from './components/FeatureChart'
import Watchlist                from './components/Watchlist'
import AIChat                   from './components/AIChat'
import PortfolioTracker         from './components/PortfolioTracker'
import MarketHeatmap            from './components/MarketHeatmap'
import CandlestickChart         from './components/CandlestickChart'
import { useStockStream }       from './hooks/useStockStream'
import { useToasts, ToastContainer, toast } from './components/Toast'

if (!document.getElementById('cb-fonts')) {
  const l = document.createElement('link')
  l.id = 'cb-fonts'
  l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap'
  document.head.appendChild(l)
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.pageBg}; font-family: ${FONTS.sans}; -webkit-font-smoothing: antialiased; }
  input, button, select { font-family: ${FONTS.sans}; outline: none; }
  input:focus { border-color: ${C.blue} !important; box-shadow: 0 0 0 3px ${C.blue}20 !important; }
  ::-webkit-scrollbar       { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: ${C.inputBg}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${C.text3}; }
  a { text-decoration: none; color: inherit; }
  button { cursor: pointer; }
  @keyframes cb-spin     { to { transform: rotate(360deg); } }
  @keyframes cb-fade-in  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes cb-slide-in { from { transform: translateX(110%); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes cb-pulse    { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
`

const NAV = [
  { id: 'overview',  label: 'Dashboard',    icon: GridIcon   },
  { id: 'portfolio', label: 'My Wallet',    icon: WalletIcon },
  { id: 'backtest',  label: 'Trade',        icon: TradeIcon  },
  { id: 'heatmap',   label: 'Exchange',     icon: ExchIcon   },
  { id: 'history',   label: 'History',      icon: HistIcon   },
  { id: 'model',     label: 'Analytics',    icon: ChartIcon  },
  { id: 'ai',        label: 'AI Terminal',  icon: AIIcon     },
]

function GridIcon({ active }) {
  const c = active ? C.blue : C.text2
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function WalletIcon({ active }) {
  const c = active ? C.blue : C.text2
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <path d="M16 3H8L4 7h16l-4-4z"/><circle cx="17" cy="13" r="1" fill={c}/>
    </svg>
  )
}
function TradeIcon({ active }) {
  const c = active ? C.blue : C.text2
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16l5-5 4 4 5-6 4 4"/><path d="M22 6l-4 4"/>
    </svg>
  )
}
function ExchIcon({ active }) {
  const c = active ? C.blue : C.text2
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  )
}
function HistIcon({ active }) {
  const c = active ? C.blue : C.text2
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/>
    </svg>
  )
}
function ChartIcon({ active }) {
  const c = active ? C.blue : C.text2
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/>
    </svg>
  )
}
function AIIcon({ active }) {
  const c = active ? C.blue : C.text2
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}
function LogoIcon() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: `linear-gradient(135deg, ${C.blue}, #60A5FA)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 12px ${C.blue}40`,
      flexShrink: 0,
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" fill="white" fillOpacity="0.9"/>
        <path d="M12 8l4 2.5V16L12 18.5 8 16v-5.5L12 8z" fill="white" fillOpacity="0.5"/>
      </svg>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id) }, [])

  const isOpen = () => {
    const et   = new Date(time.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const day  = et.getDay(); const mins = et.getHours() * 60 + et.getMinutes()
    return day >= 1 && day <= 5 && mins >= 570 && mins < 960
  }
  const open = isOpen()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: open ? C.greenBg : C.redBg,
        border: `1px solid ${open ? '#BBF7D0' : '#FECACA'}`,
        borderRadius: RADIUS.full, padding: '4px 10px',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: open ? C.green : C.red,
          animation: open ? 'cb-pulse 2s infinite' : 'none',
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: open ? C.green : C.red }}>
          NYSE {open ? 'OPEN' : 'CLOSED'}
        </span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: C.text2, fontFamily: FONTS.mono }}>
        {time.toLocaleTimeString('en-US', { hour12: false })}
      </span>
    </div>
  )
}

export default function App() {
  const [symbol,   setSymbol]   = useState('AAPL')
  const [input,    setInput]    = useState('AAPL')
  const [tab,      setTab]      = useState('overview')
  const [sideOpen, setSideOpen] = useState(true)

  const { price, decision, connected, error } = useStockStream(symbol)
  const { toasts } = useToasts()

  useEffect(() => {
    if (!decision || decision.action === 'HOLD') return
    toast({ action: decision.action, symbol, message: decision.reason || `${decision.action} signal`, duration: 7000 })
  }, [decision])

  const selectSymbol = (s) => { setSymbol(s); setInput(s) }
  const handleSearch = (e) => { e.preventDefault(); const s = input.trim().toUpperCase(); if (s) selectSymbol(s) }

  const activeNav = tab

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', flexDirection: 'column' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── HEADER ── */}
      <header style={{
        height: 64,
        background: C.headerBg,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 20px 0 0',
        boxShadow: C.shadow,
        position: 'sticky', top: 0, zIndex: 200,
        flexShrink: 0,
      }}>
        {/* Logo area — same width as sidebar */}
        <div style={{
          width: 240, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px',
          borderRight: `1px solid ${C.border}`,
          height: '100%',
        }}>
          <LogoIcon />
          <span style={{ fontSize: 18, fontWeight: 800, color: C.text0, letterSpacing: '-0.03em' }}>
            Quant<span style={{ color: C.blue }}>AI</span>
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <SearchIcon />
          </div>
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="Search symbol…"
            style={{
              width: '100%',
              background: C.inputBg,
              border: `1.5px solid ${C.border}`,
              borderRadius: RADIUS.full,
              padding: '8px 14px 8px 38px',
              fontSize: 13, color: C.text1,
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          />
        </form>

        {/* Price ticker — inline header version */}
        <PriceTicker symbol={symbol} priceData={price} connected={connected} compact />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <LiveClock />

          {/* Bell */}
          <button style={{
            width: 38, height: 38, borderRadius: RADIUS.md,
            background: C.inputBg, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <BellIcon />
            {decision && decision.action !== 'HOLD' && (
              <div style={{
                position: 'absolute', top: 8, right: 8, width: 7, height: 7,
                borderRadius: '50%', background: C.red,
                border: `2px solid ${C.headerBg}`,
              }} />
            )}
          </button>

          {/* Profile avatar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.inputBg, border: `1px solid ${C.border}`,
            borderRadius: RADIUS.md, padding: '5px 12px 5px 8px',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.blue}, #60A5FA)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Q</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Analyst</span>
          </div>

          {/* CTA */}
          <button
            onClick={() => setTab('portfolio')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: C.blue, color: '#fff', border: 'none',
              borderRadius: RADIUS.md, padding: '8px 16px',
              fontSize: 13, fontWeight: 600,
              boxShadow: `0 4px 12px ${C.blue}40`,
              transition: 'all 0.15s',
            }}
          >
            <PlusIcon /> Add Position
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: 240, flexShrink: 0,
          background: C.sidebarBg,
          borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          boxShadow: '1px 0 0 #E2E8F0',
        }}>
          {/* Watchlist replaces the old "My Wallet" mini list */}
          <Watchlist activeSymbol={symbol} onSelect={selectSymbol} />

          {/* Navigation */}
          <nav style={{ padding: '4px 12px 12px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.text3,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '16px 8px 6px', fontFamily: FONTS.sans,
            }}>MAIN MENU</div>

            {NAV.slice(0, 4).map(item => (
              <NavItem key={item.id} item={item} active={activeNav === item.id} onClick={() => setTab(item.id)} />
            ))}

            <div style={{
              fontSize: 10, fontWeight: 700, color: C.text3,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '20px 8px 6px', fontFamily: FONTS.sans,
            }}>ANALYTICS</div>

            {NAV.slice(4).map(item => (
              <NavItem key={item.id} item={item} active={activeNav === item.id} onClick={() => setTab(item.id)} />
            ))}
          </nav>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{
          flex: 1, overflowY: 'auto', minWidth: 0,
          padding: '24px',
          display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'cb-fade-in 0.25s ease',
        }}>

          {/* Page title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {NAV.find(n => n.id === tab)?.label || 'Dashboard'}
              </h1>
              <p style={{ fontSize: 13, color: C.text2, marginTop: 3 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: C.redBg, border: `1px solid #FECACA`,
                borderRadius: RADIUS.md, padding: '6px 12px',
              }}>
                <span style={{ fontSize: 12, color: C.red }}>⚠ {error}</span>
              </div>
            )}
          </div>

          {/* ── TAB CONTENT ── */}

          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Top row: decision + AI */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <DecisionCard symbol={symbol} liveDecision={decision} />
                <AIChat symbol={symbol} decisionData={decision} />
              </div>
              {/* Chart */}
              <CandlestickChart symbol={symbol} trades={[]} />
            </div>
          )}

          {tab === 'portfolio' && <PortfolioTracker />}
          {tab === 'heatmap'   && <MarketHeatmap onSelect={selectSymbol} />}
          {tab === 'backtest'  && <EquityChart symbol={symbol} />}
          {tab === 'history'   && <HistoryTable symbol={symbol} />}
          {tab === 'model'     && <FeatureChart symbol={symbol} />}
          {tab === 'ai'        && <AIChat symbol={symbol} decisionData={decision} />}

        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '9px 12px',
        background: active ? C.blueLight : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${active ? C.blue : 'transparent'}`,
        borderRadius: `0 ${RADIUS.md} ${RADIUS.md} 0`,
        color: active ? C.blue : C.text2,
        fontSize: 13, fontWeight: active ? 700 : 500,
        fontFamily: FONTS.sans,
        cursor: 'pointer',
        marginBottom: 2,
        transition: 'all 0.15s',
        textAlign: 'left',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.inputBg; e.currentTarget.style.color = C.text1 } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.text2 } }}
    >
      <Icon active={active} />
      {item.label}
    </button>
  )
}