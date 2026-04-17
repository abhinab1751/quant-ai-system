const BASE = '/api'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
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
  fetch(`${BASE}/prediction/train/${symbol}?force=${force}`, { method: 'POST' }).then(r => r.json())

export const runBacktest = (symbol, capital = 10000) =>
  get(`/backtest/run/${symbol}?initial_capital=${capital}`)

export const getBacktestHistory = (symbol) =>
  get(`/backtest/history/${symbol}`)