import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'quantai-theme'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {}
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const setTheme = useCallback((t) => {
    if (t === 'dark' || t === 'light') setThemeState(t)
  }, [])

  const toggle = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  return {
    theme,
    isDark:   theme === 'dark',
    isLight:  theme === 'light',
    toggle,
    setTheme,
  }
}