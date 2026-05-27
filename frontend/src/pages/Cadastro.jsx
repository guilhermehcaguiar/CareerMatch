import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Cadastro() {
  const { cadastrar } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', usuario: '', senha: '', perfil_atual: '' })
  const [aceite, setAceite] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nome || !form.usuario || !form.senha) { setError('Preencha todos os campos obrigatórios.'); return }
    if (form.senha.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return }
    if (!aceite) { setError('Você precisa aceitar os termos de uso.'); return }
    setLoading(true)
    try {
      await cadastrar(form)
      navigate('/perfil')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao cadastrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-brand-500/5 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl"></span>
            <span className="font-display font-bold text-xl text-text-primary">
              Career<span className="text-brand-500">Match</span>
            </span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-text-primary">Criar Conta</h1>
          <p className="text-text-secondary mt-1">Comece sua jornada de carreira</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-card border border-surface-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-fade-in">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Nome completo *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Usuário *</label>
            <input
              type="text"
              value={form.usuario}
              onChange={e => setForm({ ...form, usuario: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              placeholder="seu.usuario"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Senha *</label>
            <input
              type="password"
              value={form.senha}
              onChange={e => setForm({ ...form, senha: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Cargo atual</label>
            <input
              type="text"
              value={form.perfil_atual}
              onChange={e => setForm({ ...form, perfil_atual: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-alt border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              placeholder="Ex: Desenvolvedor Júnior"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aceite}
              onChange={e => setAceite(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-surface-border text-brand-500 focus:ring-brand-500/40"
            />
            <span className="text-sm text-text-secondary">
              Aceito os{' '}
              <span className="text-brand-500 hover:text-brand-600">Termos de Uso</span>
              {' '}e{' '}
              <span className="text-brand-500 hover:text-brand-600">Política de Privacidade</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cadastrando...
              </span>
            ) : 'Criar Conta'}
          </button>

          <p className="text-center text-sm text-text-secondary">
            Já tem conta?{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}