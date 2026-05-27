import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )},
  { value: 'dark', label: 'Escuro', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )},
  { value: 'system', label: 'Sistema', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )},
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { mode, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const links = [
    { to: '/dashboard',      label: 'Dashboard', icon: '📊' },
    { to: '/recomendacoes',  label: 'Recomendações', icon: '⭐' },
    { to: '/perfil',         label: 'Perfil', icon: '👤' },
  ]

  function handleLogout() {
    logout()
    navigate('/')
  }

  const currentTheme = THEME_OPTIONS.find(t => t.value === mode) || THEME_OPTIONS[2]

  return (
    <nav className="sticky top-0 z-50 px-8 py-4 flex items-center justify-between surface" style={{ borderBottom: '1px solid var(--border)' }}>

      {/* Logo */}
      <Link to="/dashboard" className="font-display font-bold text-xl tracking-tight flex-shrink-0 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xs" style={{ color: '#000', fontWeight: 'bold' }}>
          C
        </div>
        <span className="text-accent">Career</span><span style={{ color: 'var(--text)' }}>Match</span>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center gap-1">
        {links.map(l => (
          <Link 
            key={l.to} 
            to={l.to}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
            style={{
              color: location.pathname === l.to ? 'var(--accent)' : 'var(--muted)',
              background: location.pathname === l.to ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              borderColor: location.pathname === l.to ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
              border: '1px solid'
            }}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Theme Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="px-3 py-2 rounded-lg text-sm transition-all btn-secondary flex items-center gap-2"
            title="Alternar tema"
          >
            {currentTheme.icon}
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--muted)' }}>{currentTheme.label}</span>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl overflow-hidden surface" style={{ border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 100 }}>
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { toggleTheme(opt.value); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all"
                  style={{
                    color: mode === opt.value ? 'var(--accent)' : 'var(--text)',
                    background: mode === opt.value ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                  }}
                  onMouseEnter={e => { if (mode !== opt.value) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)' }}
                  onMouseLeave={e => { if (mode !== opt.value) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ color: mode === opt.value ? 'var(--accent)' : 'var(--muted)' }}>{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                  {mode === opt.value && <span className="ml-auto" style={{ color: 'var(--accent)' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xs font-bold" style={{ color: '#000' }}>
              {user?.nome?.charAt(0) || 'U'}
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {user?.nome?.split(' ')[0]}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 text-sm rounded-lg transition-all btn-secondary font-medium"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  )
}