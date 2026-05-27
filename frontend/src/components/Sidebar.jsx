import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/perfil', label: 'Meu Perfil', icon: '👤' },
  { to: '/recomendacoes', label: 'Recomendações', icon: '🎯' },
  { to: '/roadmap', label: 'Roadmap', icon: '🗺️' },
]

export default function Sidebar({ open, onToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-surface-card border-r border-surface-border
        transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        <div className="flex items-center justify-between px-6 h-16 border-b border-surface-border shrink-0">
          <span className="font-display font-bold text-lg text-text-primary">
            Career<span className="text-brand-500">Match</span>
          </span>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors"
            aria-label="Fechar menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onToggle}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-500'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-surface-border space-y-3">
          <div className="flex items-center gap-3 px-2 w-full">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary truncate">{user?.nome}</p>
              <p className="text-xs text-text-muted">Usuário</p>
            </div>
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:bg-transparent lg:pointer-events-none"
          onClick={onToggle}
        />
      )}
    </>
  )
}