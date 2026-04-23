import { useState, useEffect, useRef } from 'react'
import { C, FONTS, RADIUS, THEME_CSS }  from './components/theme'
import { useTheme }                     from './hooks/useTheme'
import { ThemeToggle }                  from './components/ThemeToggle'
import AuthPage                         from './pages/AuthPage'
import OAuthCallbackPage                from './pages/OAuthCallbackPage'
import PriceTicker      from './components/PriceTicker'
import DecisionCard     from './components/DecisionCard'
import EquityChart      from './components/EquityChart'
import HistoryTable     from './components/HistoryTable'
import FeatureChart     from './components/FeatureChart'
import Watchlist        from './components/Watchlist'
import AIChat           from './components/AIChat'
import PortfolioTracker from './components/PortfolioTracker'
import MarketHeatmap    from './components/MarketHeatmap'
import CandlestickChart from './components/CandlestickChart'
import PaperTrading     from './components/PaperTrading'
import TradeIntelligence from './components/TradeIntelligence'
import DashboardOverview from './components/DashboardOverview'
import LandingPage from './pages/LandingPage'
import { useStockStream }                            from './hooks/useStockStream'
import { useToasts, ToastContainer, toast }          from './components/Toast'
import candleStickLogo                               from './assets/candleStick.png'

if (!document.getElementById('qai-fonts')) {
  const l = document.createElement('link')
  l.id   = 'qai-fonts'
  l.rel  = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap'
  document.head.appendChild(l)
}

const GLOBAL_CSS = `
  ${THEME_CSS}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-family: ${FONTS.sans}; -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
  body { background: var(--qai-page-bg); color: var(--qai-text0); }
  input, button, select, textarea { font-family: ${FONTS.sans}; outline: none; }
  input:focus {
    border-color: var(--qai-border-focus) !important;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--qai-blue) 20%, transparent) !important;
  }
  ::-webkit-scrollbar       { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--qai-input-bg); }
  ::-webkit-scrollbar-thumb { background: var(--qai-border); border-radius: 4px; }
  @keyframes cb-spin     { to { transform: rotate(360deg); } }
  @keyframes cb-fade-in  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes cb-slide-in { from { transform:translateX(110%); opacity:0; } to { transform:none; opacity:1; } }
  @keyframes cb-pulse    { 0%,100%{ opacity:1; } 50%{ opacity:.4; } }

  .qai-dashboard-shell { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  .qai-dashboard-body { display: flex; flex: 1; overflow: hidden; min-width: 0; min-height: 0; }
  .qai-dashboard-sidebar { height: 100%; overflow-y: auto; }
  .qai-dashboard-main { flex: 1; height: 100%; overflow-y: auto; min-width: 0; min-height: 0; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
  .qai-overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

  @media (max-width: 1100px) {
    .qai-dashboard-shell { min-height: 100vh; height: auto; overflow-x: hidden; overflow-y: auto; }
    .qai-dashboard-header { height: auto !important; padding: 12px 14px !important; gap: 12px !important; align-items: stretch !important; }
    .qai-dashboard-header-inner { width: 100%; flex-wrap: wrap; gap: 12px !important; padding: 0 !important; }
    .qai-dashboard-logo { width: auto !important; border-right: none !important; padding: 0 !important; height: auto !important; }
    .qai-dashboard-search { flex: 1 1 260px; max-width: none !important; min-width: 220px; }
    .qai-dashboard-actions { margin-left: 0 !important; width: 100%; justify-content: flex-end; flex-wrap: wrap; }
    .qai-dashboard-body { flex-direction: column; overflow: visible; min-height: auto; }
    .qai-dashboard-sidebar { width: 100% !important; max-height: none !important; border-right: none !important; border-bottom: 1px solid var(--qai-border); overflow: visible !important; height: auto !important; }
    .qai-dashboard-main { height: auto !important; padding: 16px !important; overflow: visible !important; }
    .qai-overview-grid { grid-template-columns: 1fr !important; }
    .qai-dashboard-topbar { flex-direction: column; align-items: flex-start !important; gap: 12px; }
  }

  @media (max-width: 720px) {
    .qai-dashboard-main { padding: 12px !important; gap: 14px !important; }
    .qai-dashboard-actions > * { flex: 1 1 100%; }
    .qai-dashboard-actions button { width: 100%; }
  }
`

