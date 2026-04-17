import { useState, useCallback, useEffect } from 'react'

let _addToast = null

export function useToasts() {
  const [toasts, setToasts] = useState([])

  const add = useCallback((toast) => {
    const id = Date.now()
    setToasts(prev => [...prev.slice(-4), { id, ...toast }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, toast.duration || 5000)
  }, [])

  useEffect(() => { _addToast = add }, [add])

  return { toasts }
}

export function toast(msg) {
  _addToast?.(msg)
}

const ACTION_COLOR = { BUY: '#22c55e', SELL: '#ef4444', HOLD: '#a0a0c0' }

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={styles.container}>
      {toasts.map(t => (
        <div key={t.id} style={{
          ...styles.toast,
          borderLeft: `4px solid ${ACTION_COLOR[t.action] || '#7c6af7'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <strong style={{ color: ACTION_COLOR[t.action] || '#e0e0f0' }}>
              {t.action ? `${t.action} — ${t.symbol}` : t.title}
            </strong>
          </div>
          <p style={styles.msg}>{t.message}</p>
        </div>
      ))}
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed', bottom: 24, right: 24,
    display: 'flex', flexDirection: 'column', gap: 8, zIndex: 999,
  },
  toast: {
    background: '#1e1e2e', border: '1px solid #33334a',
    borderRadius: 10, padding: '12px 16px', minWidth: 260, maxWidth: 340,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    animation: 'slideIn 0.2s ease',
  },
  msg: { color: '#888', fontSize: 12, lineHeight: 1.4 },
}