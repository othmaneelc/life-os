import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, X, Flame, Sparkles, LayoutGrid, List, CalendarDays, ChevronLeft, ChevronRight, Search, BookOpen, Trash2, Zap, GripVertical, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'

import EmptyState from '../components/EmptyState'
import DataError from '../components/DataError'
import { useConfirm } from '../hooks/useConfirm'
import { useHabits, useTodayHabits, useHabitWeek, useHabitStats, useHabitMonthLogs, 
         useToggleHabitLog, useAddHabit, useAddHabitsBulk, useUpdateHabit, useDeleteHabit, useReorderHabits } from '../store/habitStore'
import { useAIStore } from '../store/aiStore'
import { getTodayStr, getWeekStart } from '../utils/dateHelpers'
import { staggerContainer, staggerItem } from '../utils/animations'
import { habitTemplates, templateBooks, categoryColors, categoryIcons } from '../utils/habitTemplates'

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const defaults = { spread: 60, ticks: 60, gravity: 0.6, decay: 0.94, startVelocity: 20, colors: ['#34C759', '#5B5BD6', '#FF9F0A', '#AF52DE', '#FF3B30'] }
  confetti({ ...defaults, particleCount: 30, origin: { y: 0.6 } })
  setTimeout(() => confetti({ ...defaults, particleCount: 20, origin: { x: 0.3, y: 0.5 } }), 100)
  setTimeout(() => confetti({ ...defaults, particleCount: 20, origin: { x: 0.7, y: 0.5 } }), 150)
}

function SortableHabit({ habit, index, onToggle, onDelete, viewMode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      variants={staggerItem}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isDragging ? 'bg-apple-elevated shadow-card z-50' : 'hover:bg-apple-surface group'}`}
    >
<button {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab active:cursor-grabbing text-apple-tertiary hover:text-apple-text transition-colors flex-shrink-0">
        <GripVertical size={14} />
      </button>
<button
        onClick={() => { const currentlyDone = habit.done_today; onToggle(habit.id, getTodayStr(), !currentlyDone); if (!currentlyDone) fireConfetti() }} aria-label="Toggle habit"
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0 ${habit.done_today ? 'bg-apple-green text-white shadow-glow' : 'bg-apple-surface border border-apple-border text-apple-tertiary hover:border-apple-green/40'}`}
      >
        {habit.done_today ? <Check size={13} /> : null}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-body font-medium text-apple-text truncate">{habit.name}</div>
        <div className="text-micro text-apple-muted">{habit.category}</div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button onClick={() => onDelete(habit.id)} aria-label="Delete habit" className="p-1 rounded-md text-apple-tertiary hover:text-apple-red hover:bg-apple-surface transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  )
}

