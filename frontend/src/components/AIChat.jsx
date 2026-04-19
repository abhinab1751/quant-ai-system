import { useState, useRef, useEffect } from 'react'
import { C, FONTS, RADIUS, Card, CardHeader } from './theme'

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

const QUICK = [
  'Analyse technicals',
  'Buy, hold, or sell?',
  'Key risks?',
  'Explain ML signal',
]

export default function AIChat({ symbol, decisionData }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: `Hi! I'm your AI trading analyst powered by LLaMA 3.3. I'm analysing **${symbol}** — ask me anything about technicals, signals, or strategy.`,
  }])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    setMessages([{ role: 'assistant', text: `Switched to **${symbol}**. What would you like to know?` }])
  }, [symbol])

  const sysPrompt = () => {
    let p = `You are a professional quantitative trading analyst. Current symbol: ${symbol}.`
    if (decisionData) {
      p += ` Latest AI Decision: ${decisionData.action} (score: ${decisionData.score ?? '—'}), ML: ${decisionData.ml_prediction} (${decisionData.ml_confidence ? (decisionData.ml_confidence * 100).toFixed(0) + '%' : '—'}), Sentiment: ${decisionData.sentiment}.`
    }
    p += ' Be concise (under 200 words), professional, and cite data. No markdown headers. Use plain text with line breaks.'
    return p
  }

  const send = async (text) => {
    const q = (text || input).trim()
    if (!q || loading) return
    setInput('')
    const newMsgs = [...messages, { role: 'user', text: q }]
    setMessages(newMsgs)
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Add VITE_GROQ_API_KEY to frontend/.env — free at console.groq.com')

      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: GROQ_MODEL, max_tokens: 350, temperature: 0.45,
          messages: [
            { role: 'system', content: sysPrompt() },
            ...newMsgs.map(m => ({ role: m.role, content: m.text })),
          ],
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`) }
      const data  = await res.json()
      setMessages(p => [...p, { role: 'assistant', text: data.choices?.[0]?.message?.content || 'No response.' }])
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', text: `⚠ ${e.message}` }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: 440 }}>
      <CardHeader
        title="AI Terminal"
        right={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{
              background: C.blueLight, border: `1px solid ${C.blueBorder}`,
              borderRadius: RADIUS.full, padding: '2px 8px',
              fontSize: 10, fontWeight: 700, color: C.blue,
            }}>LLaMA 3.3 · Groq</div>
            <div style={{
              background: C.greenBg, border: `1px solid ${C.greenBorder}`,
              borderRadius: RADIUS.full, padding: '2px 8px',
              fontSize: 10, fontWeight: 700, color: C.green,
            }}>{symbol}</div>
          </div>
        }
      />

      {/* Quick prompts */}
      <div style={{
        padding: '8px 16px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', gap: 6, flexWrap: 'wrap', background: C.inputBg,
      }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} disabled={loading} style={{
            background: C.cardBg, border: `1px solid ${C.border}`,
            borderRadius: RADIUS.full, color: C.text1,
            padding: '4px 12px', fontSize: 11, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s', fontFamily: FONTS.sans,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text1 }}
          >{q}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 4, letterSpacing: '0.04em' }}>
              {m.role === 'user' ? 'You' : 'QuantAI'}
            </div>
            <div style={{
              maxWidth: '86%', padding: '10px 14px',
              borderRadius: m.role === 'user'
                ? `${RADIUS.lg} ${RADIUS.lg} ${RADIUS.sm} ${RADIUS.lg}`
                : `${RADIUS.lg} ${RADIUS.lg} ${RADIUS.lg} ${RADIUS.sm}`,
              background: m.role === 'user' ? C.blue : C.inputBg,
              color: m.role === 'user' ? '#fff' : C.text1,
              fontSize: 13, lineHeight: 1.6,
              boxShadow: m.role === 'user' ? `0 4px 12px ${C.blue}30` : C.shadow,
              fontWeight: 400,
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 4 }}>QuantAI</div>
            <div style={{
              background: C.inputBg, borderRadius: `${RADIUS.lg} ${RADIUS.lg} ${RADIUS.lg} ${RADIUS.sm}`,
              padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: C.text3,
                  animation: `cb-pulse 1.2s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask anything about this stock…"
          style={{
            flex: 1, background: C.inputBg,
            border: `1.5px solid ${C.border}`,
            borderRadius: RADIUS.full, color: C.text1,
            padding: '9px 16px', fontSize: 13,
            fontFamily: FONTS.sans, transition: 'border-color 0.2s',
          }}
        />
        <button onClick={() => send()} disabled={loading} style={{
          background: loading ? C.border : C.blue,
          border: 'none', borderRadius: RADIUS.full,
          color: '#fff', padding: '9px 20px',
          fontSize: 13, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : `0 4px 12px ${C.blue}40`,
          transition: 'all 0.2s', fontFamily: FONTS.sans,
        }}>Send</button>
      </div>

      {!import.meta.env.VITE_GROQ_API_KEY && (
        <div style={{ padding: '6px 14px', background: C.amberBg, borderTop: `1px solid ${C.amberBorder}` }}>
          <span style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>
            ⚑ Add VITE_GROQ_API_KEY to frontend/.env — free at console.groq.com
          </span>
        </div>
      )}
    </Card>
  )
}