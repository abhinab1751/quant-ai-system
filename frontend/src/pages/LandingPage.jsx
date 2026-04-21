import { useState, useEffect, useRef } from 'react'
import candleStickLogo from '../assets/candleStick.png'
import brainIcon from '../assets/brain.png'
import earthIcon from '../assets/earth.png'
import newsIcon from '../assets/news.png'
import bagIcon from '../assets/bag.png'
import strategyIcon from '../assets/Strategy.png'
import thunderIcon from '../assets/thunder.png'
import bullseyeIcon from '../assets/bullseye.png'
import mapIcon from '../assets/map.png'

const LIGHT_T = {
  blue:'#1F1F1F', blueDark:'#000000', blueLight:'rgba(31,31,31,0.08)',
  green:'#2E7D32', greenBg:'rgba(46,125,50,0.12)', red:'#C62828', redBg:'rgba(198,40,40,0.10)',
  text0:'#111111', text1:'#2B2B2B', text2:'#525252', text3:'#7A7A7A',
  border:'#D4D4D0',
  cardBg:'#FFFFFF',
  pageBg:'#F5F5F3',
  navBg:'rgba(245,245,243,0.82)',
  navBgSolid:'rgba(245,245,243,0.96)',
  panelBg:'rgba(255,255,255,.90)',
  sectionBg:'rgba(242,242,240,.78)',
  glassBg:'rgba(255,255,255,.84)',
  glassBorder:'rgba(17,17,17,.10)',
  footerBg:'#0F0F0F',
}

const DARK_T = {
  blue:'#9ABF7A', blueDark:'#7FA35F', blueLight:'rgba(154,191,122,0.14)',
  green:'#9BD97C', greenBg:'rgba(155,217,124,0.18)', red:'#E38D86', redBg:'rgba(227,141,134,0.18)',
  text0:'#EDF4E9', text1:'#D8E3D2', text2:'#AABAA3', text3:'#82917D',
  border:'#324336',
  cardBg:'#17231C',
  pageBg:'#0F1612',
  navBg:'rgba(15,22,18,0.88)',
  navBgSolid:'rgba(15,22,18,0.96)',
  panelBg:'rgba(23,35,28,.92)',
  sectionBg:'rgba(29,43,34,.68)',
  glassBg:'rgba(21,32,26,.82)',
  glassBorder:'rgba(154,191,122,.12)',
  footerBg:'#0B120E',
}
const F = {
  serif:  "'DM Serif Display', 'Georgia', serif",
  sans:   "'Plus Jakarta Sans', sans-serif",
  mono:   "'JetBrains Mono', monospace",
}

if (typeof document !== 'undefined' && !document.getElementById('lp-fonts')) {
  const l = document.createElement('link')
  l.id='lp-fonts'; l.rel='stylesheet'
  l.href='https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap'
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
  { icon:'bullseye', title:'Trade Intelligence (5-Agent)', desc:'Run a 5-agent pipeline that combines market context, technicals, sentiment, risk analysis, and synthesis into one actionable trade brief with confidence.' },
  { icon:'strategy', title:'Report Generation', desc:'Export a clean PDF report with verdict, confidence, risk context, and key supporting metrics for sharing or record-keeping.' },
  { icon:'brain', title:'AI-Powered Signals',       desc:'Ensemble ML model analyses 21 technical indicators and news sentiment to deliver clear BUY / HOLD / SELL signals with confidence scores — no guesswork.' },
  { icon:'earth', title:'25+ Global Exchanges',     desc:'NYSE, NASDAQ, NSE, BSE, LSE, TSE, HKEX, XETRA, ASX and more. Track any stock worldwide with live prices in native and USD currency.' },
  { icon:'news', title:'News Sentiment Analysis',   desc:'FinBERT NLP reads every article about your stocks and scores it Bullish, Bearish, or Neutral so you know exactly what the market is reacting to.' },
  { icon:'bag', title:'Paper Trading',              desc:'Practice with $100K virtual capital. Place market and limit orders, track P&L in real time, and benchmark vs buy-and-hold — completely risk-free.' },
  { icon:'strategy', title:'Strategy Backtesting',  desc:'Walk-forward backtest on 2 years of historical data. See Sharpe ratio, max drawdown, win rate, and a full trade log before risking real money.' },
  { icon:'thunder', title:'Live Price Streaming',   desc:'WebSocket streaming updates every 5 seconds. Set price alerts and get instant notifications the moment your threshold is crossed.' },
]
const STATS = [
  { value:'25+',  label:'Global Exchanges' },
  { value:'200+', label:'Stocks Covered'   },
  { value:'21',   label:'ML Features'      },
  { value:'2yr',  label:'Backtest Window'  },
]
const TRADE_INTELLIGENCE_STEPS = [
  { title:'Market Context Agent', desc:'Interprets live market regime, trend conditions, and macro signals before a trade is considered.' },
  { title:'Technical Agent', desc:'Validates setups with RSI, MACD, Bollinger Bands, and momentum structure.' },
  { title:'Risk Agent', desc:'Evaluates volatility and downside scenarios to produce a safer trade profile.' },
  { title:'Synthesis Agent', desc:'Combines all agent outputs into one final verdict and confidence score.' },
  { title:'Report Generation', desc:'Generates a downloadable PDF trade report for documentation and team sharing.' },
]
const STEPS = [
  { num:'01', title:'Create your account', desc:'Sign up free in under 30 seconds. No credit card required.' },
  { num:'02', title:'Search any stock',    desc:'Search by ticker across NYSE, NSE, LSE, TSE and 20+ other exchanges.' },
  { num:'03', title:'Get AI signals',      desc:'Instantly see ML predictions, sentiment scores, and decision confidence.' },
  { num:'04', title:'Trade or backtest',   desc:'Paper trade with virtual money or backtest on 2 years of historical data.' },
]
const UNIQUE = [
  { title:'Not just charts — decisions', desc:'Most platforms show data and leave thinking to you. QuantAI synthesises ML, sentiment, and market mood into one actionable signal.', icon:'bullseye', dark:true },
  { title:'Multi-market in one view',   desc:'Switch between US stocks, Indian NSE/BSE, Tokyo TSE, London LSE and more without switching tabs, apps, or accounts.',              icon:'map', dark:true  },
  { title:'Free, no paywalls',          desc:'Core features including AI signals, live prices, paper trading, and backtesting are 100% free. No hidden fees, no premium tiers.', icon:'candle', dark:true },
]