function TemplatesModal({ open, onClose, onSelect }) {
  const [activeBook, setActiveBook] = useState('quran-sunnah')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])

  const filtered = useMemo(() => {
    let list = habitTemplates.filter(t => t.book === activeBook)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    }
    return list
  }, [activeBook, search])

  function toggleSelect(name) {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  async function handleAddSelected() {
    if (!selected.length) return
    const templates = habitTemplates.filter(t => selected.includes(t.name))
    const count = await onSelect(templates)
    if (count > 0) { setSelected([]); onClose() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col bg-apple-card border border-apple-border rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-apple-border">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-apple-accent" />
            <h2 className="text-title font-semibold text-apple-text">Habit Templates</h2>
          </div>
<button onClick={onClose} aria-label="Close templates" className="p-1.5 rounded-lg hover:bg-apple-surface text-apple-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-8 pr-3 py-2 text-body bg-apple-surface border border-apple-border rounded-lg text-apple-text placeholder:text-apple-tertiary focus:outline-none focus:border-apple-accent focus:ring-2 focus:ring-apple-accent/20 transition-all" />
          </div>
        </div>

        <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
          {templateBooks.map(b => (
            <button key={b.id} onClick={() => setActiveBook(b.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-small font-medium whitespace-nowrap transition-colors ${activeBook === b.id ? 'bg-apple-tab text-apple-text' : 'text-apple-muted hover:text-apple-text hover:bg-apple-surface'}`}
            ><span>{b.icon}</span> {b.name}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {filtered.map(t => (
            <div key={t.name} onClick={() => toggleSelect(t.name)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-apple-surface ${selected.includes(t.name) ? 'bg-apple-accent/5 ring-1 ring-apple-accent/30' : ''}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0`} style={{ background: categoryColors[t.category] || '#6E6E73' }}>
                {categoryIcons[t.category] || '•'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-body font-medium text-apple-text">{t.name}</div>
                <div className="text-micro text-apple-muted">{t.category} · {t.frequency}</div>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${selected.includes(t.name) ? 'bg-apple-accent border-apple-accent' : 'border-apple-border'}`}>
                {selected.includes(t.name) && <Check size={12} className="text-white" />}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-apple-muted py-8 text-body">No templates found</p>}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-apple-border">
          <span className="text-small text-apple-muted">{selected.length} selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-body font-medium text-apple-text rounded-lg hover:bg-apple-surface transition-colors">Cancel</button>
            <button onClick={handleAddSelected} disabled={!selected.length}
              className="px-4 py-2 text-body font-medium text-white rounded-lg bg-apple-accent hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >Add Selected ({selected.length})</button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function Heatmap({ habits, monthLogs, year, month }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const weeks = []
  let days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
    if (days.length === 7) { weeks.push(days); days = [] }
  }
  if (days.length) { while (days.length < 7) days.push(null); weeks.push(days) }

  const logsByDay = useMemo(() => {
    const map = {}
    monthLogs.forEach(l => {
      if (l.done) {
        map[l.date] = (map[l.date] || 0) + 1
      }
    })
    return map
  }, [monthLogs])

  const totalHabits = habits.length || 1

  function getColor(d) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const count = logsByDay[dateStr] || 0
    const ratio = count / totalHabits
    if (ratio === 0) return 'bg-apple-surface'
    if (ratio < 0.25) return 'bg-apple-heatmap-1'
    if (ratio < 0.5) return 'bg-apple-heatmap-2'
    if (ratio < 0.75) return 'bg-apple-heatmap-3'
    return 'bg-apple-heatmap-4'
  }

  return (
    <div className="space-y-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-1">
          {week.map((d, di) => (
            <div key={di} className="flex-1 aspect-square flex items-center justify-center">
              {d !== null ? (
                <div className={`w-full h-full rounded-md flex items-center justify-center text-micro font-medium ${getColor(d)} ${d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear() ? 'ring-1 ring-apple-accent/50' : ''}`}>
                  {d}
                </div>
              ) : <div />}
            </div>
          ))}
        </div>
      ))}
      <div className="flex items-center justify-end gap-1.5 pt-2">
        <span className="text-micro text-apple-muted">Less</span>
        <div className="w-3 h-3 rounded bg-apple-surface" />
        <div className="w-3 h-3 rounded bg-apple-heatmap-1" />
        <div className="w-3 h-3 rounded bg-apple-heatmap-2" />
        <div className="w-3 h-3 rounded bg-apple-heatmap-3" />
        <div className="w-3 h-3 rounded bg-apple-heatmap-4" />
        <span className="text-micro text-apple-muted">More</span>
      </div>
    </div>
  )
}

const WeekDayHeader = memo(function WeekDayHeader({ day }) {
  return <div className="w-8 text-center text-micro font-medium text-apple-muted">{day[0]}</div>
})

const WeekHabitRow = memo(function WeekHabitRow({ habit, weekStart, onToggle }) {
  const days = []
  const start = new Date(weekStart)
  for (let d = 0; d < 7; d++) {
    const date = new Date(start)
    date.setDate(start.getDate() + d)
    days.push(date.toISOString().split('T')[0])
  }
  const today = getTodayStr()
  const handleDayClick = useCallback((date, done) => {
    if (!done) fireConfetti()
    onToggle(habit.id, date, !done)
  }, [habit.id, onToggle])
  return (
    <motion.div variants={staggerItem} initial="initial" animate="animate"
      className="flex items-center gap-2 px-4 py-2.5 hover:bg-apple-surface transition-colors group border-b border-apple-border last:border-0"
    >
      <div className="flex-1 min-w-[140px]">
        <div className="text-body font-medium text-apple-text truncate">{habit.name}</div>
        <div className="text-micro text-apple-muted">{habit.category}</div>
      </div>
      <div className="flex gap-1">
        {days.map(date => {
          const done = habit.logs?.some(l => l.date === date && l.done)
          return (
            <motion.button key={date} whileTap={{ scale: 0.85 }}
              onClick={() => handleDayClick(date, done)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${done ? 'bg-apple-green text-white shadow-sm' : date === today ? 'bg-apple-surface border border-apple-blue/30 text-apple-muted' : 'bg-apple-surface text-apple-tertiary'}`}
            >{done ? <Check size={13} /> : null}</motion.button>
          )
        })}
      </div>
      <div className="w-[60px] text-right flex items-center justify-end gap-1">
        {habit.streak > 0 ? (
          <motion.span key={habit.streak} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
            className="flex items-center gap-1 text-small text-apple-amber"
          ><Flame size={13} /> {habit.streak}</motion.span>
        ) : <span className="text-small text-apple-tertiary">—</span>}
      </div>
    </motion.div>
  )
})

