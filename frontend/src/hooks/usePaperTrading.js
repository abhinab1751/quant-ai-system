import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getSessions, getPortfolio, getTrades, getEquityCurve,
  getOrders, placeOrder, placeAIOrder, cancelOrder,
  createSession, resetSession, activateSession, forceSnapshot,
} from '../api/paperClient'

const POLL_INTERVAL = 15_000  

export function usePaperTrading(userId = null) {
  const [sessions,    setSessions]    = useState([])
  const [sessionId,   setSessionId]   = useState(null)
  const [portfolio,   setPortfolio]   = useState(null)
  const [trades,      setTrades]      = useState([])
  const [equity,      setEquity]      = useState([])
  const [orders,      setOrders]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [error,       setError]       = useState(null)
  const [lastOrderResult, setLastOrderResult] = useState(null)
  const pollRef = useRef(null)

  const bootstrap = useCallback(async () => {
    setLoading(true)
    try {
      const all = await getSessions()
      setSessions(all)
      const active = all.find(s => s.is_active) || all[0]
      if (active) {
        setSessionId(active.id)
      } else {
        setSessionId(null)
        setPortfolio(null)
        setTrades([])
        setEquity([])
        setOrders([])
      }
    } catch (e) {
      setError(e.message)
      setSessionId(null)
      setPortfolio(null)
      setTrades([])
      setEquity([])
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setSessions([])
    setSessionId(null)
    setPortfolio(null)
    setTrades([])
    setEquity([])
    setOrders([])
    setError(null)

    if (!userId) {
      setLoading(false)
      return
    }

    bootstrap()
  }, [bootstrap, userId])

  const loadSession = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [port, tradeList, eq, orderList] = await Promise.all([
        getPortfolio(id),
        getTrades(id, 100),
        getEquityCurve(id, 500),
        getOrders(id, 50),
      ])
      setPortfolio(port)
      setTrades(tradeList.trades || [])
      setEquity(eq.equity || [])
      setOrders(orderList)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!sessionId) return
    loadSession(sessionId)

    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const [port, eq] = await Promise.all([
          getPortfolio(sessionId),
          getEquityCurve(sessionId, 500),
        ])
        setPortfolio(port)
        setEquity(eq.equity || [])
      } catch { /* silently ignore poll errors */ }
    }, POLL_INTERVAL)

    return () => clearInterval(pollRef.current)
  }, [sessionId, loadSession])

  const submitOrder = useCallback(async (symbol, side, quantity, orderType = 'MARKET', limitPrice = null) => {
    setOrderLoading(true)
    setLastOrderResult(null)
    setError(null)
    try {
      const result = await placeOrder(sessionId, symbol, side, quantity, orderType, limitPrice)
      setLastOrderResult({ ...result, ts: Date.now() })
      await loadSession(sessionId)
      return result
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setOrderLoading(false)
    }
  }, [sessionId, loadSession])

  const submitAIOrder = useCallback(async (symbol, action, confidence, reason) => {
    setOrderLoading(true)
    setLastOrderResult(null)
    try {
      const result = await placeAIOrder(sessionId, symbol, action, confidence, reason)
      if (result?.status === 'FILLED') {
        setLastOrderResult({ ...result, ts: Date.now() })
        await loadSession(sessionId)
      }
      return result
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setOrderLoading(false)
    }
  }, [sessionId, loadSession])

  const cancelPendingOrder = useCallback(async (orderId) => {
    try {
      await cancelOrder(orderId)
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
    } catch (e) {
      setError(e.message)
    }
  }, [])

  const newSession = useCallback(async (name, capital) => {
    const s = await createSession(name, capital)
    setSessions(prev => [s, ...prev])
    setSessionId(s.id)
  }, [])

  const reset = useCallback(async () => {
    if (!sessionId) return
    await resetSession(sessionId)
    await loadSession(sessionId)
  }, [sessionId, loadSession])

  const switchSession = useCallback(async (id) => {
    await activateSession(id)
    setSessionId(id)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    sessions, sessionId, portfolio, trades, equity, orders,
    loading, orderLoading, error, lastOrderResult,
    newSession, reset, switchSession,
    submitOrder, submitAIOrder, cancelPendingOrder,
    clearError, refresh: () => loadSession(sessionId),
    activeSession: sessions.find(s => s.id === sessionId) || null,
  }
}