const ICON_MAP = {
  brain: brainIcon,
  earth: earthIcon,
  news: newsIcon,
  bag: bagIcon,
  strategy: strategyIcon,
  thunder: thunderIcon,
  bullseye: bullseyeIcon,
  map: mapIcon,
  candle: candleStickLogo,
}
const FALLBACK_NEWS = [
  { title:'Federal Reserve signals cautious approach to rate cuts as inflation persists',          source:'Reuters',   publishedAt:new Date().toISOString() },
  { title:'NVIDIA earnings beat expectations as AI chip demand continues to accelerate globally', source:'Bloomberg', publishedAt:new Date().toISOString() },
  { title:"India's NSE hits record highs on strong FII inflows and robust GDP data",             source:'ET Markets',publishedAt:new Date().toISOString() },
  { title:'Apple announces record buyback program amid strong services revenue growth quarter',   source:'WSJ',       publishedAt:new Date().toISOString() },
  { title:'European markets steady as ECB holds rates and watches incoming inflation data',       source:'FT',        publishedAt:new Date().toISOString() },
  { title:'Tesla deliveries disappoint as competition intensifies across global EV market',       source:"Barron's",  publishedAt:new Date().toISOString() },
]

const CONVEYOR_CARDS = [
  { label:'BUY Signal',        dots:['#22c55e','#22c55e','#22c55e','#22c55e'], rows:['AAPL +2.4%','NVDA +3.1%'] },
  { label:'Live Market Data',  dots:['#3b82f6','#3b82f6','#f59e0b','#3b82f6'], rows:['NSE Open','NYSE Open'] },
  { label:'Sentiment Score',   dots:['#22c55e','#f59e0b','#22c55e','#f59e0b'], rows:['Bullish 78%','Neutral 22%'] },
  { label:'Paper Trade',       dots:['#8b5cf6','#8b5cf6','#22c55e','#22c55e'], rows:['P&L +$1,240','Win Rate 64%'] },
  { label:'Backtest Result',   dots:['#f59e0b','#22c55e','#3b82f6','#22c55e'], rows:['Sharpe 1.42','Return +34%'] },
]

const PATH_ICONS = [
  { label:'NYSE',  color:'#2563EB', bg:'#EFF6FF', emoji:'🗽' },
  { label:'NSE',   color:'#16A34A', bg:'#F0FDF4', emoji:'🇮🇳' },
  { label:'LSE',   color:'#7C3AED', bg:'#F5F3FF', emoji:'🇬🇧' },
  { label:'TSE',   color:'#DC2626', bg:'#FEF2F2', emoji:'🇯🇵' },
  { label:'HKEX',  color:'#D97706', bg:'#FFFBEB', emoji:'🇭🇰' },
  { label:'XETRA', color:'#0369A1', bg:'#F0F9FF', emoji:'🇩🇪' },
  { label:'ASX',   color:'#16A34A', bg:'#F0FDF4', emoji:'🇦🇺' },
  { label:'KRX',   color:'#7C3AED', bg:'#F5F3FF', emoji:'🇰🇷' },
]

function shortSym(s){ return s.replace('.NS','').replace('.BO','').replace('.L','').replace('.T','').replace('.HK','').replace('.DE','').replace('^','') }

