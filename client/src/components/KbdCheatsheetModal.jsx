import { motion } from 'framer-motion'
import { ArrowUpDown, Search, Plus, MessageSquare, Sparkles, Eye, EyeOff, ListChecks, Monitor, Moon, BookOpen } from 'lucide-react'
import Modal from './Modal'
import { memo } from 'react'

const shortcuts = [
  { keys: ['⌘', 'K'], desc: 'Open search / command palette', icon: Search },
  { keys: ['?'], desc: 'Toggle this cheatsheet', icon: ListChecks },
  { keys: ['⌘', '1–9, 0'], desc: 'Navigate views 1–9, 0=Settings', icon: ArrowUpDown },
  { keys: ['⌘', ','], desc: 'Settings', icon: Monitor },
  { keys: ['⌘', 'J'], desc: 'Open Journal', icon: BookOpen },
  { keys: ['⌘', 'N'], desc: 'Quick add task', icon: Plus },
  { keys: ['⌘', 'I'], desc: 'Open AI Chat', icon: MessageSquare },
  { keys: ['⌘', 'B'], desc: 'Toggle sidebar', icon: EyeOff },
  { keys: ['⌘', 'D'], desc: 'Toggle dark mode', icon: Moon },
  { keys: ['⌘', 'Shift', 'F'], desc: 'Toggle focus mode', icon: Eye },
  { keys: ['⌘', 'Shift', 'G'], desc: 'Toggle gamification panel', icon: Sparkles },
  { keys: ['⌘', 'Shift', 'R'], desc: 'Toggle daily review', icon: ListChecks },
]

const KbdCheatsheetModal = memo(function KbdCheatsheetModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts" maxWidth="lg" alignTop>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {shortcuts.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                <Icon size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-small font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.desc}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {s.keys.map((k, j) => (
                  <span key={j} className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 text-[11px] font-semibold rounded-md font-mono"
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 1px 0 var(--border-color)',
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </Modal>
  )
})

export default KbdCheatsheetModal