function getStoredUser() {
  try { const u = localStorage.getItem('qai_user'); return u ? JSON.parse(u) : null } catch { return null }
}

function isOAuthCallback() {
  return window.location.pathname === '/oauth-callback'
}

export default function App() {
  const { isDark, toggle, theme, setTheme } = useTheme()
  const [user, setUser]     = useState(getStoredUser)
  const [authMode, setAuthMode] = useState(null)

  const handleAuthSuccess = (u) => {
    setUser(u)
    setAuthMode(null)
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/')
    }
  }

  const openLogin  = () => setAuthMode('login')
  const openSignup = () => setAuthMode('signup')
  const goToLanding = () => setAuthMode(null)

  const handleLogout = () => {
    localStorage.removeItem('qai_access')
    localStorage.removeItem('qai_refresh')
    localStorage.removeItem('qai_user')
    setUser(null)
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* OAuth callback intercept – highest priority */}
      {isOAuthCallback() && !user
        ? <OAuthCallbackPage onSuccess={handleAuthSuccess} />

        : !user && !authMode
          ? <LandingPage onLogin={openLogin} onSignup={openSignup} isDark={isDark} onToggleTheme={toggle} />

          : !user
            ? <AuthPage onSuccess={handleAuthSuccess} onBack={goToLanding} isDark={isDark} onToggle={toggle} initialMode={authMode} />

            : <Dashboard key={user?.id || user?.email || 'dashboard'} user={user} onLogout={handleLogout} isDark={isDark} toggle={toggle} theme={theme} setTheme={setTheme} />
      }
    </>
  )
}

const NAV = [
  { id: 'overview',     label: 'Dashboard',   icon: GridIcon   },
  { id: 'portfolio',    label: 'Portfolio',   icon: WalletIcon },
  { id: 'paper',        label: 'Paper Trade', icon: PaperIcon  },
  { id: 'backtest',     label: 'Backtest',    icon: TradeIcon  },
  { id: 'heatmap',      label: 'Heatmap',     icon: ExchIcon   },
  { id: 'history',      label: 'History',     icon: HistIcon   },
  { id: 'model',        label: 'Analytics',   icon: ChartIcon  },
  { id: 'ai',           label: 'AI Terminal', icon: AIIcon     },
  { id: 'intelligence', label: 'Trade Brief', icon: BrainIcon  },
]

const TAB_TO_PATH = {
  overview: '/dashboard',
  portfolio: '/dashboard/portfolio',
  paper: '/dashboard/paper-trade',
  backtest: '/dashboard/backtest',
  heatmap: '/dashboard/heatmap',
  history: '/dashboard/history',
  model: '/dashboard/analytics',
  ai: '/dashboard/ai-terminal',
  intelligence: '/dashboard/trade-brief',
}

const PATH_TO_TAB = Object.entries(TAB_TO_PATH).reduce((acc, [tabId, path]) => {
  acc[path] = tabId
  return acc
}, {})

const OPEN_IN_NEW_TAB_IDS = new Set(['paper', 'backtest', 'intelligence'])

function resolveTabFromPath(pathname) {
  if (PATH_TO_TAB[pathname]) return PATH_TO_TAB[pathname]
  if (pathname === '/') return 'overview'
  return 'overview'
}

