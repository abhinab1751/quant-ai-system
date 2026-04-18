import { useState, useCallback, useEffect } from 'react'
import { C, FONTS, RADIUS } from './theme'

let _addToast = null

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const add = useCallback(toast => {
    const id = Date.now()
    setToasts(p => [...p.slice(-4), { id, ...toast }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), toast.duration || 5000)
  }, [])
  useEffect(() => { _addToast = add }, [add])
  return { toasts }
}

export function toast(msg) { _addToast?.(msg) }

const AC2 = { BUY: C.green, SELL: C.red, HOLD: C.amber }

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
      {toasts.map(t => {
        const color  = AC2[t.action] || C.blue
        const border = t.action === 'BUY' ? '#BBF7D0' : t.action === 'SELL' ? '#FECACA' : '#BFDBFE'
        return (
          <div key={t.id} style={{
            background: C.cardBg,
            border: `1.5px solid ${border}`,
            borderLeft: `4px solid ${color}`,
            borderRadius: RADIUS.lg,
            padding: '14px 18px',
            minWidth: 280, maxWidth: 360,
            boxShadow: C.shadowLg,
            animation: 'cb-slide-in 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '-0.01em' }}>
                {t.action ? `${t.action} — ${t.symbol}` : (t.title || 'Alert')}
              </span>
              <span style={{ fontSize: 10, color: C.text3, fontFamily: FONTS.mono }}>
                {new Date().toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
            <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{t.message}</p>
          </div>
        )
      })}
    </div>
  )
}