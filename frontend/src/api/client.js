const BASE = '/api'

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

function getAccessToken() {
  try { return localStorage.getItem('qai_access') } catch { return null }
}

function getRefreshToken() {
  try { return localStorage.getItem('qai_refresh') } catch { return null }
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) return null

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })

  if (!res.ok) return null
  const data = await parseResponseBody(res)
  if (!data?.access_token) return null

  try { localStorage.setItem('qai_access', data.access_token) } catch {}
  return data.access_token
}

async function get(path) {
  const headers = {}
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res = await fetch(`${BASE}${path}`, { headers })

  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      })
    }
  }

  const data = await parseResponseBody(res)

  if (!res.ok) {
    const message = data?.detail || data?.message || data?.error || `API error ${res.status}: ${path}`
    throw new Error(message)
  }

  return data
}

export const getPrice = (symbol) =>
  get(`/market/price?symbol=${symbol}`)

export const getDecision = (symbol) =>
  get(`/decision/${symbol}`)

export const getHistory = (symbol, limit = 30) =>
  get(`/history/${symbol}?limit=${limit}`)

export const getHistorySummary = (symbol) =>
  get(`/history/${symbol}/summary`)

export const getNews = (symbol) =>
  get(`/news/${symbol}`)

export const trainModel = (symbol, force = false) =>
  fetch(`${BASE}/prediction/train/${symbol}?force=${force}`, { method: 'POST' }).then(async (r) => {
    const data = await parseResponseBody(r)
    if (!r.ok) {
      const message = data?.detail || data?.message || data?.error || `API error ${r.status}`
      throw new Error(message)
    }
    return data
  })

export const runBacktest = (symbol, capital = 10000) =>
  get(`/backtest/run/${symbol}?initial_capital=${capital}`)

export const getBacktestHistory = (symbol) =>
  get(`/backtest/history/${symbol}`)

export async function downloadDecisionReport(symbol) {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Please sign in to download a report.')
  }

  const endpoint = `${BASE}/decision/${encodeURIComponent(symbol)}/report`

  let res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${newToken}` },
      })
    }
  }

  if (!res.ok) {
    const data = await parseResponseBody(res)
    const message = data?.detail || data?.message || data?.error || `API error ${res.status}: /decision/report`
    throw new Error(message)
  }

  const blob = await res.blob()
  const disposition = res.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^";]+)"?/i)

  return {
    blob,
    filename: match?.[1] || `${String(symbol).toUpperCase()}_decision_report.pdf`,
  }
}

export async function downloadTradeIntelligenceReport(symbol, intent = 'EVALUATE') {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Please sign in to download a report.')
  }

  const res = await fetch(`${BASE}/trade-intelligence/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ symbol, intent }),
  })

  if (res.status === 401) {
    throw new Error('Your session expired. Please sign in again.')
  }

  if (!res.ok) {
    const data = await parseResponseBody(res)
    const message = data?.detail || data?.message || data?.error || `API error ${res.status}: /trade-intelligence/report`
    throw new Error(message)
  }

  const blob = await res.blob()
  const disposition = res.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^";]+)"?/i)

  return {
    blob,
    filename: match?.[1] || `${String(symbol).toUpperCase()}_${String(intent).toUpperCase()}_trade_report.pdf`,
  }
}