const LeaderboardItem = memo(function LeaderboardItem({ habit, index, totalCount }) {
  let badge = null
  if (habit.streak >= 365) badge = { icon: '💎', label: 'Diamond', color: 'text-blue-400' }
  else if (habit.streak >= 90) badge = { icon: '🥇', label: 'Gold', color: 'text-amber-400' }
  else if (habit.streak >= 30) badge = { icon: '🥈', label: 'Silver', color: 'text-gray-400' }
  else if (habit.streak >= 7) badge = { icon: '🥉', label: 'Bronze', color: 'text-orange-400' }
  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-apple-surface transition-colors ${index < totalCount - 1 ? 'border-b border-apple-border' : ''}`}>
      <span className="w-6 text-center text-small font-bold text-apple-muted">#{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-apple-text truncate">{habit.name}</span>
          {badge && <span className={`text-micro font-medium ${badge.color}`}>{badge.icon} {badge.label}</span>}
        </div>
        <div className="text-micro text-apple-muted">{habit.category}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <Flame size={16} className="text-apple-amber" />
        <span className="text-body font-bold text-apple-text">{habit.streak || 0}</span>
        <span className="text-small text-apple-muted">days</span>
      </div>
    </div>
  )
})

const MonthDayHeader = memo(function MonthDayHeader({ day }) {
  return <div className="text-center text-micro font-medium text-apple-muted">{day}</div>
})

export default function Habits() {
  const [viewMode, setViewMode] = useState('day')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [newHabit, setNewHabit] = useState({ name: '', category: 'Faith', frequency: 'daily' })
  const [heatmapMonth, setHeatmapMonth] = useState(new Date().getMonth())
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear())
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const addInputRef = useRef(null)

  const { data: todayHabits = [], isLoading: todayHabitsLoading, isError: todayHabitsError } = useTodayHabits()
  const { data: weekData = null, isLoading: weekLoading, isError: weekError } = useHabitWeek()
  const { data: stats = null, isLoading: statsLoading, isError: statsError } = useHabitStats()
  const { data: habits = [], isLoading: habitsLoading, isError: habitsError } = useHabits()
  const { data: monthLogs = [], isLoading: monthLogsLoading, isError: monthLogsError } = useHabitMonthLogs(
    new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-01',
    new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + 
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  )
  const { confirm, ConfirmModal } = useConfirm()
  const toggleHabitLogMutation = useToggleHabitLog()
  const addHabitMutation = useAddHabit()
  const addHabitsBulkMutation = useAddHabitsBulk()
  const updateHabitMutation = useUpdateHabit()
  const deleteHabitMutation = useDeleteHabit()
  const reorderHabitsMutation = useReorderHabits()
  const sendMessage = useAIStore(s => s.sendMessage)

  // Data is fetched automatically by React Query hooks
  // We only need to refetch month logs when heatmap month/year changes, which happens automatically due to query keys

  // Month logs are fetched automatically by React Query when heatmapMonth or heatmapYear changes
  // The useHabitMonthLogs hook will refetch when its queryKey changes

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

   function handleDragEnd(event) {
     const { active, over } = event
     if (!over || active.id === over.id) return
     const oldIndex = habits.findIndex(h => h.id === active.id)
     const newIndex = habits.findIndex(h => h.id === over.id)
     const newOrder = arrayMove(habits, oldIndex, newIndex)
     reorderHabitsMutation.mutate(newOrder.map(h => h.id))
   }

   const handleToggle = useCallback((habitId, date, done) => {
     toggleHabitLogMutation.mutate({ habitId, date, done })
   }, [toggleHabitLogMutation])

   function handleAdd() {
     if (!newHabit.name.trim()) return
     addHabitMutation.mutate({ 
       name: newHabit.name.trim(), 
       category: newHabit.category, 
       frequency: newHabit.frequency 
     })
     setNewHabit({ name: '', category: 'Faith', frequency: 'daily' })
     setShowAddModal(false)
   }

   async function handleAddTemplates(templates) {
     await addHabitsBulkMutation.mutate(templates)
   }

  const handleDelete = useCallback(async (id) => {
    if (await confirm('Delete this habit?')) {
      deleteHabitMutation.mutate(id)
    }
  }, [confirm, deleteHabitMutation])

  function handlePrevMonth() {
    if (heatmapMonth === 0) { setHeatmapMonth(11); setHeatmapYear(y => y - 1) }
    else setHeatmapMonth(m => m - 1)
  }

  function handleNextMonth() {
    if (heatmapMonth === 11) { setHeatmapMonth(0); setHeatmapYear(y => y + 1) }
    else setHeatmapMonth(m => m + 1)
  }

  async function handleAISuggest() {
    setShowAI(true)
    setAiLoading(true)
    setAiSuggestion('')
    try {
      const names = habits.map(h => h.name).join(', ')
      const response = await sendMessage(`Based on these current habits: ${names || 'none yet'}. Suggest 3 new impactful habits for an HVAC agency owner who values faith, fitness, and business growth. Return ONLY a JSON array of objects with "name", "category" (one of: Faith, Health, Mental, Learning, Productivity, Business, Finance, Relationships), and "frequency" (daily or weekly). No markdown, no explanation.`)
      const cleaned = response.replace(/```json|```/gi, '').trim()
      const suggestions = JSON.parse(cleaned)
      if (Array.isArray(suggestions)) {
        setAiSuggestion(suggestions)
      }
    } catch {
      setAiSuggestion([{ name: 'Could not generate suggestions. Try again.', category: 'Productivity', frequency: 'daily' }])
    }
    setAiLoading(false)
  }

  async function handleAddAISuggestion(s) {
    if (s.name.includes('Could not')) return
    await addHabitMutation.mutateAsync({ name: s.name, category: s.category, frequency: s.frequency })
    setShowAI(false)
    setAiSuggestion('')
  }

  const monthName = new Date(heatmapYear, heatmapMonth).toLocaleString('default', { month: 'long' })

  const chartData = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Week', completion: stats.weekCompletion || 0 },
      { name: 'Perfect Days', completion: stats.perfectDays ? Math.min(stats.perfectDays * 20, 100) : 0 },
    ]
  }, [stats])

  const needsAttentionList = stats?.needsAttention || []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-apple-border bg-apple-primary/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-heading font-bold text-apple-text">Habits</h1>
          {stats && (
            <span className="flex items-center gap-1 text-small text-apple-muted bg-apple-surface px-2.5 py-1 rounded-full">
              <Flame size={12} className="text-apple-amber" /> {stats.bestStreak?.streak || 0} day streak
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAI(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-small font-medium text-apple-purple rounded-lg hover:bg-apple-surface transition-colors">
            <Sparkles size={14} /> AI Suggest
          </button>
          <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-small font-medium text-apple-text rounded-lg hover:bg-apple-surface transition-colors">
            <BookOpen size={14} /> Templates
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-small font-medium text-white rounded-lg bg-apple-accent hover:opacity-90 transition-all">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-6 pt-3 pb-2">
        {['day', 'week', 'month', 'leaderboard'].map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-small font-medium capitalize transition-colors ${viewMode === mode ? 'bg-apple-tab text-apple-text shadow-sm' : 'text-apple-muted hover:text-apple-text hover:bg-apple-surface'}`}
          >
            {mode === 'day' && <List size={13} />}
            {mode === 'week' && <LayoutGrid size={13} />}
            {mode === 'month' && <CalendarDays size={13} />}
            {mode === 'leaderboard' && <Flame size={13} />}
            {mode === 'leaderboard' ? 'Streaks' : mode}
          </button>
        ))}
      </div>

      {(todayHabitsError || weekError || statsError || habitsError || monthLogsError) && (
        <div className="px-6 pt-2">
          <DataError message="Failed to load some habit data" />
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
        {(todayHabitsLoading || weekLoading || statsLoading || habitsLoading || monthLogsLoading) && habits.length === 0 && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-apple-card animate-pulse rounded-xl" />)}
          </div>
        )}
        <AnimatePresence mode="wait">
          {viewMode === 'day' && (
            <motion.div key="day" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-body font-semibold text-apple-text">Today</h2>
                <span className="text-small text-apple-muted">{todayHabits.filter(h => h.done_today).length}/{todayHabits.length} done</span>
              </div>
              {todayHabits.length === 0 ? (
                <EmptyState
                  icon="habits"
                  title="No habits for today"
                  description="Add a habit or pick from templates"
                  actionLabel="Add Habit"
                  onAction={() => setShowAddModal(true)}
                />
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
                    <motion.div initial="initial" animate="animate" variants={staggerContainer} className="bg-apple-card border border-apple-border rounded-xl overflow-hidden">
                      {habits.map((habit, i) => {
                        const todayHabit = todayHabits.find(th => th.id === habit.id) || habit
                        return <SortableHabit key={habit.id} habit={{ ...todayHabit, name: habit.name, category: habit.category }} index={i} onToggle={handleToggle} onDelete={handleDelete} viewMode={viewMode} />
                      })}
                    </motion.div>
                  </SortableContext>
                </DndContext>
              )}
            </motion.div>
          )}

          {viewMode === 'week' && (
            <motion.div key="week" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-body font-semibold text-apple-text">This Week</h2>
                {stats && <span className="text-small text-apple-muted">{stats.weekCompletion}% completion</span>}
              </div>
              {weekData?.habits?.length > 0 ? (
                <div className="bg-apple-card border border-apple-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-apple-border bg-apple-surface/50">
                    <div className="flex-1 text-micro font-medium text-apple-muted uppercase tracking-wider">Habit</div>
                    <div className="flex gap-1">
                      {weekData.habits[0]?.logs && (() => {
                        const days = []
                        const start = new Date(weekData.start)
                        for (let i = 0; i < 7; i++) {
                          const d = new Date(start)
                          d.setDate(start.getDate() + i)
                          days.push(d.toLocaleDateString('en', { weekday: 'short' }))
                        }
                        return days.map((day, i) => <WeekDayHeader key={i} day={day} />)
                      })()}
                    </div>
                    <div className="w-[60px] text-right text-micro font-medium text-apple-muted uppercase tracking-wider">Streak</div>
                  </div>
                  {weekData.habits.map(habit => (
                    <WeekHabitRow key={habit.id} habit={habit} weekStart={weekData.start} onToggle={handleToggle} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-apple-muted">
                  <LayoutGrid size={40} className="mb-3 opacity-30" />
                  <p className="text-body">No weekly data yet</p>
                </div>
              )}
            </motion.div>
          )}

          {viewMode === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-body font-semibold text-apple-text">Streak Leaderboard</h2>
                <span className="text-small text-apple-muted">Current streaks</span>
              </div>
              <div className="bg-apple-card border border-apple-border rounded-xl overflow-hidden">
                {habits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-apple-muted">
                    <Flame size={40} className="mb-3 opacity-30" />
                    <p className="text-body">No habits yet</p>
                  </div>
                ) : (
                  [].concat(habits).sort((a, b) => (b.streak || 0) - (a.streak || 0)).map((habit, i) => (
                    <LeaderboardItem key={habit.id} habit={habit} index={i} totalCount={habits.length} />
                  ))
                )}
              </div>
            </motion.div>
          )}

          {viewMode === 'month' && (
            <motion.div key="month" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevMonth} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-apple-surface text-apple-muted transition-colors"><ChevronLeft size={16} /></button>
                  <h2 className="text-body font-semibold text-apple-text">{monthName} {heatmapYear}</h2>
                  <button onClick={handleNextMonth} aria-label="Next month" className="p-1.5 rounded-lg hover:bg-apple-surface text-apple-muted transition-colors"><ChevronRight size={16} /></button>
                </div>
                <span className="text-small text-apple-muted">{habits.length} habits</span>
              </div>
              <div className="bg-apple-card border border-apple-border rounded-xl p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <MonthDayHeader key={i} day={d} />)}
                </div>
                <Heatmap habits={habits} monthLogs={monthLogs} year={heatmapYear} month={heatmapMonth} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div variants={staggerItem} initial="initial" animate="animate" className="bg-apple-card border border-apple-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-apple-accent" />
                <span className="text-small font-medium text-apple-text">Weekly Completion</span>
              </div>
              <div className="text-stat font-bold text-apple-text">{stats.weekCompletion}%</div>
              <div className="w-full h-2 bg-apple-surface rounded-full mt-2 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${stats.weekCompletion}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-apple-accent to-apple-blue" />
              </div>
            </motion.div>

            <motion.div variants={staggerItem} initial="initial" animate="animate" className="bg-apple-card border border-apple-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={14} className="text-apple-amber" />
                <span className="text-small font-medium text-apple-text">Best Streak</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-stat font-bold text-apple-text">{stats.bestStreak?.streak || 0}</span>
                <span className="text-small text-apple-muted">days</span>
              </div>
              <div className="text-small text-apple-muted mt-1">{stats.bestStreak?.name || '—'}</div>
            </motion.div>

            <motion.div variants={staggerItem} initial="initial" animate="animate" className="bg-apple-card border border-apple-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-apple-green" />
                <span className="text-small font-medium text-apple-text">Perfect Days</span>
              </div>
              <div className="text-stat font-bold text-apple-text">{stats.perfectDays || 0}</div>
              <div className="text-small text-apple-muted mt-1">this week</div>
            </motion.div>
          </div>
        )}

        {needsAttentionList.length > 0 && (
          <motion.div variants={staggerItem} initial="initial" animate="animate" className="bg-apple-card border border-apple-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-apple-amber" />
              <span className="text-small font-medium text-apple-text">Needs Attention</span>
            </div>
            <div className="space-y-2">
              {needsAttentionList.map((item) => (
                <div key={item.name} className="flex items-center justify-between py-1">
                  <span className="text-body text-apple-text">{item.name}</span>
                  <span className="text-small text-apple-muted">{item.done}/{item.total} days</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative w-full max-w-md bg-apple-card border border-apple-border rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-title font-semibold text-apple-text mb-4">New Habit</h2>
              <div className="space-y-3">
                <input ref={addInputRef} value={newHabit.name} onChange={e => setNewHabit(p => ({ ...p, name: e.target.value }))} placeholder="Habit name..." autoFocus
                  className="w-full px-3 py-2 text-body bg-apple-surface border border-apple-border rounded-lg text-apple-text placeholder:text-apple-tertiary focus:outline-none focus:border-apple-accent focus:ring-2 focus:ring-apple-accent/20 transition-all" />
                <div className="flex gap-2">
                  <select value={newHabit.category} onChange={e => setNewHabit(p => ({ ...p, category: e.target.value }))}
                    className="flex-1 px-3 py-2 text-body bg-apple-surface border border-apple-border rounded-lg text-apple-text focus:outline-none focus:border-apple-accent transition-all">
                    {['Faith', 'Health', 'Mental', 'Learning', 'Productivity', 'Business', 'Finance', 'Relationships'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={newHabit.frequency} onChange={e => setNewHabit(p => ({ ...p, frequency: e.target.value }))}
                    className="flex-1 px-3 py-2 text-body bg-apple-surface border border-apple-border rounded-lg text-apple-text focus:outline-none focus:border-apple-accent transition-all">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-body font-medium text-apple-text rounded-lg hover:bg-apple-surface transition-colors">Cancel</button>
                <button onClick={handleAdd} disabled={!newHabit.name.trim()}
                  className="px-4 py-2 text-body font-medium text-white rounded-lg bg-apple-accent hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Add Habit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TemplatesModal open={showTemplates} onClose={() => setShowTemplates(false)} onSelect={handleAddTemplates} />

      <AnimatePresence>
        {showAI && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowAI(false); setAiSuggestion('') }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative w-full max-w-md bg-apple-card border border-apple-border rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-apple-purple" />
                <h2 className="text-title font-semibold text-apple-text">AI Habit Suggestions</h2>
              </div>
              {aiLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles size={32} className="text-apple-purple" />
                  </motion.div>
                  <p className="text-body text-apple-muted">Generating suggestions...</p>
                </div>
              ) : aiSuggestion ? (
                <div className="space-y-2">
                  {Array.isArray(aiSuggestion) && aiSuggestion.map((s) => (
                    <div key={s.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-apple-surface hover:bg-apple-elevated transition-colors">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs" style={{ background: categoryColors[s.category] || '#6E6E73' }}>
                        {categoryIcons[s.category] || '•'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body font-medium text-apple-text">{s.name}</div>
                        <div className="text-micro text-apple-muted">{s.category} · {s.frequency}</div>
                      </div>
<button onClick={() => handleAddAISuggestion(s)} aria-label="Add suggestion"
                        className="p-1.5 rounded-lg text-apple-accent hover:bg-apple-accent/10 transition-colors">
                        <Plus size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 gap-3">
                  <p className="text-body text-apple-muted">Get AI-powered habit suggestions based on your current routine</p>
                  <button onClick={handleAISuggest} className="flex items-center gap-2 px-4 py-2 text-body font-medium text-white rounded-lg bg-apple-purple hover:opacity-90 transition-all">
                    <Zap size={15} /> Generate Suggestions
                  </button>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button onClick={() => { setShowAI(false); setAiSuggestion('') }} className="px-4 py-2 text-body font-medium text-apple-text rounded-lg hover:bg-apple-surface transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal />
    </motion.div>
  )
}


