import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [cargos, setCargos] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      api.get(`/perfil/${user.id}`),
      api.get(`/recomendar/${user.id}`),
      api.get(`/cursos/${user.id}`),
    ])
      .then(([pRes, cRes, cuRes]) => {
        if (cancelled) return
        setProfile(pRes.data)
        setCargos(cRes.data?.ranking || [])
        setCursos(cuRes.data?.cursos || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const skillsCount = profile?.habilidades?.length ?? 0
  const topCargos = cargos.slice(0, 3)
  const topCursos = cursos.slice(0, 3)

  const scoreColor = (score) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  const scoreBarBg = (score) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Visão geral da sua evolução profissional</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 text-brand-500 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {profile?.perfil_atual || 'Perfil não definido'}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Habilidades', value: skillsCount, icon: '🧠', desc: 'cadastradas no seu perfil' },
          { label: 'Cargos Compatíveis', value: cargos.length, icon: '🎯', desc: 'com match calculado' },
          { label: 'Cursos Recomendados', value: cursos.length, icon: '📚', desc: 'para preencher gaps' },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-surface-card border border-surface-border rounded-2xl p-5 hover:border-brand-500/30 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-3xl font-bold text-text-primary">{item.value}</span>
            </div>
            <p className="font-medium text-text-primary">{item.label}</p>
            <p className="text-sm text-text-muted mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      {cargos.length > 0 ? (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-2xl">🗺️</span>
            <div>
              <h2 className="font-display font-bold text-xl text-text-primary">Roadmap de Carreira</h2>
              <p className="text-sm text-text-muted">Etapas recomendadas para sua evolução profissional</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-surface-border hidden sm:block" />

            <div className="space-y-8 sm:space-y-0 sm:relative">
              <div className="sm:flex sm:items-start sm:gap-6 sm:pb-8 sm:relative">
                <div className="hidden sm:flex sm:flex-col sm:items-center sm:shrink-0 sm:w-9">
                  <div className="w-9 h-9 rounded-full bg-green-500 border-4 border-surface-card flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="sm:pt-1 sm:flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="sm:hidden w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <h3 className="font-display font-bold text-lg text-text-primary">
                      {profile?.perfil_atual || 'Posição Atual'}
                    </h3>
                    <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Atual</span>
                  </div>
                  <p className="text-sm text-text-secondary sm:ml-0">
                    {skillsCount > 0
                      ? `${skillsCount} habilidade${skillsCount > 1 ? 's' : ''} cadastrada${skillsCount > 1 ? 's' : ''}`
                      : 'Cadastre suas habilidades no perfil'}
                  </p>
                </div>
              </div>

              {topCargos.map((cargo, i) => (
                <div key={i} className="sm:flex sm:items-start sm:gap-6 sm:pb-8 sm:relative">
                  <div className="hidden sm:flex sm:flex-col sm:items-center sm:shrink-0 sm:w-9">
                    <div className={`w-9 h-9 rounded-full border-4 border-surface-card flex items-center justify-center text-sm font-bold ${scoreColor(cargo.match_score)}`}
                         style={{ backgroundColor: cargo.match_score >= 70 ? '#22c55e20' : cargo.match_score >= 40 ? '#f59e0b20' : '#ef444420' }}>
                      {i + 1}
                    </div>
                  </div>
                  <div className="sm:pt-1 sm:flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="sm:hidden w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                        <span className={`text-sm font-bold ${scoreColor(cargo.match_score)}`}>{i + 1}</span>
                      </div>
                      <h3 className="font-display font-bold text-base text-text-primary">{cargo.titulo}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${scoreColor(cargo.match_score)} ${scoreColor(cargo.match_score).replace('text-', 'bg-')}/10`}>
                        {cargo.match_score}%
                      </span>
                    </div>

                    <div className="sm:ml-0 space-y-3">
                      <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${scoreBarBg(cargo.match_score)}`}
                          style={{ width: `${Math.min(cargo.match_score, 100)}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        {cargo.nivel && <span className="px-2 py-1 rounded-md bg-surface-alt">📊 {cargo.nivel}</span>}
                        {cargo.salario_medio && <span className="px-2 py-1 rounded-md bg-surface-alt">💰 {cargo.salario_medio}</span>}
                        <span className="px-2 py-1 rounded-md bg-surface-alt">🎯 {(cargo.gaps || []).length} gap{(cargo.gaps || []).length > 1 ? 's' : ''}</span>
                      </div>

                      {(cargo.gaps || []).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-amber-500 mb-1.5">Habilidades a desenvolver</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cargo.gaps.slice(0, 4).map(s => (
                              <span key={s} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-xs font-medium">
                                {s}
                              </span>
                            ))}
                            {cargo.gaps.length > 4 && (
                              <span className="px-2 py-0.5 rounded-md bg-surface-alt text-text-muted text-xs">
                                +{cargo.gaps.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-surface-border">
            <Link
              to="/recomendacoes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-all"
            >
              Ver Roadmap Completo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
          <span className="text-4xl block mb-4">📋</span>
          <h3 className="font-display font-bold text-lg text-text-primary mb-2">Nenhuma recomendação disponível</h3>
          <p className="text-text-secondary text-sm mb-4">Adicione habilidades ao seu perfil para gerar seu roadmap de carreira.</p>
          <Link to="/perfil" className="inline-flex px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition-all">
            Gerenciar Habilidades
          </Link>
        </div>
      )}

      {topCursos.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📚</span>
            <div>
              <h2 className="font-display font-bold text-xl text-text-primary">Cursos Recomendados</h2>
              <p className="text-sm text-text-muted">Para desenvolver as habilidades que faltam</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topCursos.map((curso, i) => (
              <div
                key={i}
                className="group bg-surface-alt border border-surface-border rounded-2xl p-5 hover:border-brand-500/30 hover:shadow-sm transition-all"
              >
                <span className="text-2xl block mb-3">📖</span>
                <h3 className="font-display font-semibold text-sm text-text-primary mb-2 group-hover:text-brand-500 transition-colors leading-relaxed">
                  {curso.nome}
                </h3>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  {curso.plataforma && <span>{curso.plataforma}</span>}
                  <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-500 font-medium">
                    {curso.gaps_cobertos} gap{(curso.gaps_cobertos || 0) > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/perfil"
          className="group bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-brand-500/30 transition-all"
        >
          <span className="text-2xl block mb-3 group-hover:scale-110 transition-transform origin-top-left">👤</span>
          <h3 className="font-display font-bold text-lg text-text-primary mb-1">Meu Perfil</h3>
          <p className="text-sm text-text-secondary">Gerencie suas habilidades e dados pessoais</p>
        </Link>
        <Link
          to="/recomendacoes"
          className="group bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-brand-500/30 transition-all"
        >
          <span className="text-2xl block mb-3 group-hover:scale-110 transition-transform origin-top-left">🎯</span>
          <h3 className="font-display font-bold text-lg text-text-primary mb-1">Recomendações Detalhadas</h3>
          <p className="text-sm text-text-secondary">Veja todos os cargos, cursos e gaps de habilidades</p>
        </Link>
      </div>
    </div>
  )
}