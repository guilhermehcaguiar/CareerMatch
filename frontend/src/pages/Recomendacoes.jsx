import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function Recomendacoes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('cargos')
  const [cargos, setCargos] = useState([])
  const [cursos, setCursos] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [cargoSearch, setCargoSearch] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      api.get(`/recomendar/${user.id}`),
      api.get(`/cursos/${user.id}`),
      api.get(`/perfil/${user.id}`),
    ])
      .then(([cRes, cuRes, pRes]) => {
        if (cancelled) return
        setCargos(cRes.data?.ranking || [])
        setCursos(cuRes.data?.cursos || [])
        setProfile(pRes.data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const filteredCargos = cargos.filter(c =>
    c.titulo?.toLowerCase().includes(cargoSearch.toLowerCase())
  )
  const topMatch = filteredCargos.length > 0 ? filteredCargos.reduce((a, b) => (a.match_score > b.match_score ? a : b)) : null

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-text-primary">Recomendações</h1>
        <p className="text-text-secondary mt-1">Vagas e cursos personalizados para você</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-surface-alt border border-surface-border w-fit">
        <button
          onClick={() => setTab('cargos')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'cargos' ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          🎯 Cargos
        </button>
        <button
          onClick={() => setTab('cursos')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'cursos' ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          📚 Cursos
        </button>
      </div>

      {tab === 'cargos' && (
        <div className="space-y-6">
          <input
            type="text"
            value={cargoSearch}
            onChange={e => setCargoSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 rounded-xl bg-surface-alt border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
            placeholder="Buscar cargos..."
          />
          {topMatch && (
            <div className="bg-gradient-to-br from-brand-500/10 to-brand-500/5 border border-brand-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-brand-500 mb-1">Melhor Match</p>
                  <h2 className="font-display font-bold text-2xl text-text-primary">{topMatch.titulo}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                    {topMatch.salario_medio && <span>💰 {topMatch.salario_medio}</span>}
                    {topMatch.nivel && <span>📊 {topMatch.nivel}</span>}
                  </div>
                </div>
                <div className="text-center">
                  <p className={`font-display font-bold text-3xl ${scoreColor(topMatch.match_score)}`}>
                    {Math.round(topMatch.match_score)}%
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">Match</p>
                </div>
              </div>
            </div>
          )}

          {filteredCargos.length === 0 && (
            <div className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
              <span className="text-4xl block mb-4">🎯</span>
              <h3 className="font-display font-bold text-lg text-text-primary mb-2">
                {cargoSearch ? 'Nenhum cargo encontrado' : 'Nenhuma recomendação'}
              </h3>
              <p className="text-text-secondary text-sm">
                {cargoSearch ? 'Tente outro termo de busca.' : 'Adicione mais habilidades ao seu perfil para receber recomendações.'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {filteredCargos.map((cargo, i) => (
              <div
                key={i}
                className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden hover:border-brand-500/30 transition-all"
              >
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-lg text-text-primary">{cargo.titulo}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                      {cargo.salario_medio && <span>💰 {cargo.salario_medio}</span>}
                      {cargo.nivel && <span>📊 {cargo.nivel}</span>}
                      <span>{(cargo.gaps || []).length} gap{(cargo.gaps || []).length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className={`font-bold text-lg ${scoreColor(cargo.match_score)}`}>
                        {Math.round(cargo.match_score)}%
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-text-muted transition-transform ${expanded === i ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                <div className="px-5 pb-1">
                  <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBarBg(cargo.match_score)}`}
                      style={{ width: `${Math.min(cargo.match_score, 100)}%` }}
                    />
                  </div>
                </div>

                {expanded === i && (
                  <div className="px-5 pb-5 space-y-4 animate-fade-in">
                    {(cargo.possuidas || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-500 mb-2">✅ Habilidades que você possui</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cargo.possuidas.map(s => (
                            <span key={s} className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-500 text-xs font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(cargo.gaps || []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-500 mb-2">📈 Habilidades a desenvolver</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cargo.gaps.map(s => (
                            <span key={s} className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 text-xs font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        localStorage.setItem('careermatch-cargo-selecionado', JSON.stringify(cargo))
                        navigate('/roadmap')
                      }}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-all flex items-center justify-center gap-2"
                    >
                      🗺️ Ver Roadmap desta Carreira
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'cursos' && (
        <div className="space-y-6">
          {cursos.length === 0 ? (
            <div className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
              <span className="text-4xl block mb-4">📚</span>
              <h3 className="font-display font-bold text-lg text-text-primary mb-2">Nenhum curso disponível</h3>
              <p className="text-text-secondary text-sm">Adicione mais habilidades ao seu perfil para receber sugestões de cursos.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cursos.map((curso, i) => (
                <div
                  key={i}
                  className="group bg-surface-card border border-surface-border rounded-2xl p-5 hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 transition-all"
                >
                  <span className="text-2xl block mb-3">📖</span>
                  <h3 className="font-display font-semibold text-base text-text-primary mb-2 group-hover:text-brand-500 transition-colors">
                    {curso.nome}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                    Aborda {(curso.habilidades_ensinadas || []).length} habilidade{(curso.habilidades_ensinadas || []).length > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    {curso.plataforma && <span>{curso.plataforma}</span>}
                    {curso.gaps_cobertos > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-500 font-medium">
                        {curso.gaps_cobertos} gap{curso.gaps_cobertos > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}