import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, CheckCircle2, Flame, Brain, BookOpen, BarChart3, Sparkles } from 'lucide-react'
import { useReviewStore } from '../store/reviewStore'
import { usePomodoroStore } from '../store/pomodoroStore'
import { useThemeStore } from '../store/themeStore'
import { useAIStore } from '../store/aiStore'

function formatPeriod(period) {
  const d = new Date(period)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatWeekLabel(period) {
  const d = new Date(period)
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  return `${formatPeriod(period)} – ${formatPeriod(end)}`
}

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

export default function Reports() {
  const [view, setView] = useState('week')
  const [periods, setPeriods] = useState([])
  const [selected, setSelected] = useState(null)

  const reviewsFetch = useReviewStore(s => s.fetchToday)
  const reviewsStats = useReviewStore(s => s.stats)
  const pomodoroStats = usePomodoroStore(s => s.stats)
  const fetchPomodoroStats = usePomodoroStore(s => s.fetchStats)
  const theme = useThemeStore(s => s.theme)
  const isDark = theme === 'dark' || theme === 'monk'

  useEffect(() => {
    if (reviewsStats) return
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
    useReviewStore.getState().fetchStats(start, end).catch(() => {})
    fetchPomodoroStats(start, end).catch(() => {})
  }, [])

  const periodData = useMemo(() => {
    const rDays = Array.isArray(reviewsStats?.reviews) ? reviewsStats.reviews : []
    const pDays = Array.isArray(pomodoroStats?.sessions) ? pomodoroStats.sessions : []
    if (!rDays.length && !pDays.length) return []
    const map = {}

    const allDates = [...new Set([...rDays.map(d => d.date), ...pDays.map(d => d.date)])].sort()

    allDates.forEach(date => {
      const r = rDays.find(d => d.date === date) || {}
      const p = pDays.find(d => d.date === date) || {}
      map[date] = { date, energy: r.energy, completed: r.completed, pomodoros: p.duration_min ? 1 : 0, totalMinutes: p.duration_min || 0 }
    })

    const keys = Object.keys(map).sort()

    if (view === 'day') return keys.map(k => map[k])

    if (view === 'week') {
      const weeks = {}
      keys.forEach(k => {
        const w = getMonday(k)
        if (!weeks[w]) weeks[w] = { date: w, days: 0, totalEnergy: 0, completedDays: 0, totalPomodoros: 0, totalMinutes: 0 }
        weeks[w].days++
        if (map[k].energy) { weeks[w].totalEnergy += map[k].energy }
        if (map[k].completed) weeks[w].completedDays++
        weeks[w].totalPomodoros += map[k].pomodoros
        weeks[w].totalMinutes += map[k].totalMinutes
      })
      return Object.values(weeks).map(w => ({
        ...w, avgEnergy: w.days > 0 ? (w.totalEnergy / Math.min(w.days, w.completedDays || 1)).toFixed(1) : 0
      }))
    }

    if (view === 'month') {
      const months = {}
      keys.forEach(k => {
        const m = k.slice(0, 7)
        if (!months[m]) months[m] = { date: m, days: 0, totalEnergy: 0, completedDays: 0, totalPomodoros: 0, totalMinutes: 0 }
        months[m].days++
        if (map[k].energy) months[m].totalEnergy += map[k].energy
        if (map[k].completed) months[m].completedDays++
        months[m].totalPomodoros += map[k].pomodoros
        months[m].totalMinutes += map[k].totalMinutes
      })
      return Object.values(months).map(m => ({
        ...m, label: new Date(m.date + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        avgEnergy: m.days > 0 ? (m.totalEnergy / Math.min(m.days, m.completedDays || 1)).toFixed(1) : 0
      }))
    }

    return []
  }, [reviewsStats, pomodoroStats, view])

  const periodLabel = view === 'day' ? 'Days' : view === 'week' ? 'Weeks' : 'Months'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-8 space-y-6">
      <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-heading font-semibold ">Reports</motion.h1>

      {/* View Selector */}
      <div className="flex gap-1 p-1 rounded-lg bg-apple-surface/50 mb-6 w-fit">
        {['day', 'week', 'month'].map(v => (
          <motion.button key={v} whileTap={{ scale: 0.95 }}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-md text-small font-medium capitalize transition-all ${view === v ? 'bg-apple-tab shadow-sm text-apple-text' : 'text-apple-muted hover:text-apple-text'}`}
          >{v}</motion.button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: CheckCircle2, label: 'Days Done', value: reviewsStats?.completedDays ?? 0, color: 'text-apple-green' },
          { icon: Brain, label: 'Avg Energy', value: reviewsStats?.avgEnergy ?? '—', color: 'text-apple-blue' },
          { icon: Flame, label: 'Pomodoros', value: pomodoroStats?.count ?? 0, color: 'text-apple-amber' },
          { icon: BookOpen, label: 'Focus Hours', value: pomodoroStats?.totalMinutes ? (pomodoroStats.totalMinutes / 60).toFixed(1) : '0', color: 'text-apple-purple' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
            className="card p-3">
            <stat.icon size={18} className={stat.color + ' mb-1 opacity-75'} />
            <div className="text-heading font-bold ">{stat.value}</div>
            <div className="text-micro text-apple-muted">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Trend Bars */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-apple-blue" />
          <span className="text-small font-semibold ">Energy & Pomodoros by {periodLabel}</span>
        </div>
        {periodData.length === 0 ? (
          <div className="text-body text-apple-muted text-center py-8">Complete daily reviews to see trends</div>
        ) : (
          <div className="space-y-3">
            {periodData.slice(-10).reverse().map((p, i) => {
              const maxPoms = Math.max(...periodData.map(x => x.totalPomodoros || 0), 1)
              const pct = (p.totalPomodoros / maxPoms) * 100
              const showLabel = view === 'month' ? (p.date.slice(0, 7)) : formatPeriod(p.date)
              return (
                <motion.div key={`${p.date}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                  className="flex items-center gap-3 group cursor-pointer" onClick={() => setSelected(selected === p.date ? null : p.date)}>
                  <div className="w-20 text-right text-micro text-apple-muted shrink-0">{showLabel}</div>
                  <div className="flex-1 h-6 bg-apple-surface rounded-md overflow-hidden relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-apple-blue to-apple-blue/60 rounded-md opacity-60" />
                    <div className="absolute inset-0 flex items-center px-2">
                      {p.avgEnergy && (
                        <div className="flex items-center gap-1 text-micro" style={{ color: p.avgEnergy >= 3 ? 'var(--success)' : 'var(--warning)' }}>
                          {p.avgEnergy >= 3 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          <span className="text-[10px] font-medium">{p.avgEnergy}/5</span>
                        </div>
                      )}
                      <div className="ml-auto text-[10px] text-apple-muted font-medium tabular-nums">{p.totalPomodoros} pom</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 mt-4">
          <div className="text-small font-semibold mb-2 ">
            {view === 'month' ? selected : formatPeriod(selected)}
          </div>
          <div className="text-small text-apple-muted space-y-1">
            <div>Reviewed days: {periodData.find(p => p.date === selected)?.completedDays || 0}</div>
            <div>Pomodoros: {periodData.find(p => p.date === selected)?.totalPomodoros || 0}</div>
            <div>Focus time: {periodData.find(p => p.date === selected)?.totalMinutes || 0}m</div>
          </div>
        </motion.div>
      )}

      {/* AI Mood Analysis */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-apple-muted" />
            <span className="section-label">AI Mood Analysis</span>
          </div>
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={async () => { await useAIStore.getState().analyzeMood(); }}
            disabled={useAIStore.getState().loading}
            className="btn-ghost text-small flex items-center gap-1">
            <Sparkles size={12} /> Analyze
          </motion.button>
        </div>
        <AIMoodResult />
      </motion.div>
    </motion.div>
  )
}

function AIMoodResult() {
  const { analysis, loading } = useAIStore()
  const theme = useThemeStore(s => s.theme)
  if (loading) return <div className="animate-shimmer h-12 rounded-md" />
  if (!analysis) return <p className="text-small text-apple-muted">Click "Analyze" to get AI-powered insights from your journal entries</p>
  return (
    <div className="text-small text-apple-text p-3 rounded-md bg-apple-surface leading-relaxed">
      {analysis}
    </div>
  )
}
