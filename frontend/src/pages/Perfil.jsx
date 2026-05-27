import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function Perfil() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [allSkills, setAllSkills] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      const [pRes, sRes] = await Promise.all([
        api.get(`/perfil/${user.id}`),
        api.get('/habilidades'),
      ])
      setProfile(pRes.data)
      setAllSkills(sRes.data?.habilidades || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const userSkillNames = new Set((profile?.habilidades || []).map(h => h.nome?.toLowerCase()))
  const ownedSkills = profile?.habilidades || []
  const availableSkills = allSkills.filter(s => !userSkillNames.has(s.nome?.toLowerCase()))
  const filteredAvailable = availableSkills.filter(s =>
    s.nome?.toLowerCase().includes(search.toLowerCase())
  )

  const showFeedback = (type, message) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 5000)
  }

  const addSkill = async (nome) => {
    try {
      await api.post(`/perfil/${user.id}/habilidades`, { nome })
      setProfile(prev => ({
        ...prev,
        habilidades: [...(prev?.habilidades || []), { nome, tipo: 'hard' }],
      }))
      showFeedback('success', `Habilidade "${nome}" adicionada com sucesso`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao adicionar habilidade'
      showFeedback('error', msg)
    }
  }

  const removeSkill = async (nome) => {
    try {
      await api.delete(`/perfil/${user.id}/habilidades/${encodeURIComponent(nome)}`)
      setProfile(prev => ({
        ...prev,
        habilidades: (prev?.habilidades || []).filter(h => h.nome !== nome),
      }))
      showFeedback('success', `Habilidade "${nome}" removida com sucesso`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao remover habilidade'
      showFeedback('error', msg)
    }
  }

  const createAndAddSkill = async (nome) => {
    setCreating(true)
    try {
      await api.post('/habilidades', { nome })
      await api.post(`/perfil/${user.id}/habilidades`, { nome })
      setAllSkills(prev => [...prev, { nome, tipo: 'hard' }])
      setProfile(prev => ({
        ...prev,
        habilidades: [...(prev?.habilidades || []), { nome, tipo: 'hard' }],
      }))
      setSearch('')
      showFeedback('success', `Habilidade "${nome}" criada e adicionada com sucesso`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao criar habilidade'
      showFeedback('error', msg)
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (field, currentValue) => {
    setEditingField(field)
    setEditValue(currentValue || '')
    setShowPasswordModal(true)
    setPassword('')
  }

  const saveEdit = async () => {
    if (!editingField || !profile || !password) return
    setSaving(true)
    try {
      await api.put(`/perfil/${user.id}`, { [editingField]: editValue, senha: password })
      setProfile(prev => ({ ...prev, [editingField]: editValue }))
      setEditingField(null)
      setShowPasswordModal(false)
      setPassword('')
      const labels = { nome: 'Nome', perfil_atual: 'Cargo Atual', usuario: 'Nome de Usuário' }
      showFeedback('success', `${labels[editingField] || editingField} atualizado com sucesso`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao salvar'
      showFeedback('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
    setShowPasswordModal(false)
    setPassword('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const fieldLabel = editingField === 'nome' ? 'Nome' : editingField === 'perfil_atual' ? 'Cargo Atual' : editingField === 'usuario' ? 'Nome de Usuário' : ''

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all animate-fade-in ${
          feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {feedback.type === 'success' ? '✓ ' : '✕ '}{feedback.message}
        </div>
      )}

      <div>
        <h1 className="font-display font-bold text-2xl text-text-primary">Meu Perfil</h1>
        <p className="text-text-secondary mt-1">Gerencie suas informações e habilidades profissionais</p>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg text-text-primary mb-5 flex items-center gap-2">
          <span>👤</span> Informações Pessoais
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-muted mb-1.5">Nome</p>
            <div className="flex items-center gap-2 group">
              <p className="font-medium text-text-primary">{profile?.nome}</p>
              <button onClick={() => startEdit('nome', profile?.nome)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-alt text-text-muted hover:text-text-primary">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm text-text-muted mb-1.5">Nome de Usuário</p>
            <div className="flex items-center gap-2 group">
              <p className="font-medium text-text-primary">{profile?.usuario}</p>
              <button onClick={() => startEdit('usuario', profile?.usuario)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-alt text-text-muted hover:text-text-primary">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm text-text-muted mb-1.5">Cargo Atual</p>
            <div className="flex items-center gap-2 group">
              <p className="font-medium text-text-primary">{profile?.perfil_atual || 'Não definido'}</p>
              <button onClick={() => startEdit('perfil_atual', profile?.perfil_atual)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-alt text-text-muted hover:text-text-primary">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
            <span>🧠</span> Minhas Habilidades
            <span className="ml-auto text-sm font-normal text-text-muted">{ownedSkills.length}</span>
          </h2>
          {ownedSkills.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-3xl block mb-3">📋</span>
              <p className="text-text-secondary text-sm">Nenhuma habilidade cadastrada ainda.</p>
              <p className="text-text-muted text-xs mt-1">Adicione habilidades ao lado.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ownedSkills.map(h => (
                <span
                  key={h.nome}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium group"
                >
                  {h.nome}
                  <button
                    onClick={() => removeSkill(h.nome)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                    title="Remover"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg text-text-primary mb-4 flex items-center gap-2">
            <span>➕</span> Adicionar Habilidades
          </h2>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all mb-4"
            placeholder="Buscar habilidades..."
          />
          {filteredAvailable.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-text-muted text-sm">
                {search ? 'Nenhuma habilidade encontrada.' : 'Todas as habilidades foram adicionadas.'}
              </p>
              {search && (
                <button
                  onClick={() => createAndAddSkill(search)}
                  disabled={creating}
                  className="mt-3 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-all disabled:opacity-50"
                >
                  {creating ? 'Criando...' : `Criar "${search}"`}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
              {filteredAvailable.map(s => (
                <button
                  key={s.nome}
                  onClick={() => addSkill(s.nome)}
                  className="px-3 py-1.5 rounded-lg bg-surface-alt border border-surface-border text-text-secondary text-sm font-medium hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-all"
                >
                  {s.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={cancelEdit}>
          <div className="bg-surface-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg text-text-primary mb-2">Confirmar Alteração</h3>
            <p className="text-text-secondary text-sm mb-5">
              Digite sua senha para alterar <strong className="text-text-primary">{fieldLabel}</strong>:
            </p>

            {editingField && (
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-1.5">Novo valor</p>
                {editingField === 'perfil_atual' || editingField === 'nome' || editingField === 'usuario' ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-alt border border-surface-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 mb-4"
                    autoFocus
                  />
                ) : null}
              </div>
            )}

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all mb-5"
              placeholder="Sua senha"
              onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
              autoFocus
            />

            <div className="flex items-center gap-3">
              <button
                onClick={saveEdit}
                disabled={saving || !password}
                className="flex-1 px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-all disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2.5 rounded-xl bg-surface-alt text-text-secondary text-sm font-medium hover:text-text-primary transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}