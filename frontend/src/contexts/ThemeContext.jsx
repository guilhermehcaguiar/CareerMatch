import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'careermatch-theme'

function getSystemPref() {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode) {
  return mode === 'system' ? getSystemPref() : mode
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'system'
    } catch {
      return 'system'
    }
  })

  const applyTheme = useCallback((m) => {
    const resolved = resolveTheme(m)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [])

  useEffect(() => {
    applyTheme(mode)
    try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* noop */ }
  }, [mode, applyTheme])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode, applyTheme])

  const toggleTheme = useCallback((newMode) => {
    setMode(newMode)
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, resolved: resolveTheme(mode) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)