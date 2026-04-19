import { useState, useEffect, useCallback, useRef } from 'react'

const BASE            = '/api/auth'
const TOKEN_KEY       = 'qai_access'
const REFRESH_KEY     = 'qai_refresh'
const USER_KEY        = 'qai_user'
const REFRESH_BEFORE_MS = 5 * 60 * 1000

const store = {
  save:    (access, refresh, user) => {
    try {
      localStorage.setItem(TOKEN_KEY,   access)
      localStorage.setItem(REFRESH_KEY, refresh)
      localStorage.setItem(USER_KEY,    JSON.stringify(user))
    } catch {}
  },
  clear:   () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(USER_KEY)
    } catch {}
  },
  access:  () => { try { return localStorage.getItem(TOKEN_KEY)  } catch { return null } },
  refresh: () => { try { return localStorage.getItem(REFRESH_KEY) } catch { return null } },
  user:    () => {
    try {
      const u = localStorage.getItem(USER_KEY)
      return u ? JSON.parse(u) : null
    } catch { return null }
  },
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function msUntilExpiry(token) {
  const p = decodeJwt(token)
  if (!p?.exp) return 0
  return p.exp * 1000 - Date.now()
}

async function apiPost(path, body, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || data.message || `HTTP ${res.status}`)
  return data
}

export function useAuth() {
  const [user,    setUser]    = useState(() => store.user())
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const refreshTimerRef = useRef(null)

  const isAuthenticated = !!user && !!store.access()

  const scheduleRefresh = useCallback((accessToken) => {
    clearTimeout(refreshTimerRef.current)
    const ms = msUntilExpiry(accessToken) - REFRESH_BEFORE_MS
    if (ms <= 0) return
    refreshTimerRef.current = setTimeout(async () => {
      const rt = store.refresh()
      if (!rt) return
      try {
        const data = await apiPost('/refresh', { refresh_token: rt })
        localStorage.setItem(TOKEN_KEY, data.access_token)
        scheduleRefresh(data.access_token)
      } catch {
        store.clear()
        setUser(null)
      }
    }, ms)
  }, [])

  useEffect(() => {
    const at = store.access()
    if (at) {
      const ms = msUntilExpiry(at)
      if (ms > 0) {
        scheduleRefresh(at)
      } else {
        const rt = store.refresh()
        if (rt) {
          apiPost('/refresh', { refresh_token: rt })
            .then(d => {
              localStorage.setItem(TOKEN_KEY, d.access_token)
              scheduleRefresh(d.access_token)
            })
            .catch(() => { store.clear(); setUser(null) })
        } else {
          store.clear()
          setUser(null)
        }
      }
    }
    return () => clearTimeout(refreshTimerRef.current)
  }, [scheduleRefresh])

  const login = useCallback(async (emailOrUsername, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiPost('/login', {
        email_or_username: emailOrUsername,
        password,
      })
      store.save(data.access_token, data.refresh_token, data.user)
      setUser(data.user)
      scheduleRefresh(data.access_token)
      return data.user
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [scheduleRefresh])

  const signup = useCallback(async ({ email, username, password, fullName = '' }) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiPost('/signup', {
        email,
        username,
        password,
        full_name: fullName,
      })
      store.save(data.access_token, data.refresh_token, data.user)
      setUser(data.user)
      scheduleRefresh(data.access_token)
      return data.user
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [scheduleRefresh])

  const logout = useCallback(async () => {
    const at = store.access()
    clearTimeout(refreshTimerRef.current)
    store.clear()
    setUser(null)
    if (at) {
      fetch(`${BASE}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${at}` },
      }).catch(() => {})
    }
  }, [])

  const getAuthHeaders = useCallback(() => {
    const at = store.access()
    return at ? { Authorization: `Bearer ${at}` } : {}
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    signup,
    logout,
    getAuthHeaders,
    clearError,
  }
}

export function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}