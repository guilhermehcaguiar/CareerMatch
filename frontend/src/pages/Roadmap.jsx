import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const STORAGE_KEY = 'careermatch-cargo-selecionado'

export default function Roadmap() {
  const { user } = useAuth()
  const [cargos, setCargos] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCargo, setSelectedCargo] = useState(null)
  const [skillCourses, setSkillCourses] = useState(null)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [roadmapSearch, setRoadmapSearch] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      api.get(`/recomendar/${user.id}`),
      api.get(`/perfil/${user.id}`),
      api.get(`/almejado/${user.id}`),
    ])
      .then(([cRes, pRes, aRes]) => {
        if (cancelled) return
        const cargosList = cRes.data?.ranking || []
        setCargos(cargosList)
        setProfile(pRes.data)

        const almejado = aRes.data?.almejado
        if (almejado) {
          const match = cargosList.find(c => c.id === almejado.id)
          if (match) setSelectedCargo(match)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const selectCargo = async (cargo) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cargo))
    setSelectedCargo(cargo)
    setSkillCourses(null)
    try {
      await api.post(`/almejar/${user.id}/${cargo.id}`)
    } catch { /* ignore */ }
  }

  const fetchSkillCourses = async (skillName) => {
    setLoadingCourses(true)
    try {
      const res = await api.get(`/cursos-por-habilidade/${encodeURIComponent(skillName)}`)
      setSkillCourses({ nome: skillName, cursos: res.data?.cursos || [] })
    } catch {
      setSkillCourses({ nome: skillName, cursos: [] })
    } finally {
      setLoadingCourses(false)
    }
  }

  const sortedCargos = [...cargos]
    .filter(c => c.titulo?.toLowerCase().includes(roadmapSearch.toLowerCase()))
    .sort((a, b) => b.match_score - a.match_score)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!selectedCargo) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Roadmap de Carreira</h1>
          <p className="text-text-secondary mt-1">Escolha uma carreira para visualizar seu plano de evolução</p>
        </div>

        <input
            type="text"
            value={roadmapSearch}
            onChange={e => setRoadmapSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 rounded-xl bg-surface-alt border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
            placeholder="Buscar carreiras..."
          />

        {sortedCargos.length === 0 && cargos.length > 0 ? (
          <div className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
            <span className="text-4xl block mb-4">🔍</span>
            <h3 className="font-display font-bold text-lg text-text-primary mb-2">Nenhuma carreira encontrada</h3>
            <p className="text-text-secondary text-sm">Tente outro termo de busca.</p>
          </div>
        ) : sortedCargos.length === 0 ? (
          <div className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
            <span className="text-4xl block mb-4">🗺️</span>
            <h3 className="font-display font-bold text-lg text-text-primary mb-2">Nenhuma carreira disponível</h3>
            <p className="text-text-secondary text-sm">Adicione habilidades ao seu perfil para gerar recomendações.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCargos.map((cargo) => (
              <button
                key={cargo.id}
                onClick={() => selectCargo(cargo)}
                className="group bg-surface-card border border-surface-border rounded-2xl p-5 text-left hover:border-brand-500/30 hover:shadow-lg transition-all"
              >
                <span className="text-2xl block mb-3">🎯</span>
                <h3 className="font-display font-semibold text-base text-text-primary mb-2 group-hover:text-brand-500 transition-colors">
                  {cargo.titulo}
                </h3>
                <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                  {cargo.nivel && <span>📊 {cargo.nivel}</span>}
                  {cargo.salario_medio && <span>💰 {cargo.salario_medio}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-surface-alt overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cargo.match_score >= 70 ? 'bg-green-500' : cargo.match_score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${cargo.match_score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${cargo.match_score >= 70 ? 'text-green-500' : cargo.match_score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                    {cargo.match_score}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const gaps = selectedCargo.gaps || []
  const possuidas = selectedCargo.possuidas || []
  const totalExigidas = selectedCargo.exigidas?.length || 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => { setSelectedCargo(null); setSkillCourses(null) }}
            className="text-sm text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 mb-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Trocar Carreira
          </button>
          <h1 className="font-display font-bold text-2xl text-text-primary">{selectedCargo.titulo}</h1>
          <p className="text-text-secondary text-sm mt-1">
            {selectedCargo.nivel && <span>📊 {selectedCargo.nivel} &middot; </span>}
            {selectedCargo.salario_medio && <span>💰 {selectedCargo.salario_medio} &middot; </span>}
            <span className={selectedCargo.match_score >= 70 ? 'text-green-500' : selectedCargo.match_score >= 40 ? 'text-amber-500' : 'text-red-500'}>
              {selectedCargo.match_score}% match
            </span>
          </p>
        </div>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{possuidas.length}</p>
          <p className="text-xs text-text-muted mt-1">Habilidades Possuídas</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{gaps.length}</p>
          <p className="text-xs text-text-muted mt-1">Gaps a Desenvolver</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{totalExigidas}</p>
          <p className="text-xs text-text-muted mt-1">Total Exigidas</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold ${selectedCargo.match_score >= 70 ? 'text-green-500' : selectedCargo.match_score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
            {selectedCargo.match_score}%
          </p>
          <p className="text-xs text-text-muted mt-1">Match Score</p>
        </div>
      </div>

      {/* Visual Roadmap */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8 overflow-x-auto">
        <div className="flex items-start gap-0 min-w-[800px]">
          {/* Current Position */}
          <div className="flex flex-col items-center shrink-0 w-48">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl">👤</span>
            </div>
            <p className="font-display font-bold text-sm text-text-primary mt-3 text-center leading-tight">{profile?.perfil_atual || 'Posição Atual'}</p>
            <p className="text-xs text-text-muted mt-1">Você está aqui</p>
            <div className="mt-3 w-full bg-surface-alt rounded-lg p-2 text-center">
              <p className="text-xs text-text-muted">{possuidas.length} habilidades</p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center justify-center shrink-0 w-20 pt-10">
            <svg className="w-full h-8 text-green-500" viewBox="0 0 60 20" fill="none">
              <path d="M59.7071 10.7071C60.0976 10.3166 60.0976 9.68342 59.7071 9.29289L53.3431 2.92893C52.9526 2.53841 52.3195 2.53841 51.9289 2.92893C51.5384 3.31946 51.5384 3.95262 51.9289 4.34315L57.5858 10L51.9289 15.6569C51.5384 16.0474 51.5384 16.6805 51.9289 17.0711C52.3195 17.4616 52.9526 17.4616 53.3431 17.0711L59.7071 10.7071ZM0 11H59V9H0V11Z" fill="currentColor"/>
            </svg>
            <span className="text-[10px] text-green-500 font-medium mt-1">POSSUI</span>
          </div>

          {/* Owned Skills */}
          <div className="flex flex-col items-center shrink-0 w-64">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl">✅</span>
            </div>
            <p className="font-display font-bold text-sm text-text-primary mt-3 text-center">Suas Habilidades</p>
            <p className="text-xs text-text-muted mt-1 mb-3">{possuidas.length} de {totalExigidas} exigidas</p>
            {possuidas.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5">
                {possuidas.map(s => (
                  <button
                    key={s}
                    onClick={() => fetchSkillCourses(s)}
                    className="group relative px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all cursor-pointer border border-green-500/20"
                    title="Clique para ver cursos"
                  >
                    {s}
                    <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">📖</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">Nenhuma habilidade ainda</p>
            )}
          </div>

          {/* Arrow to gaps */}
          {gaps.length > 0 && (
            <>
              <div className="flex flex-col items-center justify-center shrink-0 w-20 pt-10">
                <svg className="w-full h-8 text-amber-500" viewBox="0 0 60 20" fill="none">
                  <path d="M59.7071 10.7071C60.0976 10.3166 60.0976 9.68342 59.7071 9.29289L53.3431 2.92893C52.9526 2.53841 52.3195 2.53841 51.9289 2.92893C51.5384 3.31946 51.5384 3.95262 51.9289 4.34315L57.5858 10L51.9289 15.6569C51.5384 16.0474 51.5384 16.6805 51.9289 17.0711C52.3195 17.4616 52.9526 17.4616 53.3431 17.0711L59.7071 10.7071ZM0 11H59V9H0V11Z" fill="currentColor"/>
                </svg>
                <span className="text-[10px] text-amber-500 font-medium mt-1">FALTA</span>
              </div>

              <div className="flex flex-col items-center shrink-0 w-64">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">📈</span>
                </div>
                <p className="font-display font-bold text-sm text-text-primary mt-3 text-center">Habilidades a Desenvolver</p>
                <p className="text-xs text-text-muted mt-1 mb-3">{gaps.length} gaps para atingir a vaga</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {gaps.map(s => (
                    <button
                      key={s}
                      onClick={() => fetchSkillCourses(s)}
                      className="group relative px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all cursor-pointer border border-amber-500/20"
                      title="Clique para ver cursos"
                    >
                      {s}
                      <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">📖</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Arrow to target */}
          <div className="flex flex-col items-center justify-center shrink-0 w-20 pt-10">
            <svg className="w-full h-8 text-brand-500" viewBox="0 0 60 20" fill="none">
              <path d="M59.7071 10.7071C60.0976 10.3166 60.0976 9.68342 59.7071 9.29289L53.3431 2.92893C52.9526 2.53841 52.3195 2.53841 51.9289 2.92893C51.5384 3.31946 51.5384 3.95262 51.9289 4.34315L57.5858 10L51.9289 15.6569C51.5384 16.0474 51.5384 16.6805 51.9289 17.0711C52.3195 17.4616 52.9526 17.4616 53.3431 17.0711L59.7071 10.7071ZM0 11H59V9H0V11Z" fill="currentColor"/>
            </svg>
            <span className="text-[10px] text-brand-500 font-medium mt-1">OBJETIVO</span>
          </div>

          {/* Target Career */}
          <div className="flex flex-col items-center shrink-0 w-48">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg ring-2 ring-brand-500/30 ring-offset-2 ring-offset-surface-card">
              <span className="text-3xl">🎯</span>
            </div>
            <p className="font-display font-bold text-sm text-text-primary mt-3 text-center leading-tight">{selectedCargo.titulo}</p>
            <p className="text-xs text-text-muted mt-1">Seu objetivo</p>
            <span className={`mt-2 text-xs font-bold px-3 py-1 rounded-full ${selectedCargo.match_score >= 70 ? 'bg-green-500/10 text-green-500' : selectedCargo.match_score >= 40 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
              {selectedCargo.match_score}% match
            </span>
            <div className="mt-3 w-full bg-surface-alt rounded-lg p-2 text-center space-y-1">
              {selectedCargo.nivel && <p className="text-xs text-text-muted">📊 {selectedCargo.nivel}</p>}
              {selectedCargo.salario_medio && <p className="text-xs text-text-muted">💰 {selectedCargo.salario_medio}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Skill match breakdown */}
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg text-text-primary mb-4">Distribuição das Habilidades</h2>
        <div className="w-full h-4 rounded-full bg-surface-alt overflow-hidden flex">
          {possuidas.length > 0 && (
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(possuidas.length / Math.max(totalExigidas, 1)) * 100}%` }}
              title={`${possuidas.length} possuídas`}
            />
          )}
          {gaps.length > 0 && (
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${(gaps.length / Math.max(totalExigidas, 1)) * 100}%` }}
              title={`${gaps.length} gaps`}
            />
          )}
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            {possuidas.length} possuída{possuidas.length !== 1 ? 's' : ''} ({totalExigidas > 0 ? Math.round((possuidas.length / totalExigidas) * 100) : 0}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            {gaps.length} gap{gaps.length !== 1 ? 's' : ''} ({totalExigidas > 0 ? Math.round((gaps.length / totalExigidas) * 100) : 0}%)
          </span>
        </div>
      </div>

      {/* Courses Modal */}
      {skillCourses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSkillCourses(null)}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-text-primary">
                Cursos para <span className="text-brand-500">{skillCourses.nome}</span>
              </h3>
              <button onClick={() => setSkillCourses(null)} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {loadingCourses ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : skillCourses.cursos.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-3xl block mb-3">📖</span>
                <p className="text-text-secondary text-sm">Nenhum curso encontrado para esta habilidade.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {skillCourses.cursos.map(curso => (
                  <div key={curso.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-alt border border-surface-border hover:border-brand-500/30 transition-all">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary text-sm">{curso.nome}</p>
                      <p className="text-xs text-text-muted mt-0.5">{curso.plataforma || 'Plataforma não informada'}</p>
                    </div>
                    <span className="ml-3 px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-500 text-xs font-medium shrink-0">
                      Curso
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}