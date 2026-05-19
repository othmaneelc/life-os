import { motion } from 'framer-motion'
import { Sun, Moon, Sparkles, MoonStar } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'

const themes = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Night', icon: Moon },
  { key: 'night', label: 'Warm', icon: MoonStar },
  { key: 'monk', label: 'Monk', icon: Sparkles },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-apple-surface/50">
      {themes.map(t => {
        const Icon = t.icon
        const active = theme === t.key
        return (
          <motion.button
            key={t.key}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(t.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-small font-medium transition-all ${active ? 'bg-apple-tab shadow-sm text-apple-text' : 'text-apple-muted hover:text-apple-text'}`}
            title={t.label}
          >
            <Icon size={14} />
            <span>{t.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
