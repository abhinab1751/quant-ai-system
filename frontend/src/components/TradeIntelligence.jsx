import { useState, useRef, useEffect } from 'react'
import { downloadTradeIntelligenceReport } from '../api/client'
import { C, FONTS, RADIUS, Card, CardHeader } from './theme'
import brainLogo from '../assets/brain.png'
import earthLogo from '../assets/earth.png'
import chartLogo from '../assets/map.png'
import newsLogo from '../assets/news.png'
import riskLogo from '../assets/bag.png'

async function parseResponseBody(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json().catch(() => null)
  }

  const text = await res.text().catch(() => '')
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

async function fetchTradeIntelligence(symbol, intent) {
  const token = localStorage.getItem('qai_access')
  if (!token) {
    throw new Error('Please sign in to run Trade Intelligence.')
  }
  const res = await fetch('/api/trade-intelligence/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol, intent }),
  })
  const data = await parseResponseBody(res)
  if (res.status === 401) {
    throw new Error('Your session expired. Please sign in again.')
  }
  if (!res.ok) throw new Error(data?.detail || data?.message || data?.error || `Error ${res.status}`)
  return data
}

const VERDICT_CFG = {
  'STRONG BUY':   { color: '#16A34A', bg: 'rgba(22,163,74,0.1)',  border: '#BBF7D0', icon: '🚀', glow: '0 0 32px rgba(22,163,74,0.35)' },
  'CAUTIOUS BUY': { color: '#65A30D', bg: 'rgba(101,163,13,0.1)', border: '#D9F99D', icon: '📈', glow: '0 0 24px rgba(101,163,13,0.25)' },
  'WAIT':         { color: '#D97706', bg: 'rgba(217,119,6,0.1)',  border: '#FDE68A', icon: '⏳', glow: '0 0 24px rgba(217,119,6,0.2)'  },
  'CAUTIOUS SELL':{ color: '#DC7B2D', bg: 'rgba(220,123,45,0.1)', border: '#FED7AA', icon: '📉', glow: '0 0 24px rgba(220,123,45,0.25)'},
  'STRONG SELL':  { color: '#DC2626', bg: 'rgba(220,38,38,0.1)',  border: '#FECACA', icon: '⚠️', glow: '0 0 32px rgba(220,38,38,0.35)' },
  'AVOID':        { color: '#7F1D1D', bg: 'rgba(127,29,29,0.12)', border: '#FCA5A5', icon: '🚫', glow: '0 0 24px rgba(127,29,29,0.3)'  },
  'SELL':         { color: '#DC2626', bg: 'rgba(220,38,38,0.1)',  border: '#FECACA', icon: '📉', glow: '0 0 24px rgba(220,38,38,0.3)'  },
  'BUY':          { color: '#16A34A', bg: 'rgba(22,163,74,0.1)',  border: '#BBF7D0', icon: '📈', glow: '0 0 24px rgba(22,163,74,0.3)'  },
  'EVALUATE':     { color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: '#C7D2FE', icon: '🔍', glow: '0 0 24px rgba(99,102,241,0.25)'},
}

function getVerdictCfg(verdict) {
  if (!verdict) return VERDICT_CFG['EVALUATE']
  const key = Object.keys(VERDICT_CFG).find(k => verdict.toUpperCase().includes(k))
  return key ? VERDICT_CFG[key] : VERDICT_CFG['EVALUATE']
}

function LogoIcon({ src, alt, size = 18, opacity = 1 }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: size, height: size, objectFit: 'contain', opacity, display: 'block' }}
    />
  )
}

