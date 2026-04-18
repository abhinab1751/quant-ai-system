import { useEffect, useRef, useState, useCallback } from 'react'

function toWebSocketBase(raw) {
  if (!raw) return null
  const normalized = raw.replace(/\/$/, '')
  if (normalized.startsWith('ws://') || normalized.startsWith('wss://')) {
    return normalized
  }
  if (normalized.startsWith('http://')) {
    return `ws://${normalized.slice('http://'.length)}`
  }
  if (normalized.startsWith('https://')) {
    return `wss://${normalized.slice('https://'.length)}`
  }
  return normalized
}

function getWebSocketBase() {
  const fromEnv = toWebSocketBase(import.meta.env.VITE_WS_BASE)
  if (fromEnv) return fromEnv

  if (import.meta.env.DEV) {
    // In dev, connect directly to backend to avoid Vite port/proxy mismatch issues.
    return 'ws://localhost:8000'
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function useStockStream(symbol) {
  const [price,     setPrice]     = useState(null)
  const [decision,  setDecision]  = useState(null)
  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState(null)
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const shouldReconnectRef = useRef(true)

  const connect = useCallback(() => {
    if (!symbol) return
    if (!shouldReconnectRef.current) return

    const base = getWebSocketBase()
    const url = `${base}/ws/price/${symbol.toUpperCase()}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError(null)
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'price')    setPrice(msg)
        if (msg.type === 'decision') setDecision(msg)
      } catch { /* ignore malformed */ }
    }

    ws.onerror = () => {
      setError('WebSocket connection failed')
      setConnected(false)
    }

    ws.onclose = () => {
      setConnected(false)
      if (!shouldReconnectRef.current) return
      reconnectTimerRef.current = setTimeout(connect, 5000)
    }
  }, [symbol])

  useEffect(() => {
    shouldReconnectRef.current = true
    connect()

    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      wsRef.current?.close()
    }
  }, [connect])

  return { price, decision, connected, error }
}