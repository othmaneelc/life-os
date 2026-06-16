import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Flame, Calendar, BookOpen,
  LayoutGrid, X, Moon, ListChecks, Bed, Dumbbell, MapPin, Heart,
  BookMarked, Target, Brain, ScanEye,
  Building2, Briefcase, Wallet,
  Lock, Layers, BarChart3, Bot, Settings, Search
} from 'lucide-react'
import { useHabitStore } from '../store/habitStore'
import { useTaskStore } from '../store/taskStore'
import { useAppUIStore } from '../store/appUIStore'

const MAIN_TABS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks', badge: 'tasks' },
  { path: '/habits', icon: Flame, label: 'Habits', badge: 'habits' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/journal', icon: BookOpen, label: 'Journal' },
]

const DRAWER_SECTIONS = [
  {
    label: 'CORE',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { path: '/schedule', icon: Calendar, label: 'Schedule' },
      { path: '/journal', icon: BookOpen, label: 'Journal' },
      { path: '/prayers', icon: Moon, label: 'Prayer Tracker' },
    ],
  },
  {
    label: 'LIFE',
    items: [
      { path: '/habits', icon: Flame, label: 'Habits' },
      { path: '/chores', icon: ListChecks, label: 'Chores' },
      { path: '/sleep', icon: Bed, label: 'Sleep' },
      { path: '/workouts', icon: Dumbbell, label: 'Workouts' },
      { path: '/travel', icon: MapPin, label: 'Travel' },
      { path: '/relationships', icon: Heart, label: 'Relationships' },
    ],
  },
  {
    label: 'GROWTH',
    items: [
      { path: '/reading', icon: BookMarked, label: 'Reading' },
      { path: '/goals', icon: Target, label: 'Goals' },
      { path: '/knowledge', icon: Brain, label: 'Knowledge Base' },
      { path: '/black-mirror', icon: ScanEye, label: 'Black Mirror' },
    ],
  },
  {
    label: 'WORK',
    items: [
      { path: '/agency', icon: Building2, label: 'Agency' },
      { path: '/client/cdz', icon: Briefcase, label: 'CDZ Client' },
      { path: '/finance', icon: Wallet, label: 'Finance' },
    ],
  },
  {
    label: 'PRIVACY',
    items: [
      { path: '/vault', icon: Lock, label: 'Vault' },
      { path: '/identities', icon: Layers, label: 'Identity Stack' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/reports', icon: BarChart3, label: 'Reports' },
      { path: '/agents', icon: Bot, label: 'Agents' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

function NavBadge({ type }) {
  const pendingTasks = useTaskStore(s => s.tasks?.filter(t => t.status !== 'done').length || 0)
  const pendingHabits = useHabitStore(s => s.todayHabits?.filter(h => !h.done_today).length || 0)
  const count = type === 'tasks' ? pendingTasks : type === 'habits' ? pendingHabits : 0
  if (!count) return null
  return (
    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
      style={{ background: 'var(--danger)' }}>
      {count > 9 ? '9+' : count}
    </motion.span>
  )
}

function MoreDrawer({ open, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNav = (path) => {
    navigate(path)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label="All sections navigation"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
              <span className="text-subheading font-semibold text-[var(--text-primary)]">All Sections</span>
              <button onClick={onClose} aria-label="Close menu" className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)]">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-3 pb-6" style={{ maxHeight: 'calc(80vh - 60px)' }}>
              {DRAWER_SECTIONS.map((section) => (
                <div key={section.label}>
                  <div className="px-3 pt-4 pb-1">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--text-tertiary)]">
                      {section.label}
                    </span>
                  </div>
                  {section.items.map((item) => {
                    const active = location.pathname === item.path
                    const Icon = item.icon
                    return (
                      <button key={item.path} onClick={() => handleNav(item.path)}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium transition-colors ${
                          active ? 'text-[var(--accent)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                        }`}>
                        <Icon size={16} className={active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom"
        aria-label="Mobile navigation"
        style={{ background: 'var(--bg-glass)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid var(--border-glass)' }}>
        <div className="flex items-center justify-around px-2 py-1">
          {MAIN_TABS.map(item => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors"
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', minWidth: 48 }}
              >
                {active && (
                  <motion.div layoutId="mobile-nav-active" transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute inset-0 rounded-lg" style={{ background: 'var(--accent-soft)' }} />
                )}
                <span className="relative">
                  <Icon size={20} />
                  {item.badge && <NavBadge type={item.badge} />}
                </span>
                <span className="text-[10px] font-medium relative">{item.label}</span>
              </button>
            )
          })}
          <button onClick={() => useAppUIStore.getState().openSearch()}
            aria-label="Search"
            className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', minWidth: 48 }}>
            <Search size={20} />
            <span className="text-[10px] font-medium">Search</span>
          </button>
          <button onClick={() => setDrawerOpen(true)}
            aria-label="More sections"
            className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', minWidth: 48 }}>
            <LayoutGrid size={20} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
      <MoreDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
