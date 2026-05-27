import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/perfil': 'Meu Perfil',
  '/recomendacoes': 'Recomendações',
  '/roadmap': 'Roadmap',
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const pageTitle = pageTitles[location.pathname] || ''

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
      <main
        className="flex-1 min-h-screen overflow-auto transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarOpen ? '16rem' : '0' }}
      >
        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16 border-b border-surface-border bg-surface-card sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {pageTitle && (
            <span className="font-display font-bold text-lg text-text-primary">{pageTitle}</span>
          )}
        </div>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}