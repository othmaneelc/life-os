import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckSquare, BookOpen, MessageSquare, ListChecks } from 'lucide-react'
import { useAppUIStore } from '../store/appUIStore'
import { useAIStore } from '../store/aiStore'

const actions = [
  { id: 'task', label: 'Quick Task', icon: CheckSquare, color: '#5B5BD6' },
  { id: 'journal', label: 'Journal Entry', icon: BookOpen, color: '#34C759' },
  { id: 'ai', label: 'Ask AI', icon: MessageSquare, color: '#FF9F0A' },
  { id: 'review', label: 'Daily Review', icon: ListChecks, color: '#FF3B30' },
]

export default function QuickCaptureFab() {
  const [open, setOpen] = useState(false)
  const openQuickAdd = useAppUIStore(s => s.openQuickAdd)
  const openDailyReview = useAppUIStore(s => s.openDailyReview)
  const setAiOpen = useAIStore(s => s.setOpen)

  function handleAction(id) {
    setOpen(false)
    switch (id) {
      case 'task': openQuickAdd(); break
      case 'journal': openQuickAdd(); break
      case 'ai': setAiOpen(true); break
      case 'review': openDailyReview(); break
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 md:hidden" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <AnimatePresence>
        {open && actions.map((a, i) => {
          const Icon = a.icon
          return (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25, delay: i * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction(a.id)}
              aria-label={a.label}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium glass-card"
              style={{ color: 'var(--text-primary)', boxShadow: 'var(--shadow-lg)' }}
            >
              <Icon size={16} style={{ color: a.color }} />
              <span>{a.label}</span>
            </motion.button>
          )
        })}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08, rotate: open ? 90 : 0 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: 'var(--gradient-accent)',
          color: 'white',
          boxShadow: '0 4px 20px var(--accent-glow)',
        }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Plus size={22} />
      </motion.button>
    </div>
  )
}