function AgentStep({ index, name, icon, status, label }) {
  const colors = { done: C.green, active: C.blue, pending: C.text4 }
  const c = colors[status] || C.text4
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: status === 'done' ? C.greenBg : status === 'active' ? C.blueLight : C.inputBg,
        border: `2px solid ${c}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
        boxShadow: status === 'active' ? `0 0 12px ${C.blue}50` : 'none',
        transition: 'all 0.4s ease',
        flexShrink: 0,
      }}>
        {status === 'done' ? '✓' : status === 'active' ? (
          <span style={{ animation: 'cb-spin 1s linear infinite', display: 'block' }}>⟳</span>
        ) : icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: status === 'pending' ? C.text3 : C.text1 }}>{name}</div>
        <div style={{ fontSize: 11, color: c, fontWeight: 500 }}>{label}</div>
      </div>
      {index < 3 && (
        <div style={{
          position: 'absolute', left: 15, top: 32,
          width: 2, height: 20,
          background: status === 'done' ? C.green : C.border,
          transition: 'background 0.4s',
        }} />
      )}
    </div>
  )
}

function MetricPill({ label, value, color }) {
  return (
    <div style={{
      background: `${color}12`,
      border: `1px solid ${color}35`,
      borderRadius: RADIUS.md,
      padding: '8px 12px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color, fontFamily: FONTS.mono }}>{value}</div>
    </div>
  )
}
function ConfidenceArc({ pct, color }) {
  const r = 36, cx = 44, cy = 44
  const circumference = 2 * Math.PI * r
  const dash = (pct / 100) * circumference

  return (
    <svg width={88} height={88} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={6} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize={15} fontWeight={800} fontFamily={FONTS.mono}>
        {pct}%
      </text>
    </svg>
  )
}

function TradeBriefText({ text }) {
  if (!text) return null

  const lines = text.split('\n').filter(Boolean)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, i) => {
        const isBold = line.startsWith('**') || line.startsWith('##')
        const isAction = line.startsWith('-') || line.startsWith('•')
        const cleaned = line.replace(/\*\*/g, '').replace(/##/g, '').replace(/^[-•]\s*/, '')

        if (isBold) return (
          <div key={i} style={{ fontSize: 12, fontWeight: 800, color: C.text0, letterSpacing: '-0.01em', marginTop: 8 }}>
            {cleaned}
          </div>
        )
        if (isAction) return (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: C.blue, fontSize: 10, marginTop: 2, flexShrink: 0 }}>▶</span>
            <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>{cleaned}</span>
          </div>
        )
        return (
          <div key={i} style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>{cleaned}</div>
        )
      })}
    </div>
  )
}
export default function TradeIntelligence({ symbol }) {
  const [intent, setIntent] = useState('EVALUATE')
  const [loading, setLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [agentStep, setAgentStep] = useState(-1) 
  const timerRefs = useRef([])
  const hasToken = Boolean(localStorage.getItem('qai_access'))
  const agents = [
    { name: 'Market Context', icon: <LogoIcon src={earthLogo} alt="Market context" />, desc: 'Price, Fear/Greed, Session' },
    { name: 'Technical Analysis', icon: <LogoIcon src={chartLogo} alt="Technical analysis" />, desc: 'RSI, MACD, Bollinger Bands' },
    { name: 'Sentiment', icon: <LogoIcon src={newsLogo} alt="Sentiment" />, desc: 'Momentum, fear/greed, bias' },
    { name: 'Risk Assessment', icon: <LogoIcon src={riskLogo} alt="Risk assessment" />, desc: 'Volatility, ATR, Position Size' },
    { name: 'Synthesis', icon: <LogoIcon src={brainLogo} alt="Synthesis" />, desc: 'Trade Brief Generation' },
  ]

  useEffect(() => {
    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = []

    if (loading) {
      setAgentStep(0)
      const delays = [0, 3500, 7000, 10500, 14000]
      agents.forEach((_, step) => {
        const timeoutId = setTimeout(() => setAgentStep(step), delays[step])
        timerRefs.current.push(timeoutId)
      })
    } else if (result) {
      setAgentStep(agents.length)
    }

    return () => {
      timerRefs.current.forEach(clearTimeout)
      timerRefs.current = []
    }
  }, [loading, result])

  const run = async () => {
    if (loading) return
    if (!hasToken) {
      setError('Please sign in to run Trade Intelligence.')
      return
    }
    setLoading(true)
    setResult(null)
    setError(null)
    setAgentStep(0)
    try {
      const data = await fetchTradeIntelligence(symbol, intent)
      setResult(data)
      setAgentStep(agents.length)
    } catch (e) {
      setError(e.message)
      setAgentStep(-1)
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async () => {
    if (loading || reportLoading) return
    if (!hasToken) {
      setError('Please sign in to download a report.')
      return
    }

    setReportLoading(true)
    setError(null)
    try {
      const { blob, filename } = await downloadTradeIntelligenceReport(symbol, intent)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setReportLoading(false)
    }
  }

  const vcfg = result ? getVerdictCfg(result.verdict) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {!hasToken && (
        <Card>
          <div style={{ padding: '16px 20px', color: C.text2, fontSize: 13, lineHeight: 1.6 }}>
            Sign in to run the Trade Intelligence analysis. This endpoint is protected and requires a valid session.
          </div>
        </Card>
      )}

      {/* ── Header Card ── */}
      <Card>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

            {/* Left: Title */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: RADIUS.md,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                }}>
                  <LogoIcon src={brainLogo} alt="Trade Intelligence" size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.text0, letterSpacing: '-0.02em' }}>
                    Trade Intelligence
                  </div>
                  <div style={{ fontSize: 12, color: C.text2 }}>
                      5-Agent LangGraph Analysis · {symbol}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 8, maxWidth: 420, lineHeight: 1.6 }}>
                Multi-agent AI pipeline that analyzes market context, technicals, and risk in parallel to produce a single actionable Trade Brief.
              </div>
            </div>

            {/* Right: Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              {/* Intent Selector */}
              <div style={{
                display: 'flex', background: C.inputBg,
                border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: 3, gap: 3
              }}>
                {['BUY', 'EVALUATE', 'SELL'].map(opt => {
                  const active = intent === opt
                  const color = opt === 'BUY' ? C.green : opt === 'SELL' ? C.red : C.blue
                  return (
                    <button key={opt} onClick={() => setIntent(opt)} style={{
                      padding: '7px 16px', borderRadius: RADIUS.sm, border: 'none',
                      background: active ? color : 'transparent',
                      color: active ? '#fff' : C.text2,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: FONTS.sans, transition: 'all 0.15s',
                      boxShadow: active ? `0 2px 8px ${color}40` : 'none',
                    }}>{opt}</button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {/* Run Button */}
                <button onClick={run} disabled={loading || reportLoading} style={{
                  background: loading
                    ? C.inputBg
                    : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: 'none', borderRadius: RADIUS.md,
                  color: loading ? C.text3 : '#fff',
                  padding: '10px 24px', fontSize: 14, fontWeight: 700,
                  cursor: loading || reportLoading ? 'not-allowed' : 'pointer',
                  fontFamily: FONTS.sans,
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.45)',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {loading ? (
                    <>
                      <span style={{ animation: 'cb-spin 1s linear infinite', display: 'block' }}>⟳</span>
                      Agents Running…
                    </>
                  ) : (
                    <>🚀 Run Analysis</>
                  )}
                </button>

                <button onClick={downloadReport} disabled={loading || reportLoading || !hasToken} style={{
                  background: reportLoading ? C.inputBg : C.cardBg,
                  border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
                  color: reportLoading ? C.text3 : C.text1,
                  padding: '10px 18px', fontSize: 14, fontWeight: 700,
                  cursor: loading || reportLoading || !hasToken ? 'not-allowed' : 'pointer',
                  fontFamily: FONTS.sans,
                  boxShadow: 'none',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {reportLoading ? (
                    <>
                      <span style={{ animation: 'cb-spin 1s linear infinite', display: 'block' }}>⟳</span>
                      Building PDF…
                    </>
                  ) : (
                    <>📄 PDF Report</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Agent Pipeline Visualization ── */}
      {(loading || agentStep >= 0) && (
        <Card>
          <CardHeader title="Agent Pipeline" right={
            agentStep >= agents.length ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>✓ Complete</span>
            ) : loading ? (
              <span style={{ fontSize: 11, color: C.text3 }}>Processing…</span>
            ) : null
          } />
          <div style={{ padding: '18px 24px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agents.map((agent, i) => {
              const status = agentStep >= agents.length ? 'done'
                : agentStep === i ? 'active'
                : agentStep > i ? 'done'
                : 'pending'
              return (
                <div key={i} style={{ position: 'relative', paddingBottom: i < agents.length - 1 ? 8 : 0 }}>
                  <AgentStep
                    index={i}
                    name={agent.name}
                    icon={agent.icon}
                    status={status}
                    label={status === 'active' ? 'Analyzing…' : status === 'done' ? 'Complete' : agent.desc}
                  />
                  {i < 3 && (
                    <div style={{
                      position: 'absolute', left: 15, top: 36,
                      width: 2, height: 20,
                      background: agentStep > i ? C.green : C.border,
                      transition: 'background 0.5s',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Error State ── */}
      {error && (
        <Card style={{ border: `1.5px solid #FECACA` }}>
          <div style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 4 }}>Analysis Failed</div>
              <div style={{ fontSize: 12, color: C.text2 }}>{error}</div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Result: Trade Brief ── */}
      {result && vcfg && (
        <>
          {/* Verdict Hero */}
          <div style={{
            background: vcfg.bg,
            border: `2px solid ${vcfg.border}`,
            borderRadius: RADIUS.xl,
            padding: '24px 28px',
            boxShadow: vcfg.glow,
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            {/* Arc */}
            <ConfidenceArc pct={result.confidence} color={vcfg.color} />

            {/* Verdict text */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: vcfg.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {vcfg.icon} Agent Verdict
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: vcfg.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {result.verdict}
              </div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 6 }}>
                {result.symbol} · {new Date(result.timestamp).toLocaleTimeString()} · {result.agents_used?.length || agents.length} agents
              </div>
            </div>

            {/* Quick metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {result.supporting_data?.rsi && (
                <MetricPill
                  label="RSI"
                  value={result.supporting_data.rsi?.toFixed(1)}
                  color={result.supporting_data.rsi > 70 ? C.red : result.supporting_data.rsi < 30 ? C.green : C.amber}
                />
              )}
              {result.supporting_data?.fear_greed && (
                <MetricPill
                  label="Fear/Greed"
                  value={result.supporting_data.fear_greed}
                  color={result.supporting_data.fear_greed > 65 ? C.red : result.supporting_data.fear_greed < 35 ? C.green : C.amber}
                />
              )}
              {result.supporting_data?.volatility && (
                <MetricPill
                  label="Volatility"
                  value={`${result.supporting_data.volatility?.toFixed(0)}%`}
                  color={result.supporting_data.volatility > 40 ? C.red : C.green}
                />
              )}
              {result.supporting_data?.risk_level && (
                <MetricPill
                  label="Risk"
                  value={result.supporting_data.risk_level}
                  color={result.supporting_data.risk_level === 'HIGH' ? C.red : result.supporting_data.risk_level === 'LOW' ? C.green : C.amber}
                />
              )}
            </div>
          </div>

          {/* Full Brief */}
          <Card>
            <CardHeader
              title="Full Trade Brief"
              right={
                <div style={{
                  background: C.blueLight, border: `1px solid #BFDBFE`,
                  borderRadius: RADIUS.full, padding: '2px 10px',
                  fontSize: 10, fontWeight: 700, color: C.blue,
                }}>
                  Groq LLaMA · LangGraph
                </div>
              }
            />
            <div style={{ padding: '20px 24px' }}>
              <TradeBriefText text={result.brief} />
            </div>
          </Card>

          {/* Disclaimer */}
          <div style={{
            padding: '10px 16px',
            background: C.inputBg,
            borderRadius: RADIUS.md,
            border: `1px solid ${C.border}`,
          }}>
            <p style={{ fontSize: 11, color: C.text3, lineHeight: 1.5, margin: 0 }}>
              ⚠️ <strong>Not financial advice.</strong> This analysis is generated by AI agents and is for educational purposes only. Always do your own research and consult a qualified financial advisor before making investment decisions. Past performance does not guarantee future results.
            </p>
          </div>
        </>
      )}

      {/* ── Empty State ── */}
      {!loading && !result && !error && (
        <Card>
          <div style={{
            padding: '60px 40px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{ fontSize: 48 }}>🧠</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.text1, letterSpacing: '-0.02em' }}>
              Multi-Agent Trade Intelligence
            </div>
            <div style={{ fontSize: 13, color: C.text2, maxWidth: 380, lineHeight: 1.7 }}>
              Select your intent (Buy/Evaluate/Sell), then run the 5-agent pipeline.
              Each agent specializes in a different dimension of the trade — together they
              produce a unified, actionable Trade Brief in ~15 seconds.
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {[
                { icon: <LogoIcon src={earthLogo} alt="Market Context" size={24} />, label: 'Market Context' },
                { icon: <LogoIcon src={chartLogo} alt="Technicals" size={24} />, label: 'Technicals' },
                { icon: <LogoIcon src={riskLogo} alt="Risk" size={24} />, label: 'Risk' },
                { icon: <LogoIcon src={brainLogo} alt="Synthesis" size={24} />, label: 'Synthesis' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: C.inputBg, border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.md, padding: '12px 16px', minWidth: 80,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 24 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.text3 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}