function Dashboard({ user, onLogout, isDark, toggle, theme, setTheme }) {
  const [symbol, setSymbol]       = useState('AAPL')
  const [input,  setInput]        = useState('AAPL')
  const [tab,    setTab]          = useState(() => resolveTabFromPath(window.location.pathname))
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const mainRef = useRef(null)
  const lastDecisionRef = useRef({ symbol: '', action: '', reason: '', at: 0 })
  const lastPerfRef = useRef({ symbol: '', bucket: '', at: 0 })

  const { price, decision, connected, error } = useStockStream(symbol)
  const { toasts } = useToasts()

  const addNotification = ({ title, message, level = 'neutral' }) => {
    setNotifications(prev => {
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        message,
        level,
        symbol,
        read: false,
        timestamp: new Date().toISOString(),
      }
      return [item, ...prev].slice(0, 40)
    })
  }

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => (n.read ? n : { ...n, read: true })))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const unreadCount = notifications.reduce((count, n) => count + (n.read ? 0 : 1), 0)

  useEffect(() => {
    if (!decision?.action) return

    const action = String(decision.action).toUpperCase()
    const reason = (decision.reason || '').trim()
    const now = Date.now()
    const last = lastDecisionRef.current
    const duplicate =
      last.symbol === symbol &&
      last.action === action &&
      last.reason === reason &&
      now - last.at < 90000

    if (duplicate) return

    lastDecisionRef.current = { symbol, action, reason, at: now }

    if (action === 'BUY') {
      const msg = reason || `${symbol} looks strong. Best time to buy based on the current model output.`
      addNotification({ title: `${symbol}: Buy Opportunity`, message: msg, level: 'positive' })
      toast({ action: 'BUY', symbol, message: msg, duration: 7000 })
      return
    }

    if (action === 'SELL') {
      const msg = reason || `${symbol} momentum is weakening. Consider a sell or tighter risk control.`
      addNotification({ title: `${symbol}: Sell Alert`, message: msg, level: 'negative' })
      toast({ action: 'SELL', symbol, message: msg, duration: 7000 })
      return
    }

    const holdMsg = reason || `${symbol} is currently in hold mode. Wait for a stronger setup.`
    addNotification({ title: `${symbol}: Hold Signal`, message: holdMsg, level: 'neutral' })
  }, [decision, symbol])

  useEffect(() => {
    const changePct = Number(price?.change_pct)
    if (!Number.isFinite(changePct)) return

    const now = Date.now()
    const cooldownMs = 120000
    const bucket = changePct >= 2 ? 'booming' : changePct <= -2 ? 'terrible' : 'stable'

    if (bucket === 'stable') {
      lastPerfRef.current = { symbol, bucket: 'stable', at: now }
      return
    }

    const last = lastPerfRef.current
    const inCooldown =
      last.symbol === symbol &&
      last.bucket === bucket &&
      now - last.at < cooldownMs

    if (inCooldown) return

    lastPerfRef.current = { symbol, bucket, at: now }

    if (bucket === 'booming') {
      const msg = `${symbol} is booming (${changePct.toFixed(2)}% intraday). Momentum is strong.`
      addNotification({ title: `${symbol}: Strong Performance`, message: msg, level: 'positive' })
      toast({ action: 'BUY', symbol, message: msg, duration: 6000 })
      return
    }

    const msg = `${symbol} shows terrible performance (${changePct.toFixed(2)}% intraday). Watch your risk.`
    addNotification({ title: `${symbol}: Weak Performance`, message: msg, level: 'negative' })
    toast({ action: 'SELL', symbol, message: msg, duration: 6000 })
  }, [price, symbol])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [tab])

  useEffect(() => {
    const handlePopState = () => {
      setTab(resolveTabFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleTabOpenInNewTab = (nextTab) => {
    const nextPath = TAB_TO_PATH[nextTab]
    if (!nextPath) return

    if (!OPEN_IN_NEW_TAB_IDS.has(nextTab)) {
      setTab(nextTab)
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath)
      }
      return
    }

    const nextUrl = `${window.location.origin}${nextPath}`
    const popup = window.open(nextUrl, '_blank', 'noopener,noreferrer')

    // Fallback in case the browser blocks popups.
    if (!popup) {
      setTab(nextTab)
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath)
      }
    }
  }

  const selectSymbol = (s) => { setSymbol(s); setInput(s) }
  const handleSearch = (e) => { e.preventDefault(); const s = input.trim().toUpperCase(); if (s) selectSymbol(s) }

  const avatarInitial = (user.username || user.email || 'U')[0].toUpperCase()
  const hasAvatar     = !!user.avatar_url

  return (
    <div className="qai-dashboard-shell" style={{ background: C.pageBg }}>

      {/* ── HEADER ── */}
      <header className="qai-dashboard-header" style={{
        height: 64, background: C.headerBg, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px 0 0',
        boxShadow: C.shadow, position: 'sticky', top: 0, zIndex: 200, flexShrink: 0,
      }}>
        <div className="qai-dashboard-header-inner" style={{
          width: 240, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px', borderRight: `1px solid ${C.border}`, height: '100%',
        }}>
          <img src={candleStickLogo} alt="QuantAI" style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: C.text0, letterSpacing: '-0.03em' }}>
            Quant<span style={{ color: C.blue }}>AI</span>
          </span>
        </div>

        <form className="qai-dashboard-search" onSubmit={handleSearch} style={{ flex: 1, maxWidth: 340, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><SearchIcon /></div>
          <input value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="Search symbol…"
            style={{ width: '100%', background: C.inputBg, border: `1.5px solid ${C.border}`, borderRadius: RADIUS.full, padding: '8px 14px 8px 38px', fontSize: 13, color: C.text1 }} />
        </form>

        <PriceTicker symbol={symbol} priceData={price} connected={connected} compact />

        <div className="qai-dashboard-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <LiveClock />
          <ThemeToggle isDark={isDark} onToggle={toggle} />

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowNotifMenu(v => {
                  const next = !v
                  if (next) markAllNotificationsRead()
                  return next
                })
              }}
              style={{ width: 36, height: 36, borderRadius: RADIUS.md, background: C.inputBg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
              title="Notifications"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  minWidth: 16, height: 16, borderRadius: RADIUS.full,
                  background: C.red, color: '#fff', border: `2px solid ${C.headerBg}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, padding: '0 4px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            {showNotifMenu && (
              <>
                <div onClick={() => setShowNotifMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 289 }} />
                <div style={{
                  position: 'absolute', right: 0, top: 44, width: 360, maxHeight: 420,
                  zIndex: 290, background: C.cardBg, border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.lg, boxShadow: C.shadowLg, overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 12px', borderBottom: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.text0 }}>Notifications</div>
                      <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>AI signals and performance alerts</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={markAllNotificationsRead}
                        style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: '4px 8px', fontSize: 10, color: C.text2, cursor: 'pointer', fontWeight: 700 }}
                      >
                        Mark read
                      </button>
                      <button
                        onClick={clearNotifications}
                        style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: '4px 8px', fontSize: 10, color: C.red, cursor: 'pointer', fontWeight: 700 }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.length === 0 && (
                      <div style={{ padding: 14, fontSize: 12, color: C.text3 }}>
                        No alerts yet. Keep the stream running to receive buy/sell and momentum notifications.
                      </div>
                    )}

                    {notifications.map((n) => {
                      const tone = n.level === 'positive' ? C.green : n.level === 'negative' ? C.red : C.amber
                      return (
                        <div key={n.id} style={{
                          padding: '10px 12px', borderBottom: `1px solid ${C.border}`,
                          background: n.read ? 'transparent' : C.inputBg,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: tone }}>{n.title}</div>
                            <div style={{ fontSize: 10, color: C.text3, whiteSpace: 'nowrap' }}>
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: C.text2, marginTop: 5, lineHeight: 1.5 }}>{n.message}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: C.inputBg, border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md, padding: '5px 12px 5px 8px', cursor: 'pointer',
            }}>
              {/* avatar or gradient initials */}
              <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: hasAvatar ? 'transparent' : `linear-gradient(135deg, ${C.blue}, #60A5FA)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {hasAvatar
                  ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{avatarInitial}</span>
                }
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text1, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username || user.email}
              </span>
              {/* provider badge */}
              {user.auth_provider && user.auth_provider !== 'local' && (
                <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, background: C.blueLight, borderRadius: RADIUS.full, padding: '1px 6px' }}>
                  {user.auth_provider === 'google' ? 'G' : 'X'}
                </span>
              )}
              <span style={{ fontSize: 10, color: C.text3 }}>▾</span>
            </button>

            {showUserMenu && (
              <>
                <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 299 }} />
                <div style={{
                  position: 'absolute', right: 0, top: 44, width: 220, zIndex: 300,
                  background: C.cardBg, border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.lg, boxShadow: C.shadowLg, overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text0 }}>{user.full_name || user.username}</div>
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{user.email}</div>
                    {user.auth_provider && user.auth_provider !== 'local' && (
                      <div style={{ fontSize: 10, color: C.blue, marginTop: 4, fontWeight: 600 }}>
                        Signed in via {user.auth_provider}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setShowUserMenu(false); onLogout() }} style={{
                    width: '100%', padding: '11px 14px', background: 'none', border: 'none',
                    textAlign: 'left', fontSize: 13, color: C.red, cursor: 'pointer',
                    fontFamily: FONTS.sans, fontWeight: 600,
                  }}>Sign out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="qai-dashboard-body">
        <aside style={{ width: 240, flexShrink: 0, background: C.sidebarBg, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="qai-dashboard-sidebar">
          <Watchlist activeSymbol={symbol} onSelect={selectSymbol} />
          <nav style={{ padding: '4px 12px 12px' }}>
            <NavLabel>Main menu</NavLabel>
            {NAV.slice(0, 4).map(item => (
              <NavItem key={item.id} item={item} active={tab === item.id} onClick={() => handleTabOpenInNewTab(item.id)} />
            ))}
            <NavLabel style={{ marginTop: 16 }}>Analytics</NavLabel>
            {NAV.slice(4).map(item => (
              <NavItem key={item.id} item={item} active={tab === item.id} onClick={() => handleTabOpenInNewTab(item.id)} />
            ))}
          </nav>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.inputBg, marginTop: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Appearance</div>
            <div style={{ display: 'flex', background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: 3, gap: 3 }}>
              {[{ value: 'light', label: 'Light', sym: '☀' }, { value: 'dark', label: 'Dark', sym: '☽' }].map(opt => {
                const active = theme === opt.value
                return (
                  <button key={opt.value} onClick={() => setTheme(opt.value)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '5px 8px', borderRadius: RADIUS.sm, border: 'none',
                    background: active ? C.blue : 'transparent',
                    color: active ? '#fff' : C.text3,
                    fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 12 }}>{opt.sym}</span>{opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <main ref={mainRef} className="qai-dashboard-main" style={{ animation: 'cb-fade-in 0.25s ease' }}>
          <div className="qai-dashboard-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {NAV.find(n => n.id === tab)?.label || 'Dashboard'}
              </h1>
              <p style={{ fontSize: 13, color: C.text2, marginTop: 3 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {error && (
              <div style={{ background: C.redBg, border: `1px solid ${C.red}40`, borderRadius: RADIUS.md, padding: '6px 12px', fontSize: 12, color: C.red }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {tab === 'overview'     && <DashboardOverview symbol={symbol} liveDecision={decision} onSelectSymbol={selectSymbol} />}
          {tab === 'portfolio'    && <PortfolioTracker />}
          {tab === 'paper'        && <PaperTrading userId={user?.id} activeSymbol={symbol} liveDecision={decision} />}
          {tab === 'backtest'     && <EquityChart symbol={symbol} />}
          {tab === 'heatmap'      && <MarketHeatmap onSelect={selectSymbol} />}
          {tab === 'history'      && <HistoryTable userId={user?.id} symbol={symbol} />}
          {tab === 'model'        && <FeatureChart symbol={symbol} />}
          {tab === 'ai'           && <AIChat symbol={symbol} decisionData={decision} />}
          {tab === 'intelligence' && <TradeIntelligence symbol={symbol} />}
        </main>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  )
}

function NavLabel({ children, style }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px 8px 6px', ...style }}>{children}</div>
}
function NavItem({ item, active, onClick }) {
  const Icon = item.icon
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px',
      background: active ? C.blueLight : 'transparent', border:'none',
      borderLeft:`3px solid ${active ? C.blue : 'transparent'}`,
      borderRadius:`0 ${RADIUS.md} ${RADIUS.md} 0`,
      color: active ? C.blue : C.text2, fontSize:13, fontWeight: active?700:500,
      fontFamily:FONTS.sans, cursor:'pointer', marginBottom:2, textAlign:'left', transition:'all 0.15s',
    }}
    onMouseEnter={e=>{if(!active){e.currentTarget.style.background=C.inputBg;e.currentTarget.style.color=C.text1}}}
    onMouseLeave={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color=C.text2}}}
    >
      <Icon active={active}/>{item.label}
    </button>
  )
}
function LiveClock() {
  const [t,setT]=useState(new Date()); useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id)},[])
  const open=()=>{const e=new Date(t.toLocaleString('en-US',{timeZone:'America/New_York'}));const d=e.getDay(),m=e.getHours()*60+e.getMinutes();return d>=1&&d<=5&&m>=570&&m<960}
  const o=open()
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{display:'flex',alignItems:'center',gap:5,background:o?C.greenBg:C.redBg,border:`1px solid ${o?C.green:C.red}40`,borderRadius:RADIUS.full,padding:'4px 10px'}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:o?C.green:C.red,animation:o?'cb-pulse 2s infinite':'none'}}/>
        <span style={{fontSize:11,fontWeight:600,color:o?C.green:C.red}}>NYSE {o?'Open':'Closed'}</span>
      </div>
      <span style={{fontSize:12,fontWeight:500,color:C.text2,fontFamily:FONTS.mono}}>{t.toLocaleTimeString('en-US',{hour12:false})}</span>
    </div>
  )
}
function BrainIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>)}
function GridIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><rect x="3"y="3"width="7"height="7"rx="1"/><rect x="14"y="3"width="7"height="7"rx="1"/><rect x="3"y="14"width="7"height="7"rx="1"/><rect x="14"y="14"width="7"height="7"rx="1"/></svg>)}
function WalletIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H8L4 7h16l-4-4z"/><circle cx="17"cy="13"r="1"fill={c}/></svg>)}
function PaperIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16"y1="13"x2="8"y2="13"/><line x1="16"y1="17"x2="8"y2="17"/></svg>)}
function TradeIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M2 16l5-5 4 4 5-6 4 4"/><path d="M22 6l-4 4"/></svg>)}
function ExchIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>)}
function HistIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12"cy="12"r="9"/></svg>)}
function ChartIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/></svg>)}
function AIIcon({active}){const c=active?C.blue:C.text2;return(<svg width="18"height="18"viewBox="0 0 24 24"fill="none"stroke={c}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><circle cx="12"cy="12"r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>)}
function SearchIcon(){return(<svg width="15"height="15"viewBox="0 0 24 24"fill="none"stroke={C.text3}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><circle cx="11"cy="11"r="8"/><path d="m21 21-4.35-4.35"/></svg>)}
function BellIcon(){return(<svg width="17"height="17"viewBox="0 0 24 24"fill="none"stroke={C.text2}strokeWidth="2"strokeLinecap="round"strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>)}