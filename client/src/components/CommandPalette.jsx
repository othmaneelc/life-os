import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, CheckSquare, BookOpen, Moon,
  Dumbbell, Briefcase, Settings, BarChart3, Sun,
  Plus, Search, ArrowRight, Wallet,
  Target, BookMarked, Sparkles
} from 'lucide-react'
import { useThemeStore } from '../store/themeStore'
import { useTaskStore } from '../store/taskStore'
import { useHabitStore } from '../store/habitStore'
import { useJournalStore } from '../store/journalStore'

const NAVIGATION_ITEMS = [
  { id: 'nav-dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'nav-schedule', label: 'Schedule', path: '/schedule', icon: Calendar },
  { id: 'nav-tasks', label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { id: 'nav-journal', label: 'Journal', path: '/journal', icon: BookOpen },
  { id: 'nav-prayers', label: 'Prayer Tracker', path: '/prayers', icon: Moon },
  { id: 'nav-habits', label: 'Habits', path: '/habits', icon: Dumbbell },
  { id: 'nav-agency', label: 'Agency', path: '/agency', icon: Briefcase },
  { id: 'nav-goals', label: 'Goals', path: '/goals', icon: Target },
  { id: 'nav-reading', label: 'Reading', path: '/reading', icon: BookMarked },
  { id: 'nav-reports', label: 'Reports', path: '/reports', icon: BarChart3 },
  { id: 'nav-knowledge', label: 'Knowledge Base', path: '/knowledge', icon: BookOpen },
  { id: 'nav-finance', label: 'Finance', path: '/finance', icon: Wallet },
  { id: 'nav-settings', label: 'Settings', path: '/settings', icon: Settings },
]

const ACTION_ITEMS = [
  { id: 'action-theme', label: 'Toggle Theme', action: 'toggleTheme', icon: Sun },
  { id: 'action-review', label: 'Open Daily Review', action: 'dailyReview', icon: BookOpen },
  { id: 'action-ai-chat', label: 'AI Chat', action: 'aiChat', icon: Sparkles },
  { id: 'action-add-task', label: 'Quick Add Task', action: 'addTask', icon: Plus },

]

function fuzzyMatch(text, query) {
  if (!query) return true
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  return t.includes(q) || t.split(/\s+/).some(w => w.startsWith(q))
}

export default function CommandPalette({ onClose, onOpenReview, onOpenAddTask, onOpenAddHabit, onOpenAIChat }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { theme, setTheme } = useThemeStore()
  const tasks = useTaskStore(s => s.tasks)
  const habits = useHabitStore(s => s.habits)
  const entries = useJournalStore(s => s.entries)

  const recentTasks = useMemo(() => tasks.slice(0, 5), [tasks])
  const recentHabits = useMemo(() => habits.slice(0, 5), [habits])
  const recentEntries = useMemo(() => entries.slice(0, 5), [entries])

  const filteredNavigation = useMemo(() =>
    NAVIGATION_ITEMS.filter(item => fuzzyMatch(item.label, query)), [query])

  const filteredActions = useMemo(() =>
    ACTION_ITEMS.filter(item => fuzzyMatch(item.label, query)), [query])

  const filteredTasks = useMemo(() =>
    query ? recentTasks.filter(t => fuzzyMatch(t.title || t.text || '', query)) : [], [query, recentTasks])

  const filteredHabits = useMemo(() =>
    query ? recentHabits.filter(h => fuzzyMatch(h.name || h.title || '', query)) : [], [query, recentHabits])

  const filteredEntries = useMemo(() =>
    query ? recentEntries.filter(e => fuzzyMatch(e.title || e.content || '', query)) : [], [query, recentEntries])

  const groupedResults = useMemo(() => {
    const groups = []
    if (filteredNavigation.length) {
      groups.push({ title: 'Navigation', items: filteredNavigation.map(i => ({ ...i, type: 'nav' })) })
    }
    if (filteredActions.length) {
      groups.push({ title: 'Actions', items: filteredActions.map(i => ({ ...i, type: 'action' })) })
    }
    if (filteredTasks.length) {
      groups.push({ title: 'Tasks', items: filteredTasks.map(i => ({ ...i, type: 'task' })) })
    }
    if (filteredHabits.length) {
      groups.push({ title: 'Habits', items: filteredHabits.map(i => ({ ...i, type: 'habit' })) })
    }
    if (filteredEntries.length) {
      groups.push({ title: 'Journal', items: filteredEntries.map(i => ({ ...i, type: 'entry' })) })
    }
    return groups
  }, [filteredNavigation, filteredActions, filteredTasks, filteredHabits, filteredEntries])

  const flatItems = useMemo(() =>
    groupedResults.flatMap(g => g.items), [groupedResults])

  useEffect(() => { setSelectedIndex(0) }, [query])
  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const item = listRef.current?.querySelector('[data-selected="true"]')
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleSelect = useCallback((item) => {
    if (item.type === 'nav') {
      navigate(item.path)
    } else if (item.type === 'action') {
      switch (item.action) {
        case 'toggleTheme':
          setTheme(theme === 'dark' ? 'light' : 'dark')
          break
        case 'dailyReview':
          onOpenReview?.()
          break
        case 'startPomodoro':
          navigate('/dashboard')
          break
        case 'addTask':
          onOpenAddTask?.()
          break
        case 'addHabit':
          onOpenAddHabit?.()
          break
        case 'aiChat':
          onOpenAIChat?.()
          break
      }
    } else if (item.type === 'task') {
      navigate('/tasks')
    } else if (item.type === 'habit') {
      navigate('/habits')
    } else if (item.type === 'entry') {
      navigate('/journal')
    }
    onClose?.()
  }, [navigate, theme, setTheme, onClose, onOpenReview, onOpenAddTask, onOpenAddHabit, onOpenAIChat])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (flatItems[selectedIndex]) handleSelect(flatItems[selectedIndex])
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flatItems, selectedIndex, onClose, handleSelect])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[560px] mx-4 bg-apple-card rounded-xl border border-apple-border shadow-apple overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-apple-border">
            <Search size={18} className="text-apple-muted flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search navigation, actions, tasks..."
              className="flex-1 bg-transparent text-body text-apple-text placeholder:text-apple-muted outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono bg-apple-surface text-apple-muted border border-apple-border">
              ESC
            </kbd>
          </div>
          <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
            {groupedResults.length === 0 && (
              <div className="px-4 py-8 text-center text-small text-apple-muted">
                No results found
              </div>
            )}
            {groupedResults.map((group, gi) => {
              let itemOffset = 0
              for (let g = 0; g < gi; g++) itemOffset += groupedResults[g].items.length
              return (
                <div key={group.title} className="mb-2">
                  <div className="px-4 py-1.5 text-micro font-semibold text-apple-muted uppercase tracking-wider">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const globalIdx = itemOffset + group.items.indexOf(item)
                    const isSelected = globalIdx === selectedIndex
                    const Icon = item.icon || (item.type === 'task' ? CheckSquare : item.type === 'habit' ? Dumbbell : BookOpen)
                    return (
                      <button
                        key={item.id}
                        data-selected={isSelected}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-body transition-colors ${
                          isSelected
                            ? 'bg-apple-blue/10 text-apple-blue'
                            : 'text-apple-text hover:bg-apple-surface'
                        }`}
                      >
                        <Icon size={16} className={isSelected ? 'text-apple-blue' : 'text-apple-muted'} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.path && (
                          <span className="text-micro text-apple-muted">{item.path}</span>
                        )}
                        {isSelected && <ArrowRight size={14} className="text-apple-blue" />}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div className="px-4 py-2.5 border-t border-apple-border flex items-center gap-4 text-micro text-apple-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-apple-surface border border-apple-border font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-apple-surface border border-apple-border font-mono">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-apple-surface border border-apple-border font-mono">esc</kbd>
              close
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}