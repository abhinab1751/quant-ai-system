const BASE = '/api/paper'

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export const getSessions          = ()                  => req('GET',  '/sessions')
export const createSession        = (name, capital)     => req('POST', '/sessions', { name, initial_capital: capital })
export const resetSession         = (id)                => req('DELETE', `/sessions/${id}/reset`)
export const activateSession      = (id)                => req('POST', `/sessions/${id}/activate`)
export const forceSnapshot        = (id)                => req('POST', `/sessions/${id}/snapshot`)

export const getPortfolio         = (id)                => req('GET',  `/sessions/${id}/portfolio`)
export const getPositions         = (id)                => req('GET',  `/sessions/${id}/positions`)
export const getTrades            = (id, limit = 100)   => req('GET',  `/sessions/${id}/trades?limit=${limit}`)
export const getEquityCurve       = (id, limit = 500)   => req('GET',  `/sessions/${id}/equity?limit=${limit}`)
export const getBenchmark         = (id)                => req('GET',  `/sessions/${id}/benchmark`)
export const getOrders            = (id, limit = 50)    => req('GET',  `/sessions/${id}/orders?limit=${limit}`)

export const placeOrder = (sessionId, symbol, side, quantity, orderType = 'MARKET', limitPrice = null) =>
  req('POST', '/orders', {
    session_id:  sessionId,
    symbol:      symbol.toUpperCase(),
    side:        side.toUpperCase(),
    quantity,
    order_type:  orderType,
    limit_price: limitPrice,
    source:      'MANUAL',
  })

export const placeAIOrder = (sessionId, symbol, action, confidence, reason) =>
  req('POST', '/orders/ai', {
    session_id: sessionId,
    symbol:     symbol.toUpperCase(),
    action:     action.toUpperCase(),
    confidence,
    reason,
  })

export const cancelOrder = (orderId) => req('DELETE', `/orders/${orderId}`)