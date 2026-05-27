import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'

const features = [
  {
    icon: '🧠',
    title: 'Análise de Habilidades',
    desc: 'Mapeie suas hard e soft skills com nossa plataforma inteligente.',
  },
  {
    icon: '🎯',
    title: 'Match Score',
    desc: 'Descubra seu nível de compatibilidade com centenas de carreiras.',
  },
  {
    icon: '📈',
    title: 'Análise de Gaps',
    desc: 'Identifique exatamente o que falta para alcançar a vaga dos sonhos.',
  },
]

const stats = [
  { value: '10K+', label: 'Usuários Ativos' },
  { value: '500+', label: 'Carreiras Mapeadas' },
  { value: '95%', label: 'Satisfação' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl"></span>
            <span className="font-display font-bold text-xl text-text-primary">
              Career<span className="text-brand-500">Match</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 shadow-sm transition-all"
            >
              Cadastrar
            </Link>
          </div>
        </div>
      </header>

      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-text-primary leading-[1.1] mb-6">
            Sua Carreira no
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Próximo Nível
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Descubra vagas que combinam com suas habilidades, identifique gaps de conhecimento
            e receba recomendações de cursos para acelerar sua evolução profissional.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/cadastro"
              className="px-8 py-3.5 rounded-xl text-base font-semibold bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25 transition-all"
            >
              Começar Agora
            </Link>
            <Link
              to="/login"
              className="px-8 py-3.5 rounded-xl text-base font-medium border border-surface-border text-text-secondary hover:bg-surface-alt transition-all"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-surface-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary mb-4">
              Como Funciona
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Três passos simples para transformar sua carreira
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 stagger">
            {features.map((f, i) => (
              <div
                key={i}
                className="animate-slide-up opacity-0 group p-8 rounded-2xl bg-surface-card border border-surface-border hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-xl text-text-primary mb-3">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface-alt border-t border-surface-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-display font-extrabold text-3xl sm:text-4xl text-brand-500 mb-1">{s.value}</p>
                <p className="text-text-secondary text-sm sm:text-base">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-surface-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl"></span>
            <span className="font-display font-bold text-text-primary">
              Career<span className="text-brand-500">Match</span>
            </span>
          </div>
          <p className="text-text-muted text-sm">
            &copy; {new Date().getFullYear()} CareerMatch. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}