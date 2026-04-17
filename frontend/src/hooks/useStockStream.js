import { useEffect, useRef, useState, useCallback } from 'react'

export function useStockStream(symbol) {
  const [price,     setPrice]     = useState(null)
  const [decision,  setDecision]  = useState(null)
  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState(null)
  const wsRef = useRef(null)

  const connect = useCallback(() => {
    if (!symbol) return

    const url = `ws://${window.location.host}/ws/price/${symbol.toUpperCase()}`
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
      setTimeout(connect, 5000)
    }
  }, [symbol])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  return { price, decision, connected, error }
}