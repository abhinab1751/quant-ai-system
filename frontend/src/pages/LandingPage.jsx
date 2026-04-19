import { useState, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import candleStickLogo from '../assets/candleStick.png'
import mapIcon from '../assets/map.png'
import brainIcon from '../assets/brain.png'
import earthIcon from '../assets/earth.png'
import newsIcon from '../assets/news.png'
import bagIcon from '../assets/bag.png'
import strategyIcon from '../assets/Strategy.png'
import thunderIcon from '../assets/thunder.png'
import bullseyeIcon from '../assets/bullseye.png'

const LIGHT_T = {
  blue:'#2563EB', blueDark:'#1D4ED8', blueLight:'#EFF6FF',
  green:'#16A34A', greenBg:'#F0FDF4', red:'#DC2626', redBg:'#FEF2F2',
  text0:'#0F172A', text1:'#1E293B', text2:'#64748B', text3:'#94A3B8',
  border:'#E2E8F0', cardBg:'#FFFFFF', pageBg:'#F8FAFC', navBg:'#FFFFFF',
}
const DARK_T = {
  blue:'#E11D48', blueDark:'#BE123C', blueLight:'#2A1118',
  green:'#22C55E', greenBg:'#052E16', red:'#FB7185', redBg:'#3F0C18',
  text0:'#F5F5F5', text1:'#E5E5E5', text2:'#A3A3A3', text3:'#737373',
  border:'#262626', cardBg:'#0A0A0A', pageBg:'#050505', navBg:'#050505',
}
const F = {
  display:"'Plus Jakarta Sans', sans-serif",
  jp:"'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif",
  mono:"'JetBrains Mono', monospace",
}

if (typeof document !== 'undefined' && !document.getElementById('lp-fonts')) {
  const l = document.createElement('link')
  l.id = 'lp-fonts'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap'
  document.head.appendChild(l)
}

const MARKET_SYMBOLS = [
  { symbol:'AAPL',        name:'Apple',    flag:'🇺🇸', exchange:'NASDAQ' },
  { symbol:'MSFT',        name:'Microsoft',flag:'🇺🇸', exchange:'NASDAQ' },
  { symbol:'NVDA',        name:'NVIDIA',   flag:'🇺🇸', exchange:'NASDAQ' },
  { symbol:'TSLA',        name:'Tesla',    flag:'🇺🇸', exchange:'NASDAQ' },
  { symbol:'RELIANCE.NS', name:'Reliance', flag:'🇮🇳', exchange:'NSE'    },
  { symbol:'INFY.NS',     name:'Infosys',  flag:'🇮🇳', exchange:'NSE'    },
  { symbol:'HSBA.L',      name:'HSBC',     flag:'🇬🇧', exchange:'LSE'    },
  { symbol:'^GSPC',       name:'S&P 500',  flag:'🇺🇸', exchange:'INDEX'  },
  { symbol:'^NSEI',       name:'NIFTY 50', flag:'🇮🇳', exchange:'INDEX'  },
]

const FEATURES = [
  { icon:'brain', title:'AI-Powered Signals', desc:'Ensemble ML model analyses 21 technical indicators and news sentiment to deliver clear BUY / HOLD / SELL signals with confidence scores — no guesswork.' },
  { icon:'earth', title:'25+ Global Exchanges', desc:'NYSE, NASDAQ, NSE, BSE, LSE, TSE, HKEX, XETRA, ASX and more. Track any stock worldwide with live prices in native and USD currency.' },
  { icon:'news', title:'News Sentiment Analysis', desc:'FinBERT NLP reads every article about your stocks and scores it Bullish, Bearish, or Neutral so you know exactly what the market is reacting to.' },
  { icon:'bag', title:'Paper Trading', desc:'Practice with $100K virtual capital. Place market and limit orders, track P&L in real time, and benchmark vs buy-and-hold — completely risk-free.' },
  { icon:'strategy', title:'Strategy Backtesting', desc:'Walk-forward backtest on 2 years of historical data. See Sharpe ratio, max drawdown, win rate, and a full trade log before risking real money.' },
  { icon:'thunder', title:'Live Price Streaming', desc:'WebSocket streaming updates every 5 seconds. Set price alerts and get instant notifications the moment your threshold is crossed.' },
]

const STATS = [
  { value:'25+',  label:'Global Exchanges' },
  { value:'200+', label:'Stocks Covered'   },
  { value:'21',   label:'ML Features'      },
  { value:'2yr',  label:'Backtest Window'  },
]

const STEPS = [
  { num:'01', title:'Create your account',  desc:'Sign up free in under 30 seconds. No credit card required.' },
  { num:'02', title:'Search any stock',      desc:'Search by ticker across NYSE, NSE, LSE, TSE and 20+ other exchanges.' },
  { num:'03', title:'Get AI signals',        desc:'Instantly see ML predictions, sentiment scores, and decision confidence.' },
  { num:'04', title:'Trade or backtest',     desc:'Paper trade with virtual money or backtest on 2 years of historical data.' },
]

const UNIQUE = [
  { title:'Not just charts — decisions', desc:'Most platforms show data and leave thinking to you. QuantAI synthesises ML, sentiment, and market mood into one actionable signal.', icon:'bullseye', dark:false },
  { title:'Multi-market in one view',    desc:'Switch between US stocks, Indian NSE/BSE, Tokyo TSE, London LSE and more without switching tabs, apps, or accounts.',              icon:'map', dark:true  },
  { title:'Free, no paywalls',           desc:'Core features including AI signals, live prices, paper trading, and backtesting are 100% free. No hidden fees, no premium tiers.', icon:'🆓', dark:false },
]

const ICON_MAP = {
  brain: brainIcon,
  earth: earthIcon,
  news: newsIcon,
  bag: bagIcon,
  strategy: strategyIcon,
  thunder: thunderIcon,
  map: mapIcon,
  bullseye: bullseyeIcon,
}

const FALLBACK_NEWS = [
  { title:'Federal Reserve signals cautious approach to rate cuts as inflation persists',              source:'Reuters',   publishedAt: new Date().toISOString() },
  { title:'NVIDIA earnings beat expectations as AI chip demand continues to accelerate globally',     source:'Bloomberg', publishedAt: new Date().toISOString() },
  { title:"India's NSE hits record highs on strong FII inflows and robust GDP data",                 source:'ET Markets',publishedAt: new Date().toISOString() },
  { title:'Apple announces record buyback program amid strong services revenue growth quarter',       source:'WSJ',       publishedAt: new Date().toISOString() },
  { title:'European markets steady as ECB holds rates and watches incoming inflation data',           source:'FT',        publishedAt: new Date().toISOString() },
  { title:'Tesla deliveries disappoint as competition intensifies across global EV market',           source:"Barron's",  publishedAt: new Date().toISOString() },
]

function shortSym(s){ return s.replace('.NS','').replace('.BO','').replace('.L','').replace('.T','').replace('.HK','').replace('.DE','').replace('^','') }

export default function LandingPage({ onLogin, onSignup, isDark = false, onToggleTheme }) {
  const rootRef = useRef(null)
  const lenisRef = useRef(null)
  const [email,       setEmail]       = useState('')
  const [prices,      setPrices]      = useState({})
  const [prevPrices,  setPrevPrices]  = useState({})
  const [news,        setNews]        = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [marketTab,   setMarketTab]   = useState('popular')
  const [scrolled,    setScrolled]    = useState(false)
  const T = isDark ? DARK_T : LIGHT_T
  const displayFont = isDark ? F.jp : F.display

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    window.scrollTo(0, 0)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      const fallback = () => {
        const y = window.scrollY || 0
        const h = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        root.style.setProperty('--lp-progress', (y / h).toFixed(4))
        root.style.setProperty('--lp-velocity', '0')
        setScrolled(y > 10)
      }
      fallback()
      window.addEventListener('scroll', fallback, { passive: true })
      return () => window.removeEventListener('scroll', fallback)
    }

    const lenis = new Lenis({
      duration: 1.55,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 0.75,
      touchMultiplier: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 5),
    })

    lenisRef.current = lenis
    lenis.scrollTo(0, { immediate: true })
    lenis.on('scroll', ({ scroll, limit, velocity }) => {
      const progress = limit > 0 ? scroll / limit : 0
      const v = Math.max(-1.5, Math.min(1.5, (velocity || 0) / 28))
      root.style.setProperty('--lp-progress', progress.toFixed(4))
      root.style.setProperty('--lp-velocity', v.toFixed(3))
      setScrolled(scroll > 10)
    })

    let raf = 0
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset: -64, duration: 1.25 })
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const fetch_ = async () => {
      for (const m of MARKET_SYMBOLS) {
        try {
          const r = await fetch(`/api/market/price?symbol=${m.symbol}`)
          if (!r.ok) continue
          const d = await r.json()
          if (d.price != null) {
            setPrevPrices(p => ({ ...p, [m.symbol]: p[m.symbol] ?? d.price }))
            setPrices(p => {
              const prev = p[m.symbol]
              if (prev !== undefined) setPrevPrices(pp => ({ ...pp, [m.symbol]: prev }))
              return { ...p, [m.symbol]: d.price }
            })
          }
        } catch {}
      }
    }
    fetch_()
    const id = setInterval(fetch_, 20_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('/api/news/AAPL')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const arr = Array.isArray(d) ? d : (d.articles || [])
          if (arr.length) setNews(arr.slice(0, 6))
        }
      })
      .catch(() => {})
      .finally(() => setNewsLoading(false))
  }, [])

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-scroll-fx]'))
    if (!nodes.length) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      nodes.forEach(el => el.classList.add('scroll-fx-in'))
      return
    }

    nodes.forEach((el, idx) => {
      el.classList.add('scroll-fx')
      el.style.setProperty('--scroll-delay', `${Math.min(idx * 55, 320)}ms`)
    })

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-fx-in')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.16, rootMargin: '0px 0px -10% 0px' })

    nodes.forEach(el => observer.observe(el))

    let raf = 0
    const updateDepth = () => {
      const vh = window.innerHeight || 1
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect()
        const relative = (r.top + r.height * 0.5 - vh * 0.5) / vh
        const clamped = Math.max(-1, Math.min(1, relative))
        el.style.setProperty('--scroll-shift', `${clamped * -22}px`)
      })
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        updateDepth()
      })
    }

    updateDepth()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const displayNews    = news.length > 0 ? news : FALLBACK_NEWS
  const popularSymbols = MARKET_SYMBOLS.filter(m => m.exchange !== 'INDEX')
  const indexSymbols   = MARKET_SYMBOLS.filter(m => m.exchange === 'INDEX')
  const displaySymbols = marketTab === 'popular' ? popularSymbols : indexSymbols

  const pctFor = (sym) => {
    const p = prices[sym], pp = prevPrices[sym]
    if (p == null || pp == null || pp === 0) return null
    return ((p - pp) / pp) * 100
  }

  return (
    <div ref={rootRef} id="lp-root" style={{ fontFamily: displayFont, background: T.pageBg, minHeight:'100vh', overflowX:'hidden', '--lp-progress': 0, '--lp-velocity': 0 }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        a { text-decoration:none; }
        .btn-primary { background:${T.blue}; color:#fff; border:none; border-radius:10px; padding:12px 26px; font-size:14px; font-weight:700; cursor:pointer; font-family:${displayFont}; transition:all .2s; }
        .btn-primary:hover { background:${T.blueDark}; transform:translateY(-1px); box-shadow:0 8px 24px ${T.blue}50; }
        .btn-outline { background:transparent; color:${T.blue}; border:1.5px solid ${T.blue}; border-radius:10px; padding:11px 22px; font-size:14px; font-weight:700; cursor:pointer; font-family:${displayFont}; transition:all .2s; }
        .btn-outline:hover { background:${T.blueLight}; }
        .nav-a { font-size:14px; font-weight:600; color:${T.text1}; cursor:pointer; transition:color .15s; background:none; border:none; padding:0; font-family:${displayFont}; }
        .nav-a:hover { color:${T.blue}; }
        .card { background:${T.cardBg}; border:1px solid ${T.border}; border-radius:16px; padding:26px; transition:box-shadow .2s, transform .2s; }
        .card:hover { box-shadow:0 8px 32px rgba(37,99,235,.1); transform:translateY(-3px); }
        .news-card { background:${T.cardBg}; border:1px solid ${T.border}; border-radius:14px; padding:20px 22px; cursor:pointer; transition:box-shadow .2s,transform .2s; }
        .news-card:hover { box-shadow:0 6px 24px rgba(15,23,42,.08); transform:translateY(-2px); }
        .section-eyebrow { font-size:11px; font-weight:700; color:${T.blue}; letter-spacing:.12em; text-transform:uppercase; margin-bottom:12px; }
        .section-h2 { font-family:${displayFont}; font-size:clamp(26px,3.5vw,42px); font-weight:900; color:${T.text0}; letter-spacing:-.03em; margin-bottom:14px; }
        .section-sub { font-size:15px; color:${T.text2}; line-height:1.7; }
        .scroll-fx {
          opacity: 0;
          transform: translate3d(0, 28px, 0) scale(.985);
          filter: blur(7px);
          transition:
            opacity .75s cubic-bezier(.22,1,.36,1) var(--scroll-delay, 0ms),
            transform .9s cubic-bezier(.22,1,.36,1) var(--scroll-delay, 0ms),
            filter .8s ease var(--scroll-delay, 0ms);
          will-change: transform, opacity, filter;
        }
        .scroll-fx.scroll-fx-in {
          opacity: 1;
          transform: translate3d(0, var(--scroll-shift, 0px), 0) scale(1);
          filter: blur(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .scroll-fx, .scroll-fx.scroll-fx-in {
            opacity: 1;
            transform: none;
            filter: none;
            transition: none;
          }
        }
        #lp-root {
          position: relative;
          isolation: isolate;
        }
        .lp-atmo {
          position: fixed;
          inset: -18vh -10vw;
          z-index: 0;
          pointer-events: none;
          opacity: ${isDark ? 0.48 : 0.62};
          will-change: transform, opacity;
          transform:
            translate3d(
              calc((var(--lp-progress, 0) - .5) * -5vw),
              calc((var(--lp-progress, 0) - .5) * -8vh),
              0
            )
            rotate(calc(var(--lp-velocity, 0) * 2.8deg));
          transition: transform .18s ease-out;
          background:
            radial-gradient(35vw 35vw at 14% 18%, ${isDark ? 'rgba(225,29,72,0.22)' : 'rgba(37,99,235,0.16)'}, transparent 66%),
            radial-gradient(28vw 28vw at 84% 24%, ${isDark ? 'rgba(251,113,133,0.18)' : 'rgba(99,102,241,0.12)'}, transparent 68%),
            radial-gradient(40vw 40vw at 52% 82%, ${isDark ? 'rgba(34,197,94,0.11)' : 'rgba(14,165,233,0.10)'}, transparent 70%);
        }
        .lp-atmo::after {
          content: '';
          position: absolute;
          inset: 0;
          opacity: ${isDark ? 0.12 : 0.09};
          background-image:
            linear-gradient(120deg, transparent 0%, rgba(255,255,255,.65) 48%, transparent 100%);
          transform: translateX(calc(var(--lp-progress, 0) * 22vw - 11vw));
          transition: transform .22s ease-out;
        }
        #lp-root > :not(.lp-atmo) {
          position: relative;
          z-index: 1;
        }
      `}</style>
      <div className="lp-atmo" aria-hidden="true" />

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:200, background:T.navBg, borderBottom:`1px solid ${T.border}`, boxShadow: scrolled ? (isDark ? '0 2px 16px rgba(0,0,0,.55)' : '0 2px 16px rgba(15,23,42,.07)') : 'none', transition:'box-shadow .2s' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', gap:36, padding:'0 32px', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0 }}>
            <img
              src={candleStickLogo}
              alt="QuantAI"
              style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }}
            />
            <span style={{ fontSize:19, fontWeight:900, color:T.text0, letterSpacing:'-.04em' }}>Quant<span style={{ color:T.blue }}>AI</span></span>
          </div>
          <div style={{ display:'flex', gap:28, flex:1 }}>
            {[['Features','features'],['Markets','markets'],['How It Works','how-it-works'],['Why QuantAI','why-quantai']].map(([l,id]) => (
              <button key={l} className="nav-a" onClick={() => scrollToSection(id)}>{l}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, flexShrink:0 }}>
            <button
              type="button"
              onClick={onToggleTheme}
              style={{
                background: isDark ? '#111111' : T.blueLight,
                color: T.text1,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: '11px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: displayFont,
                whiteSpace: 'nowrap',
              }}
            >
              {isDark ? 'Kuro Mode' : 'Light Mode'}
            </button>
            <button className="btn-outline" onClick={onLogin}>Log In</button>
            <button className="btn-primary" onClick={onSignup}>Sign Up Free</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section data-scroll-fx style={{ background:T.cardBg, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 420px', gap:56, padding:'72px 32px 64px', alignItems:'start' }}>

          {/* Left */}
          <div style={{ animation:'fadeUp .6s both' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:T.blueLight, borderRadius:100, padding:'6px 14px', border:`1px solid #BFDBFE`, marginBottom:28 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:T.blue }} />
              <span style={{ fontSize:11, fontWeight:700, color:T.blue, letterSpacing:'.06em' }}>AI-POWERED TRADING INTELLIGENCE</span>
            </div>

            <h1 style={{ fontFamily:displayFont, fontSize:'clamp(36px,5vw,64px)', fontWeight:900, color:T.text0, lineHeight:1.05, letterSpacing:'-.04em', marginBottom:20 }}>
              Trade Smarter,<br />
              <span style={{ color:T.blue }}>Not Harder</span><br />
              with QuantAI
            </h1>

            <p style={{ fontSize:17, color:T.text2, lineHeight:1.7, maxWidth:500, marginBottom:36 }}>
              The world's most intelligent stock analysis platform. Get real-time AI signals, multi-market coverage across 25+ exchanges, live sentiment analysis, and risk-free paper trading — all in one dashboard.
            </p>

            <form onSubmit={e => { e.preventDefault(); onSignup() }} style={{ display:'flex', gap:10, marginBottom:36, maxWidth:500 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                style={{ flex:1, background:T.pageBg, border:`1.5px solid ${T.border}`, borderRadius:10, padding:'12px 16px', fontSize:14, color:T.text0, fontFamily:displayFont, outline:'none' }}
                onFocus={e=>e.target.style.borderColor=T.blue}
                onBlur={e=>e.target.style.borderColor=T.border}
              />
              <button type="submit" className="btn-primary" style={{ whiteSpace:'nowrap', padding:'12px 28px' }}>Get Started Free</button>
            </form>

            <div style={{ display:'flex', gap:36, flexWrap:'wrap' }}>
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <div style={{ fontFamily:displayFont, fontSize:28, fontWeight:900, color:T.blue, letterSpacing:'-.03em' }}>{value}</div>
                  <div style={{ fontSize:12, color:T.text2, fontWeight:600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — market panel */}
          <div style={{ background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:20, overflow:'hidden', boxShadow:'0 8px 40px rgba(15,23,42,.09)', animation:'fadeUp .6s .15s both' }}>
            {/* Tabs */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', gap:20 }}>
                {[['popular','Popular'],['indices','Indices']].map(([k,l]) => (
                  <button key={k} onClick={() => setMarketTab(k)} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:displayFont, fontSize:14, fontWeight:700, color: marketTab===k ? T.text0 : T.text3, borderBottom: marketTab===k ? `2px solid ${T.blue}` : '2px solid transparent', paddingBottom:6, transition:'color .15s' }}>{l}</button>
                ))}
              </div>
                <button onClick={onSignup} style={{ background:'none', border:'none', fontSize:12, color:T.blue, fontWeight:700, cursor:'pointer', fontFamily:displayFont }}>View All →</button>
            </div>

            {/* Column headers */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 70px', padding:'8px 20px', borderBottom:`1px solid ${T.border}` }}>
              {['Name','Price','Change'].map((h,i) => (
                <div key={h} style={{ fontSize:10, color:T.text3, fontWeight:700, textAlign:i>0?'right':'left', letterSpacing:'.06em' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ padding:'0 20px' }}>
              {displaySymbols.map(item => {
                const p   = prices[item.symbol]
                const pct = pctFor(item.symbol)
                const up  = pct !== null && pct >= 0
                return (
                  <div key={item.symbol} style={{ display:'grid', gridTemplateColumns:'1fr 90px 70px', alignItems:'center', padding:'11px 0', borderBottom:`1px solid ${T.border}`, cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.pageBg}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ fontSize:14 }}>{item.flag}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:T.text0 }}>{shortSym(item.symbol)}</div>
                        <div style={{ fontSize:10, color:T.text3 }}>{item.name}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text0, textAlign:'right', fontFamily:F.mono }}>
                      {p != null ? `$${p.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—'}
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color: pct==null ? T.text3 : up ? T.green : T.red, textAlign:'right', fontFamily:F.mono }}>
                      {pct!=null ? `${pct>=0?'+':''}${pct.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                )
              })}
              <div style={{ padding:'12px 0 4px' }}>
                <button onClick={onSignup} style={{ width:'100%', padding:'11px', background:T.blueLight, border:`1px solid ${isDark ? '#4C1D27' : '#BFDBFE'}`, borderRadius:10, color:T.blue, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:displayFont }}
                  onMouseEnter={e=>e.currentTarget.style.background=isDark ? '#3A121E' : '#DBEAFE'}
                  onMouseLeave={e=>e.currentTarget.style.background=T.blueLight}
                >Start tracking markets →</button>
              </div>
            </div>

            {/* Mini news in panel */}
            <div style={{ borderTop:`1px solid ${T.border}`, padding:'14px 20px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span style={{ fontSize:14, fontWeight:800, color:T.text0, fontFamily:displayFont }}>Market News</span>
                <button onClick={onSignup} style={{ background:'none', border:'none', fontSize:12, color:T.blue, fontWeight:700, cursor:'pointer', fontFamily:displayFont }}>View All →</button>
              </div>
              {newsLoading ? (
                <div style={{ textAlign:'center', padding:'16px 0' }}><div style={{ display:'inline-block', width:20, height:20, border:`2px solid ${T.border}`, borderTop:`2px solid ${T.blue}`, borderRadius:'50%', animation:'spin .7s linear infinite' }} /></div>
              ) : (
                displayNews.slice(0,4).map((a,i) => (
                  <div key={i} style={{ padding:'9px 0', borderBottom: i<3 ? `1px solid ${T.border}` : 'none', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.querySelector('div').style.color=T.blue}
                    onMouseLeave={e=>e.currentTarget.querySelector('div').style.color=T.text1}
                  >
                    <div style={{ fontSize:12, color:T.text1, lineHeight:1.45, fontWeight:500, transition:'color .15s' }}>{a.title}</div>
                    <div style={{ fontSize:10, color:T.text3, marginTop:3 }}>{a.source?.name || a.source || 'News'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TICKER TAPE */}
      <div data-scroll-fx style={{ background:T.blue, overflow:'hidden', padding:'10px 0', whiteSpace:'nowrap' }}>
        <div style={{ display:'inline-flex', gap:48, animation:'ticker 28s linear infinite' }}>
          {[...MARKET_SYMBOLS,...MARKET_SYMBOLS].map((m,i) => {
            const p = prices[m.symbol]; const pct = pctFor(m.symbol)
            return (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{shortSym(m.symbol)}</span>
                {p != null && <span style={{ fontSize:12, color:'rgba(255,255,255,.7)', fontFamily:F.mono }}>${p.toFixed(2)}</span>}
                {pct != null && <span style={{ fontSize:11, fontWeight:700, color: pct>=0 ? '#86EFAC' : '#FCA5A5', fontFamily:F.mono }}>{pct>=0?'+':''}{pct.toFixed(2)}%</span>}
              </span>
            )
          })}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" data-scroll-fx style={{ padding:'96px 32px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div className="section-eyebrow">Key Features</div>
          <h2 className="section-h2">Everything you need to<br />make smarter trades</h2>
          <p className="section-sub" style={{ maxWidth:520, margin:'0 auto' }}>QuantAI combines AI, global market data, and professional-grade tools into one clean interface — without the complexity.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:18 }}>
          {FEATURES.map((f,i) => (
            <div key={i} className="card" style={{ animation:`fadeUp .5s ${i*.07}s both` }}>
              <div style={{ width:52, height:52, background:T.blueLight, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:16 }}>
                {ICON_MAP[f.icon]
                  ? <img src={ICON_MAP[f.icon]} alt={f.title} style={{ width: 30, height: 30, objectFit: 'contain' }} />
                  : f.icon}
              </div>
              <h3 style={{ fontSize:17, fontWeight:800, color:T.text0, marginBottom:8, fontFamily:displayFont, letterSpacing:'-.01em' }}>{f.title}</h3>
              <p style={{ fontSize:14, color:T.text2, lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" data-scroll-fx style={{ background:T.cardBg, padding:'96px 32px', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div className="section-eyebrow">How It Works</div>
            <h2 className="section-h2">Up and running in minutes</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:0 }}>
            {STEPS.map((step,i) => (
              <div key={i} style={{ padding:'0 32px', borderRight: i<STEPS.length-1 ? `1px solid ${T.border}` : 'none', animation:`fadeUp .5s ${i*.1}s both` }}>
                <div style={{ fontFamily:displayFont, fontSize:52, fontWeight:900, color:T.blue, opacity:.12, lineHeight:1, marginBottom:10 }}>{step.num}</div>
                <h3 style={{ fontSize:18, fontWeight:800, color:T.text0, marginBottom:8, fontFamily:displayFont, letterSpacing:'-.01em' }}>{step.title}</h3>
                <p style={{ fontSize:14, color:T.text2, lineHeight:1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:56 }}>
            <button className="btn-primary" onClick={onSignup} style={{ padding:'14px 40px', fontSize:15, borderRadius:12 }}>Create Free Account</button>
            <div style={{ fontSize:12, color:T.text3, marginTop:10 }}>No credit card required · Free forever</div>
          </div>
        </div>
      </section>

      {/* WHY QUANTAI */}
      <section id="why-quantai" data-scroll-fx style={{ padding:'96px 32px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div className="section-eyebrow">Why QuantAI</div>
          <h2 className="section-h2">What makes us different</h2>
          <p className="section-sub" style={{ maxWidth:460, margin:'0 auto' }}>We built the tools we wished existed as traders. No fluff, no paywalls, no complexity.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:20 }}>
          {UNIQUE.map((u,i) => (
            <div key={i} style={{ padding:32, background: u.dark ? T.blue : T.cardBg, border:`1px solid ${u.dark ? T.blue : T.border}`, borderRadius:20, animation:`fadeUp .5s ${i*.1}s both` }}>
              <div style={{ width:54, height:54, borderRadius:12, background: u.dark ? 'rgba(255,255,255,.15)' : T.blueLight, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, marginBottom:18 }}>
                {ICON_MAP[u.icon]
                  ? <img src={ICON_MAP[u.icon]} alt={u.title} style={{ width: 30, height: 30, objectFit: 'contain' }} />
                  : u.icon}
              </div>
              <h3 style={{ fontSize:19, fontWeight:800, color: u.dark ? '#fff' : T.text0, marginBottom:10, fontFamily:displayFont, letterSpacing:'-.02em' }}>{u.title}</h3>
              <p style={{ fontSize:14, color: u.dark ? 'rgba(255,255,255,.75)' : T.text2, lineHeight:1.65 }}>{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MARKETS */}
      <section id="markets" data-scroll-fx style={{ background:T.cardBg, padding:'96px 32px', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:72, alignItems:'center' }}>
          <div>
            <div className="section-eyebrow">Global Markets</div>
            <h2 className="section-h2">One platform,<br />every market</h2>
            <p className="section-sub" style={{ marginBottom:26 }}>Stop switching between apps. QuantAI covers stocks on 25+ exchanges worldwide — from Wall Street to Dalal Street, Tokyo to London — with live prices in native currencies and instant USD conversion.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:30 }}>
              {['NYSE','NASDAQ','NSE','BSE','LSE','TSE','HKEX','XETRA','ASX','KRX','SGX','B3'].map(ex => (
                <span key={ex} style={{ fontSize:12, fontWeight:700, color:T.blue, background:T.blueLight, borderRadius:8, padding:'5px 12px', border:`1px solid #BFDBFE` }}>{ex}</span>
              ))}
              <span style={{ fontSize:12, color:T.text3, padding:'5px 10px' }}>+13 more</span>
            </div>
            <button className="btn-primary" onClick={onSignup}>Explore Markets</button>
          </div>
          <div style={{ background:T.pageBg, borderRadius:20, padding:22, border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.text0, marginBottom:14 }}>Live Prices</div>
            {MARKET_SYMBOLS.slice(0,6).map(item => {
              const p = prices[item.symbol]; const pct = pctFor(item.symbol); const up = pct !== null && pct >= 0
              return (
                <div key={item.symbol} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', marginBottom:6, background:T.cardBg, borderRadius:10, border:`1px solid ${T.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:15 }}>{item.flag}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:800, color:T.text0 }}>{shortSym(item.symbol)}</div>
                      <div style={{ fontSize:10, color:T.text3 }}>{item.exchange}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text0, fontFamily:F.mono }}>{p!=null?`$${p.toLocaleString(undefined,{maximumFractionDigits:2})}`:'—'}</div>
                    <div style={{ fontSize:11, fontWeight:700, color: pct==null?T.text3:up?T.green:T.red, fontFamily:F.mono }}>{pct!=null?`${pct>=0?'+':''}${pct.toFixed(2)}%`:'—'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* NEWS SECTION */}
      <section data-scroll-fx style={{ padding:'96px 32px', maxWidth:1280, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div className="section-eyebrow">Market News</div>
          <h2 className="section-h2">Stay ahead of the market</h2>
          <p className="section-sub">Real-time news with AI sentiment scoring. Know what's moving markets before you trade.</p>
        </div>
        {newsLoading ? (
          <div style={{ textAlign:'center', padding:40 }}><div style={{ display:'inline-block', width:28, height:28, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.blue}`, borderRadius:'50%', animation:'spin .7s linear infinite' }} /></div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:18 }}>
            {displayNews.map((a,i) => {
              const sentiments = ['Bullish','Bearish','Neutral']
              const sentColors = [[T.green,T.greenBg],[T.red,T.redBg],['#0369A1','#F0F9FF']]
              const s = sentiments[i % 3]; const [sc, sb] = sentColors[i % 3]
              return (
                <div key={i} className="news-card" style={{ animation:`fadeUp .5s ${i*.07}s both` }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:sb, color:sc, borderRadius:100, padding:'3px 10px', fontSize:11, fontWeight:700, marginBottom:10 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'currentColor' }} />
                    {s} Sentiment
                  </div>
                  <h3 style={{ fontSize:14, fontWeight:700, color:T.text0, lineHeight:1.5, marginBottom:10, fontFamily:displayFont }}>{a.title}</h3>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:T.text3, fontWeight:600 }}>{a.source?.name || a.source || 'News'}</span>
                    <span style={{ fontSize:11, color:T.text3 }}>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : 'Today'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:36 }}>
          <button className="btn-outline" onClick={onSignup} style={{ padding:'12px 32px', fontSize:14, borderRadius:10 }}>
            Sign up to see live news with AI sentiment →
          </button>
        </div>
      </section>

      {/* FINAL CTA */}
      <section data-scroll-fx style={{ background: isDark ? 'linear-gradient(135deg,#080808 0%,#000000 100%)' : `linear-gradient(135deg,${T.blue} 0%,#1E40AF 100%)`, padding:'80px 32px', borderTop: isDark ? `1px solid ${T.border}` : 'none' }}>
        <div style={{ maxWidth:660, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontFamily:displayFont, fontSize:'clamp(28px,4vw,48px)', fontWeight:900, color:'#fff', letterSpacing:'-.04em', marginBottom:14 }}>
            Start making smarter<br />trading decisions today
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,.75)', marginBottom:36, lineHeight:1.65 }}>
            Join traders using QuantAI to analyse global markets, get AI signals, and trade risk-free with paper accounts.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={onSignup} style={{ background:'#fff', color:T.blue, border:'none', borderRadius:12, padding:'14px 36px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:displayFont, boxShadow:'0 8px 24px rgba(0,0,0,.15)', transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,.2)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.15)'}}
            >Create Free Account</button>
            <button onClick={onLogin} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1.5px solid rgba(255,255,255,.4)', borderRadius:12, padding:'14px 32px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:displayFont, transition:'all .2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.2)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.12)'}
            >Log In</button>
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginTop:14 }}>No credit card required · Free to use</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer data-scroll-fx style={{ background:isDark ? '#000000' : T.text0, padding:'36px 32px', borderTop: isDark ? `1px solid ${T.border}` : 'none' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img
              src={candleStickLogo}
              alt="QuantAI"
              style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
            />
            <span style={{ fontSize:16, fontWeight:900, color:'#fff', fontFamily:displayFont }}>Quant<span style={{ color:'#60A5FA' }}>AI</span></span>
          </div>
          <div style={{ display:'flex', gap:24 }}>
            {['Features','Markets','Privacy','Terms'].map(l => (
              <a key={l} href="#" style={{ fontSize:13, color:'#94A3B8', fontWeight:500, transition:'color .15s' }}
                onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='#94A3B8'}>{l}</a>
            ))}
          </div>
          <div style={{ fontSize:12, color:'#475569' }}>© 2026 QuantAI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}