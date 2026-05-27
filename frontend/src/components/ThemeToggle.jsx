import { useTheme } from '../contexts/ThemeContext'

const modes = [
  { value: 'light', label: 'Claro', icon: '☀️' },
  { value: 'dark', label: 'Escuro', icon: '🌙' },
  { value: 'system', label: 'Auto', icon: '💻' },
]

export default function ThemeToggle() {
  const { mode, toggleTheme } = useTheme()

  return (
    <div className="flex items-center justify-center gap-0.5 rounded-xl bg-surface-alt p-1 border border-surface-border w-full">
      {modes.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => toggleTheme(value)}
          className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 flex-1 min-w-0 ${
            mode === value
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
          title={label}
        >
          <span className="text-xs shrink-0">{icon}</span>
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  )
}