function IsometricScene({ height = 520 }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50)
    return () => clearInterval(id)
  }, [])

  const CARD_W = 180, CARD_H = 90, CARD_GAP = 220
  const totalW = CONVEYOR_CARDS.length * CARD_GAP

  const iconPositions = PATH_ICONS.map((_, i) => ({
    bx: 60 + i * 48,
    by: 320 - i * 32,
  }))

  return (
    <div style={{ position:'relative', width:'100%', height, overflow:'hidden' }}>
      <svg
        viewBox="0 0 680 520"
        style={{ width:'100%', height:'100%', overflow:'visible' }}
      >
        <defs>
          {/* Glow filter for hub */}
          <filter id="hub-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="18" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="card-shadow" x="-10%" y="-20%" width="120%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#1e3a8a" floodOpacity="0.10"/>
          </filter>
          <filter id="icon-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.08"/>
          </filter>
          {/* Clip so cards don't overflow the scene */}
          <clipPath id="scene-clip">
            <rect x="300" y="80" width="380" height="360"/>
          </clipPath>
        </defs>

        {/* ── Background glow blob under hub ── */}
        <ellipse cx="430" cy="380" rx="160" ry="56"
          fill="#c7d2fe" opacity="0.45"/>

        {/* ── Dashed diagonal path (bottom-left → hub) ── */}
        <path
          d="M 40 470 Q 180 420 310 370 Q 390 340 430 330"
          fill="none" stroke="#94a3b8" strokeWidth="1.5"
          strokeDasharray="6 5" opacity="0.5"
        />
        {/* Secondary branch path */}
        <path
          d="M 100 500 Q 220 455 340 395"
          fill="none" stroke="#94a3b8" strokeWidth="1.2"
          strokeDasharray="5 5" opacity="0.35"
        />

        {/* ── Exchange icon floats on dashed path ── */}
        {PATH_ICONS.map((icon, i) => {
          const phase = (tick * 0.04 + i * 0.8) % (Math.PI * 2)
          const floatY = Math.sin(phase) * 4
          const progress = ((tick * 0.003 + i * 0.18) % 1)
          const t = progress
          const x = (1-t)*(1-t)*40 + 2*(1-t)*t*180 + t*t*430
          const y = (1-t)*(1-t)*470 + 2*(1-t)*t*410 + t*t*330 + floatY
          const opacity = progress > 0.88 ? (1 - progress) / 0.12 : Math.min(1, progress / 0.06)

          return (
            <g key={i} transform={`translate(${x}, ${y})`} opacity={opacity} style={{ filter:'url(#icon-shadow)' }}>
              <rect x="-22" y="-22" width="44" height="44" rx="10"
                fill={icon.bg} stroke="white" strokeWidth="1.5"/>
              <text x="0" y="7" textAnchor="middle" fontSize="18">{icon.emoji}</text>
            </g>
          )
        })}

        {/* ── CENTRAL HUB ── */}
        <g transform="translate(430, 340)">
          {/* Pedestal shadow */}
          <ellipse cx="0" cy="52" rx="72" ry="18" fill="#1e3a8a" opacity="0.15"/>
          {/* Pedestal body */}
          <path d="M -56 32 L 0 52 L 56 32 L 56 50 L 0 70 L -56 50 Z" fill="#1e3a8a" opacity="0.85"/>
          {/* Hub disc - outer rings */}
          {[68, 54, 40, 27, 15].map((r, i) => (
            <circle key={i} cx="0" cy="0" r={r}
              fill={i===4 ? '#2563EB' : 'none'}
              stroke={i===4 ? '#60a5fa' : '#3b82f6'}
              strokeWidth={i===4 ? 0 : 2}
              opacity={i===4 ? 1 : 0.25 + i * 0.12}
            />
          ))}
          {/* Hub centre dot with pulse */}
          <circle cx="0" cy="0" r="6" fill="white" opacity="0.9"/>
          {/* Slow rotation ring */}
          <circle cx="0" cy="0" r="68"
            fill="none" stroke="#93c5fd" strokeWidth="1"
            strokeDasharray="8 12" opacity="0.4"
            style={{ transformOrigin:'0 0', animation:'hubSpin 12s linear infinite' }}
          />
        </g>

        {/* ── CONVEYOR CARDS sliding right-to-left on isometric rail ── */}
        <g clipPath="url(#scene-clip)">
          {/* Rail line 1 */}
          <line x1="300" y1="270" x2="680" y2="150" stroke="#e2e8f0" strokeWidth="1"/>
          {/* Rail line 2 */}
          <line x1="300" y1="340" x2="680" y2="220" stroke="#e2e8f0" strokeWidth="1"/>

          {CONVEYOR_CARDS.map((card, ci) => {
            const offset = ((tick * 0.5 + ci * CARD_GAP) % totalW)
            const baseX = 680 - offset
            const baseY = 150 + (680 - baseX) * 0.18
            const opacity = baseX < 310 ? Math.max(0, (baseX - 300) / 10) :
                            baseX > 650 ? Math.max(0, (680 - baseX) / 30) : 1

            return (
              <g key={ci} transform={`translate(${baseX}, ${baseY})`} opacity={opacity}
                style={{ filter:'url(#card-shadow)' }}>
                {/* Card body — isometric skew via transform */}
                <g style={{ transform:'skewY(-10deg) scaleX(0.88)' }}>
                  <rect x="0" y="0" width={CARD_W} height={CARD_H} rx="14"
                    fill="white" stroke="#e2e8f0" strokeWidth="1"/>
                  {/* Label pill at bottom */}
                  <rect x="10" y={CARD_H - 26} width={CARD_W - 20} height="20" rx="10"
                    fill="#2563EB"/>
                  <text x={CARD_W/2} y={CARD_H - 12} textAnchor="middle"
                    fill="white" fontSize="9" fontFamily={F.sans} fontWeight="700">
                    {card.label}
                  </text>
                  {/* Dot row */}
                  <g transform="translate(12, 14)">
                    {card.dots.map((col, di) => (
                      <circle key={di} cx={di * 18} cy="0" r="6" fill={col} opacity="0.85"/>
                    ))}
                  </g>
                  {/* Text rows */}
                  {card.rows.map((row, ri) => (
                    <g key={ri}>
                      <rect x="12" y={36 + ri * 16} width={CARD_W - 24} height="11" rx="5"
                        fill="#f1f5f9"/>
                      <text x="16" y={36 + ri * 16 + 8} fill="#64748b" fontSize="8"
                        fontFamily={F.sans} fontWeight="600">{row}</text>
                    </g>
                  ))}
                </g>
              </g>
            )
          })}
        </g>

        {/* ── Floating particle dots (ambient) ── */}
        {[0,1,2,3,4].map(i => {
          const phase = (tick * 0.03 + i * 1.3) % (Math.PI * 2)
          const x = 310 + i * 70 + Math.sin(phase) * 8
          const y = 120 + i * 18 + Math.cos(phase) * 6
          return <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" opacity={0.12 + 0.06 * i}/>
        })}
      </svg>

      <style>{`
        @keyframes hubSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
export default function LandingPage({ onLogin, onSignup }) {
  const rootRef = useRef(null)
  const [isDark, setIsDark] = useState(false)
  const [email,       setEmail]       = useState('')
  const [prices,      setPrices]      = useState({})
  const [prevPrices,  setPrevPrices]  = useState({})
  const [news,        setNews]        = useState([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [marketTab,   setMarketTab]   = useState('popular')
  const [scrolled,    setScrolled]    = useState(false)
  const T = isDark ? DARK_T : LIGHT_T

  useEffect(() => {
    const saved = localStorage.getItem('qai_landing_theme')
    if (saved === 'dark') setIsDark(true)
  }, [])

  useEffect(() => {
    localStorage.setItem('qai_landing_theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('[data-reveal]'))
    if (!nodes.length) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      nodes.forEach(el => el.classList.add('in'))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' })

    nodes.forEach((el, idx) => {
      el.style.setProperty('--reveal-delay', `${Math.min(idx * 40, 260)}ms`)
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

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

  const displayNews    = news.length > 0 ? news : FALLBACK_NEWS
  const popularSymbols = MARKET_SYMBOLS.filter(m => m.exchange !== 'INDEX')
  const indexSymbols   = MARKET_SYMBOLS.filter(m => m.exchange === 'INDEX')
  const displaySymbols = marketTab === 'popular' ? popularSymbols : indexSymbols

  const pctFor = sym => {
    const p = prices[sym], pp = prevPrices[sym]
    if (p == null || pp == null || pp === 0) return null
    return ((p - pp) / pp) * 100
  }

  return (
    <div ref={rootRef} style={{ fontFamily:F.sans, background:T.pageBg, minHeight:'100vh', overflowX:'hidden' }}>
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes ticker   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulseRing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.8);opacity:0} }
        * { box-sizing:border-box; margin:0; padding:0; }
        a { text-decoration:none; }

        [data-reveal] {
          opacity: 0;
          transform: translate3d(0, 24px, 0) scale(.992);
          filter: blur(4px);
          transition:
            opacity .7s cubic-bezier(.22,1,.36,1) var(--reveal-delay, 0ms),
            transform .8s cubic-bezier(.22,1,.36,1) var(--reveal-delay, 0ms),
            filter .7s ease var(--reveal-delay, 0ms);
          will-change: transform, opacity, filter;
        }
        [data-reveal].in {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
          filter: blur(0);
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          [data-reveal],
          [data-reveal].in {
            opacity: 1;
            transform: none;
            filter: none;
            transition: none;
          }
        }

        /* NAV */
        .nav-a { font-size:14px; font-weight:600; color:${T.text1}; cursor:pointer; background:none; border:none; padding:0; font-family:${F.sans}; transition:color .15s; }
        .nav-a:hover { color:${T.blue}; }

        /* BUTTONS */
        .btn-primary { background:${T.blue}; color:#fff; border:none; border-radius:999px; padding:12px 28px; font-size:14px; font-weight:700; cursor:pointer; font-family:${F.sans}; transition:all .2s; letter-spacing:-.01em; }
        .btn-primary:hover { background:${T.blueDark}; transform:translateY(-1px); box-shadow:0 8px 24px ${T.blue}50; }
        .btn-outline { background:transparent; color:${T.text0}; border:1.5px solid ${T.border}; border-radius:999px; padding:11px 24px; font-size:14px; font-weight:600; cursor:pointer; font-family:${F.sans}; transition:all .2s; }
        .btn-outline:hover { border-color:${T.text0}; background:rgba(15,23,42,.04); }
        .btn-ghost { background:${T.glassBg}; border:1px solid ${T.glassBorder}; border-radius:999px; color:${T.text0}; font-size:13px; font-weight:600; padding:9px 20px; cursor:pointer; backdrop-filter:blur(8px); font-family:${F.sans}; transition:all .2s; }
        .btn-ghost:hover { background:${T.cardBg}; }

        /* CARDS */
        .feature-card { background:${T.glassBg}; border:1px solid ${T.glassBorder}; border-radius:20px; padding:28px 24px; backdrop-filter:blur(12px); transition:all .2s; }
        .feature-card:hover { background:${T.cardBg}; box-shadow:0 12px 40px rgba(37,99,235,.09); transform:translateY(-4px); }
        .news-card { background:${T.glassBg}; border:1px solid ${T.glassBorder}; border-radius:16px; padding:20px 22px; backdrop-filter:blur(10px); cursor:pointer; transition:all .2s; }
        .news-card:hover { background:${T.cardBg}; box-shadow:0 8px 28px rgba(15,23,42,.07); transform:translateY(-3px); }
        .market-row { display:grid; grid-template-columns:1fr 90px 70px; align-items:center; padding:11px 0; border-bottom:1px solid ${T.border}; cursor:pointer; transition:background .15s; border-radius:8px; margin:0 -6px; padding-left:6px; padding-right:6px; }
        .market-row:hover { background:${T.blueLight}; }
        .market-row:last-child { border-bottom:none; }

        /* SECTIONS */
        .section-label { font-size:11px; font-weight:700; color:${T.blue}; letter-spacing:.12em; text-transform:uppercase; margin-bottom:12px; font-family:${F.sans}; }
        .section-h2 { font-family:${F.serif}; font-size:clamp(28px,3.5vw,44px); font-weight:400; color:${T.text0}; letter-spacing:-.01em; margin-bottom:14px; line-height:1.15; }

        /* TAB BUTTON */
        .tab-btn { background:none; border:none; cursor:pointer; font-size:14px; font-weight:700; font-family:${F.sans}; padding:8px 0; padding-bottom:6px; transition:color .15s; }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position:'sticky', top:0, zIndex:200,
        background: scrolled ? T.navBgSolid : T.navBg,
        backdropFilter:'blur(16px)',
        borderBottom: scrolled ? `1px solid ${T.border}` : '1px solid transparent',
        transition:'all .25s',
      }}>
        <div style={{ maxWidth:1240, margin:'0 auto', display:'flex', alignItems:'center', gap:36, padding:'0 32px', height:64 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0, cursor:'pointer' }}>
            <img src={candleStickLogo} alt="QuantAI" style={{ width:34, height:34, objectFit:'contain', flexShrink:0 }} />
            <span style={{ fontSize:19, fontWeight:900, color:T.text0, letterSpacing:'-.04em', fontFamily:F.sans }}>
              Quant<span style={{ color:T.blue }}>AI</span>
            </span>
          </div>

          {/* Nav links */}
          <div style={{ display:'flex', gap:28, flex:1 }}>
            {[['Features','features'],['Trade Intelligence','trade-intelligence'],['Markets','markets'],['How It Works','how-it-works'],['Why QuantAI','why-quantai']].map(([l,id]) => (
              <button key={l} className="nav-a" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' })}>{l}</button>
            ))}
          </div>

          <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
            <button
              className="btn-ghost"
              onClick={() => setIsDark(v => !v)}
              style={{ padding:'9px 14px' }}
            >
              {isDark ? 'Light Mode' : 'Night Mode'}
            </button>
            <button className="btn-outline" onClick={onLogin}>Log In</button>
            <button className="btn-primary" onClick={onSignup}>Sign Up Free</button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section data-reveal style={{ minHeight:'calc(100vh - 64px)', display:'grid', gridTemplateColumns:'1.2fr 1fr', alignItems:'flex-start', position:'relative', overflow:'hidden', gap:24, padding:'80px 32px 40px' }}>
        {/* Background gradient blobs */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'8%', right:'12%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle, rgba(147,197,253,0.28) 0%, transparent 70%)', filter:'blur(1px)' }}/>
          <div style={{ position:'absolute', bottom:'5%', left:'5%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(196,181,253,0.15) 0%, transparent 70%)' }}/>
        </div>

        {/* Text Content - Left */}
        <div style={{ display:'flex', flexDirection:'column', gap:0, alignItems:'flex-start', position:'relative', zIndex:1, textAlign:'left' }}>
          {/* Eyebrow badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`rgba(${isDark ? '2,8,15' : '243,243,243'},0.5)`, borderRadius:999, padding:'6px 14px', border:`1px solid ${T.glassBorder}`, marginBottom:12, backdropFilter:'blur(10px)', animation:'fadeUp .7s both' }}>
            <div style={{ position:'relative', width:8, height:8 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:T.blue, animation:'pulseRing 1.8s ease-out infinite' }}/>
              <div style={{ width:8, height:8, borderRadius:'50%', background:T.blue, position:'relative' }}/>
            </div>
            <span style={{ fontSize:14, fontWeight:700, color:T.blue, letterSpacing:'.06em', fontFamily:F.sans }}>AI-POWERED TRADING INTELLIGENCE</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily:F.sans, fontSize:'clamp(40px,6vw,68px)', fontWeight:800, color:T.text0, lineHeight:1.1, letterSpacing:'-.02em', marginBottom:8, animation:'fadeUp .7s .1s both', textShadow:`0 2px 8px rgba(0,0,0,${isDark ? '0.3' : '0.1'})` }}>
            Trade Smarter,<br />
            <span style={{ color:T.blue }}>Not Harder</span><br />
            with QuantAI
          </h1>

          <p style={{ fontSize:18, color:T.text1, lineHeight:1.7, marginBottom:12, fontFamily:F.sans, animation:'fadeUp .7s .2s both', textShadow:`0 1px 4px rgba(0,0,0,${isDark ? '0.2' : '0.05'})` }}>
            The world's most intelligent stock analysis platform. Real-time AI signals, 25+ global exchanges, live sentiment analysis, and risk-free paper trading — all in one dashboard.
          </p>

          {/* CTA row */}
          <div style={{ display:'flex', gap:12, marginBottom:28, animation:'fadeUp .7s .3s both' }}>
            <form onSubmit={e => { e.preventDefault(); onSignup() }} style={{ display:'flex', gap:8 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                style={{ background:`rgba(${isDark ? '255,255,255' : '0,0,0'},0.08)`, border:`1.5px solid ${T.border}`, borderRadius:999, padding:'14px 20px', fontSize:15, color:T.text0, fontFamily:F.sans, outline:'none', backdropFilter:'blur(10px)', minWidth:0 }}
                onFocus={e => { e.target.style.borderColor=T.blue; e.target.style.background=`rgba(${isDark ? '255,255,255' : '0,0,0'},0.12)` }}
                onBlur={e  => { e.target.style.borderColor=T.border; e.target.style.background=`rgba(${isDark ? '255,255,255' : '0,0,0'},0.08)` }}
              />
              <button type="submit" className="btn-primary">Get Started</button>
            </form>
            <button className="btn-ghost" onClick={onLogin}>Log In →</button>
          </div>

          {/* Stats row */}
          <div style={{ display:'flex', gap:20, animation:'fadeUp .7s .4s both' }}>
            {STATS.map(({ value, label }) => (
              <div key={label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:F.sans, fontSize:28, fontWeight:900, color:T.blue, letterSpacing:'-.03em', lineHeight:1 }}>{value}</div>
                <div style={{ fontSize:13, color:T.text2, fontWeight:600, marginTop:2, fontFamily:F.sans }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Animation - Right */}
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', overflow:'visible' }}>
          <IsometricScene height={500} />
        </div>
      </section>

      {/* ═══ TICKER TAPE ═══ */}
      <div style={{ background:T.blue, overflow:'hidden', padding:'10px 0', whiteSpace:'nowrap' }}>
        <div style={{ display:'inline-flex', gap:48, animation:'ticker 28s linear infinite' }}>
          {[...MARKET_SYMBOLS,...MARKET_SYMBOLS].map((m,i) => {
            const p = prices[m.symbol]; const pct = pctFor(m.symbol)
            return (
              <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#fff', fontFamily:F.sans }}>{shortSym(m.symbol)}</span>
                {p != null && <span style={{ fontSize:12, color:'rgba(255,255,255,.7)', fontFamily:F.mono }}>${p.toFixed(2)}</span>}
                {pct != null && <span style={{ fontSize:11, fontWeight:700, color:pct>=0?'#86EFAC':'#FCA5A5', fontFamily:F.mono }}>{pct>=0?'+':''}{pct.toFixed(2)}%</span>}
              </span>
            )
          })}
        </div>
      </div>

      {/* ═══ MARKET PANEL + NEWS (Binance style — below hero) ═══ */}
      <section data-reveal style={{ background:T.sectionBg, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, backdropFilter:'blur(12px)' }}>
        <div style={{ maxWidth:1240, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:40, padding:'48px 32px' }}>

          {/* Market panel */}
          <div style={{ background:T.panelBg, borderRadius:20, border:`1px solid ${T.border}`, overflow:'hidden', backdropFilter:'blur(10px)', boxShadow:'0 8px 32px rgba(15,23,42,.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ display:'flex', gap:20 }}>
                {[['popular','Popular'],['indices','Indices']].map(([k,l]) => (
                  <button key={k} className="tab-btn" onClick={() => setMarketTab(k)}
                    style={{ color:marketTab===k?T.text0:T.text3, borderBottom:marketTab===k?`2px solid ${T.blue}`:'2px solid transparent' }}>{l}</button>
                ))}
              </div>
              <button onClick={onSignup} style={{ background:'none', border:'none', fontSize:12, color:T.blue, fontWeight:700, cursor:'pointer', fontFamily:F.sans }}>View All →</button>
            </div>
            <div style={{ padding:'4px 20px 20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 70px', padding:'8px 6px 4px' }}>
                {['Name','Price','Change'].map((h,i) => (
                  <div key={h} style={{ fontSize:10, color:T.text3, fontWeight:700, textAlign:i>0?'right':'left', letterSpacing:'.06em' }}>{h}</div>
                ))}
              </div>
              {displaySymbols.map(item => {
                const p = prices[item.symbol]; const pct = pctFor(item.symbol); const up = pct !== null && pct >= 0
                return (
                  <div key={item.symbol} className="market-row">
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ fontSize:15 }}>{item.flag}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:T.text0, fontFamily:F.sans }}>{shortSym(item.symbol)}</div>
                        <div style={{ fontSize:10, color:T.text3 }}>{item.name}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text0, textAlign:'right', fontFamily:F.mono }}>{p!=null?`$${p.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:pct==null?T.text3:up?T.green:T.red, textAlign:'right', fontFamily:F.mono }}>{pct!=null?`${pct>=0?'+':''}${pct.toFixed(2)}%`:'—'}</div>
                  </div>
                )
              })}
              <div style={{ marginTop:14 }}>
                <button onClick={onSignup} style={{ width:'100%', padding:'11px', background:T.blueLight, border:`1px solid #BFDBFE`, borderRadius:10, color:T.blue, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:F.sans }}
                  onMouseEnter={e=>e.currentTarget.style.background='#DBEAFE'}
                  onMouseLeave={e=>e.currentTarget.style.background=T.blueLight}
                >Start tracking markets →</button>
              </div>
            </div>
          </div>

          {/* News panel */}
          <div style={{ background:T.panelBg, borderRadius:20, border:`1px solid ${T.border}`, overflow:'hidden', backdropFilter:'blur(10px)', boxShadow:'0 8px 32px rgba(15,23,42,.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:15, fontWeight:800, color:T.text0, fontFamily:F.sans }}>Market News</span>
              <button onClick={onSignup} style={{ background:'none', border:'none', fontSize:12, color:T.blue, fontWeight:700, cursor:'pointer', fontFamily:F.sans }}>View All →</button>
            </div>
            <div style={{ padding:'4px 20px 20px' }}>
              {newsLoading ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ display:'inline-block', width:22, height:22, border:`2px solid ${T.border}`, borderTop:`2px solid ${T.blue}`, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                </div>
              ) : displayNews.slice(0,5).map((a,i) => (
                <div key={i} style={{ padding:'12px 0', borderBottom:i<4?`1px solid ${T.border}`:'none', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.querySelector('.nh').style.color=T.blue}
                  onMouseLeave={e=>e.currentTarget.querySelector('.nh').style.color=T.text1}
                >
                  <div className="nh" style={{ fontSize:13, color:T.text1, lineHeight:1.5, fontWeight:500, transition:'color .15s', fontFamily:F.sans }}>{a.title}</div>
                  <div style={{ fontSize:10, color:T.text3, marginTop:3 }}>{a.source?.name||a.source||'News'} · {a.publishedAt?new Date(a.publishedAt).toLocaleDateString():'Today'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" data-reveal style={{ padding:'96px 32px', maxWidth:1240, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div className="section-label">Key Features</div>
          <h2 className="section-h2">Everything you need to make smarter trades</h2>
          <p style={{ fontSize:15, color:T.text2, maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>QuantAI combines AI, global market data, and professional-grade tools into one clean interface — without the complexity.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:18 }}>
          {FEATURES.map((f,i) => (
            <div key={i} className="feature-card" style={{ animation:`fadeUp .5s ${i*.07}s both` }}>
              <div style={{ width:52, height:52, background:T.blueLight, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                {ICON_MAP[f.icon]
                  ? <img src={ICON_MAP[f.icon]} alt={f.title} style={{ width:30, height:30, objectFit:'contain' }} />
                  : <span style={{ fontSize:26 }}>{f.icon}</span>}
              </div>
              <h3 style={{ fontSize:17, fontWeight:700, color:T.text0, marginBottom:8, fontFamily:F.sans, letterSpacing:'-.01em' }}>{f.title}</h3>
              <p style={{ fontSize:14, color:T.text2, lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TRADE INTELLIGENCE ═══ */}
      <section id="trade-intelligence" data-reveal style={{ background:T.sectionBg, padding:'96px 32px', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, backdropFilter:'blur(12px)' }}>
        <div style={{ maxWidth:1240, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div className="section-label">Trade Intelligence</div>
            <h2 className="section-h2">From raw signals to a single trade decision</h2>
            <p style={{ fontSize:15, color:T.text2, maxWidth:680, margin:'0 auto', lineHeight:1.7 }}>
              QuantAI runs a coordinated 5-agent workflow and returns a clear verdict, confidence score, and a downloadable report so you can review and act faster.
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginBottom:34 }}>
            {TRADE_INTELLIGENCE_STEPS.map((item, i) => (
              <div key={item.title} className="feature-card" style={{ padding:'22px 18px', animation:`fadeUp .5s ${i*.08}s both` }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.blue, letterSpacing:'.08em', marginBottom:8 }}>STEP {String(i + 1).padStart(2, '0')}</div>
                <h3 style={{ fontSize:16, fontWeight:700, color:T.text0, marginBottom:8, fontFamily:F.sans }}>{item.title}</h3>
                <p style={{ fontSize:13, color:T.text2, lineHeight:1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-outline" onClick={onSignup}>Get Report</button>
            <button className="btn-primary" onClick={onSignup}>Try Trade Intelligence</button>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" data-reveal style={{ background:T.sectionBg, padding:'96px 32px', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, backdropFilter:'blur(12px)' }}>
        <div style={{ maxWidth:1240, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div className="section-label">How It Works</div>
            <h2 className="section-h2">Up and running in minutes</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:0 }}>
            {STEPS.map((step,i) => (
              <div key={i} style={{ padding:'0 32px', borderRight:i<STEPS.length-1?`1px solid ${T.border}`:'none', animation:`fadeUp .5s ${i*.1}s both` }}>
                <div style={{ fontFamily:F.serif, fontSize:56, fontWeight:400, color:T.blue, opacity:.13, lineHeight:1, marginBottom:10 }}>{step.num}</div>
                <h3 style={{ fontSize:17, fontWeight:700, color:T.text0, marginBottom:8, fontFamily:F.sans }}>{step.title}</h3>
                <p style={{ fontSize:14, color:T.text2, lineHeight:1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:56 }}>
            <button className="btn-primary" onClick={onSignup} style={{ padding:'14px 40px', fontSize:15, borderRadius:999 }}>Create Free Account</button>
            <div style={{ fontSize:12, color:T.text3, marginTop:10, fontFamily:F.sans }}>No credit card required · Free forever</div>
          </div>
        </div>
      </section>

      {/* ═══ WHY QUANTAI ═══ */}
      <section id="why-quantai" data-reveal style={{ padding:'96px 32px', maxWidth:1240, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div className="section-label">Why QuantAI</div>
          <h2 className="section-h2">What makes us different</h2>
          <p style={{ fontSize:15, color:T.text2, maxWidth:440, margin:'0 auto', lineHeight:1.7 }}>We built the tools we wished existed as traders. No fluff, no paywalls, no complexity.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:20 }}>
          {UNIQUE.map((u,i) => (
            <div key={i} style={{ padding:32, background:u.dark?(isDark?T.blueDark:'#EDE9FE'):'rgba(255,255,255,.75)', border:`1px solid ${u.dark?(isDark?T.blue:'#D8B4FE'):T.border}`, borderRadius:22, backdropFilter:'blur(10px)', animation:`fadeUp .5s ${i*.1}s both` }}>
              <div style={{ width:54, height:54, borderRadius:14, background:u.dark?(isDark?'rgba(167,139,250,.25)':'rgba(167,139,250,.15)'):T.blueLight, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                {ICON_MAP[u.icon]
                  ? <img src={ICON_MAP[u.icon]} alt={u.title} style={{ width:32, height:32, objectFit:'contain' }} />
                  : <span style={{ fontSize:28 }}>{u.icon}</span>}
              </div>
              <h3 style={{ fontSize:19, fontWeight:700, color:u.dark?(isDark?'#E9D5FF':'#6B21A8'):T.text0, marginBottom:10, fontFamily:F.sans, letterSpacing:'-.02em' }}>{u.title}</h3>
              <p style={{ fontSize:14, color:u.dark?(isDark?'#D8B4FE':'#7C3AED'):T.text2, lineHeight:1.65 }}>{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ MARKETS ═══ */}
      <section id="markets" data-reveal style={{ background:T.sectionBg, padding:'96px 32px', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, backdropFilter:'blur(12px)' }}>
        <div style={{ maxWidth:1240, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:72, alignItems:'center' }}>
          <div>
            <div className="section-label">Global Markets</div>
            <h2 className="section-h2">One platform, every market</h2>
            <p style={{ fontSize:15, color:T.text2, lineHeight:1.7, marginBottom:26 }}>Stop switching between apps. QuantAI covers stocks on 25+ exchanges worldwide — from Wall Street to Dalal Street, Tokyo to London — with live prices in native currencies and instant USD conversion.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:30 }}>
              {['NYSE','NASDAQ','NSE','BSE','LSE','TSE','HKEX','XETRA','ASX','KRX','SGX','B3'].map(ex => (
                <span key={ex} style={{ fontSize:12, fontWeight:700, color:T.blue, background:'rgba(255,255,255,.8)', borderRadius:8, padding:'5px 12px', border:`1px solid #BFDBFE`, backdropFilter:'blur(8px)' }}>{ex}</span>
              ))}
              <span style={{ fontSize:12, color:T.text3, padding:'5px 10px' }}>+13 more</span>
            </div>
            <button className="btn-primary" onClick={onSignup}>Explore Markets</button>
          </div>
          <div style={{ background:T.glassBg, borderRadius:20, padding:22, border:`1px solid ${T.border}`, backdropFilter:'blur(12px)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:T.text0, marginBottom:14, fontFamily:F.sans }}>Live Prices</div>
            {MARKET_SYMBOLS.slice(0,6).map(item => {
              const p = prices[item.symbol]; const pct = pctFor(item.symbol); const up = pct!==null&&pct>=0
              return (
                <div key={item.symbol} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', marginBottom:6, background:T.panelBg, borderRadius:10, border:`1px solid ${T.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:15 }}>{item.flag}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:800, color:T.text0 }}>{shortSym(item.symbol)}</div>
                      <div style={{ fontSize:10, color:T.text3 }}>{item.exchange}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text0, fontFamily:F.mono }}>{p!=null?`$${p.toLocaleString(undefined,{maximumFractionDigits:2})}`:'—'}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:pct==null?T.text3:up?T.green:T.red, fontFamily:F.mono }}>{pct!=null?`${pct>=0?'+':''}${pct.toFixed(2)}%`:'—'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ FULL NEWS SECTION ═══ */}
      <section data-reveal style={{ padding:'96px 32px', maxWidth:1240, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div className="section-label">Market News</div>
          <h2 className="section-h2">Stay ahead of the market</h2>
          <p style={{ fontSize:15, color:T.text2 }}>Real-time news with AI sentiment scoring. Know what's moving markets before you trade.</p>
        </div>
        {newsLoading ? (
          <div style={{ textAlign:'center', padding:40 }}>
            <div style={{ display:'inline-block', width:28, height:28, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.blue}`, borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:18 }}>
            {displayNews.map((a,i) => {
              const sentiments = ['Bullish','Bearish','Neutral']
              const sentColors = [[T.green,T.greenBg],[T.red,T.redBg],['#0369A1','#F0F9FF']]
              const s = sentiments[i%3]; const [sc,sb] = sentColors[i%3]
              return (
                <div key={i} className="news-card" style={{ animation:`fadeUp .5s ${i*.07}s both` }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:sb, color:sc, borderRadius:100, padding:'3px 10px', fontSize:11, fontWeight:700, marginBottom:10 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'currentColor' }}/>{s} Sentiment
                  </div>
                  <h3 style={{ fontSize:14, fontWeight:700, color:T.text0, lineHeight:1.5, marginBottom:10, fontFamily:F.sans }}>{a.title}</h3>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:T.text3, fontWeight:600 }}>{a.source?.name||a.source||'News'}</span>
                    <span style={{ fontSize:11, color:T.text3 }}>{a.publishedAt?new Date(a.publishedAt).toLocaleDateString():'Today'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:36 }}>
          <button className="btn-outline" onClick={onSignup} style={{ padding:'12px 32px', fontSize:14, borderRadius:999 }}>
            Sign up to see live news with AI sentiment →
          </button>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section data-reveal style={{ background:`linear-gradient(135deg,${T.blue} 0%,#1E40AF 100%)`, padding:'80px 32px', position:'relative', overflow:'hidden' }}>
        {/* Blob */}
        <div style={{ position:'absolute', top:'-40%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:660, margin:'0 auto', textAlign:'center', position:'relative' }}>
          <h2 style={{ fontFamily:F.serif, fontSize:'clamp(28px,4vw,50px)', fontWeight:400, color:'#fff', letterSpacing:'-.02em', marginBottom:14, lineHeight:1.15 }}>
            Start making smarter trading decisions today
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,.75)', marginBottom:36, lineHeight:1.65, fontFamily:F.sans }}>
            Join traders using QuantAI to analyse global markets, get AI signals, and trade risk-free with paper accounts.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={onSignup} style={{ background:'#fff', color:T.blue, border:'none', borderRadius:999, padding:'14px 36px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:F.sans, boxShadow:'0 8px 24px rgba(0,0,0,.15)', transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 32px rgba(0,0,0,.2)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.15)'}}
            >Create Free Account</button>
            <button onClick={onLogin} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1.5px solid rgba(255,255,255,.4)', borderRadius:999, padding:'14px 32px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:F.sans, transition:'all .2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.2)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.12)'}
            >Log In</button>
          </div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginTop:14, fontFamily:F.sans }}>No credit card required · Free to use</div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer data-reveal style={{ background:T.footerBg, padding:'36px 32px' }}>
        <div style={{ maxWidth:1240, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img src={candleStickLogo} alt="QuantAI" style={{ width:28, height:28, objectFit:'contain' }} />
            <span style={{ fontSize:16, fontWeight:900, color:'#fff', fontFamily:F.sans }}>Quant<span style={{ color:'#60A5FA' }}>AI</span></span>
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