import { useState, useEffect } from 'react'
import PriceTicker   from './components/PriceTicker'
import DecisionCard  from './components/DecisionCard'
import EquityChart   from './components/EquityChart'
import HistoryTable  from './components/HistoryTable'
import FeatureChart  from './components/FeatureChart'
import Watchlist     from './components/Watchlist'
import { useStockStream } from './hooks/useStockStream'
import { useToasts, ToastContainer, toast } from './components/Toast'
import CandlestickChart from './components/CandlestickChart'
import logo from './assets/candleStick.png'

const TABS = ['overview', 'backtest', 'history', 'model']

export default function App() {
  const [symbol, setSymbol] = useState('AAPL')
  const [input,  setInput]  = useState('AAPL')
  const [tab,    setTab]    = useState('overview')

  const { price, decision, connected, error } = useStockStream(symbol)
  const { toasts } = useToasts()

  useEffect(() => {
    if (!decision) return
    if (decision.action === 'HOLD') return
    toast({
      action:   decision.action,
      symbol,
      message:  decision.reason || `${decision.action} signal for ${symbol}`,
      duration: 7000,
    })
  }, [decision])

  const handleSearch = (e) => {
    e.preventDefault()
    const s = input.trim().toUpperCase()
    if (s) { setSymbol(s); setInput(s) }
  }

  return (
    <div style={styles.root}>

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <img src={logo} alt="logo" style={styles.logoImg} />
          <span style={styles.logoText}>Quant AI</span>
        </div>

        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="Symbol…"
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>Go</button>
        </form>

        <PriceTicker symbol={symbol} priceData={price} connected={connected} />

        {error && <span style={{ color:'#ef4444', fontSize:12 }}>{error}</span>}
      </header>

      {/* ── Body: sidebar + main ── */}
      <div style={styles.body}>

        {/* Watchlist sidebar */}
        <Watchlist activeSymbol={symbol} onSelect={(s) => { setSymbol(s); setInput(s) }} />

        {/* Main panel */}
        <div style={styles.main}>

          {/* Tab bar */}
          <div style={styles.tabs}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ ...styles.tab, ...(t === tab ? styles.tabActive : {}) }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={styles.content}>
            {tab === 'overview' && (
             <div style={styles.grid}>
               <DecisionCard symbol={symbol} liveDecision={decision} />
               <CandlestickChart symbol={symbol} trades={[]} />
             </div>
            )}
            {tab === 'backtest' && <EquityChart symbol={symbol} />}
            {tab === 'history'  && <HistoryTable symbol={symbol} />}
            {tab === 'model'    && <FeatureChart symbol={symbol} />}
          </div>

        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  root:        { minHeight:'100vh', background:'#12121e', color:'#e0e0f0',
                 fontFamily:'system-ui,sans-serif', display:'flex', flexDirection:'column' },
  header:      { display:'flex', alignItems:'center', gap:20, padding:'12px 24px',
                 borderBottom:'1px solid #2a2a3e', flexWrap:'wrap', flexShrink:0 },
  logo:        { display:'flex', alignItems:'center', gap:8 },
  logoImg:     { width:32, height:32 },
  logoText:    { fontSize:18, fontWeight:700 },
  searchForm:  { display:'flex', gap:6 },
  searchInput: { background:'#2a2a3e', border:'1px solid #44445a', borderRadius:6,
                 color:'#e0e0f0', padding:'6px 12px', fontSize:14, width:110 },
  searchBtn:   { background:'#7c6af7', border:'none', borderRadius:6, color:'#fff',
                 padding:'6px 14px', fontSize:14, cursor:'pointer' },
  body:        { display:'flex', flex:1, overflow:'hidden' },
  main:        { flex:1, display:'flex', flexDirection:'column', overflow:'auto' },
  tabs:        { display:'flex', gap:4, padding:'0 24px', borderBottom:'1px solid #2a2a3e',
                 flexShrink:0 },
  tab:         { background:'none', border:'none', borderBottom:'2px solid transparent',
                 color:'#666', padding:'10px 16px', fontSize:14, cursor:'pointer' },
  tabActive:   { color:'#7c6af7', borderBottomColor:'#7c6af7' },
  content:     { padding:24, flex:1 },
  grid:        { display:'grid', gap:20, gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))' },
}