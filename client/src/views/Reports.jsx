import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, CheckCircle2, Flame, Brain, BookOpen, BarChart3, Sparkles, Target, Phone, DollarSign, Activity } from 'lucide-react'
import { useReviewStore, useReviewStats } from '../store/reviewStore'
import { usePomodoroStats } from '../store/pomodoroStore'
import { useThemeStore } from '../store/themeStore'
import { useAIStore } from '../store/aiStore'
import { useAnalytics } from '../store/reportStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { CardSkeleton, SummaryCardSkeleton, ChartSkeleton } from '../components/Skeleton'

function formatPeriod(period) {
  const d = new Date(period)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  const [selected, setSelected] = useState(null)

  const theme = useThemeStore(s => s.theme)
  const isDark = theme === 'dark' || theme === 'monk' || theme === 'night'

  const end = new Date().toISOString().split('T')[0]
  const start = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  const { data: reviewsStats, isLoading: reviewsLoading } = useReviewStats(start, end)
  const { data: pomodoroStats, isLoading: pomodoroLoading } = usePomodoroStats(start, end)
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(start, end)

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

  const axisColor = isDark ? '#636366' : '#8E8E93'
  const tooltipBg = isDark ? '#2C2C2E' : '#FFFFFF'
  const tooltipText = isDark ? '#F5F5F7' : '#1D1D1F'

  const habitsByWeek = useMemo(() => {
    const data = analytics?.habits?.byWeek || []
    return data.map(w => ({
      week: w.week,
      rate: w.total > 0 ? Math.round((w.done / w.total) * 100) : 0,
    }))
  }, [analytics])

  const financeByMonth = useMemo(() => {
    return (analytics?.financeByMonth || []).map(m => ({
      ...m,
      net: (m.income || 0) - (m.expense || 0),
    }))
  }, [analytics])

  const outreachByDay = useMemo(() => {
    return (analytics?.outreachByDay || []).slice(-14).map(o => ({
      day: o.date?.slice(5),
      Calls: o.calls_made || 0,
      DMs: o.dms_sent || 0,
      Responses: o.responses || 0,
    }))
  }, [analytics])

  const tasksByWeek = useMemo(() => {
    return (analytics?.tasks?.byWeek || []).map(t => ({
      week: t.week,
      completed: t.completed || 0,
    }))
  }, [analytics])

  const pageLoading = reviewsLoading || pomodoroLoading || analyticsLoading

  if (pageLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="h-8 bg-[var(--bg-surface)] rounded w-24 animate-pulse" />
        <div className="flex gap-1 p-1 rounded-lg bg-apple-surface/50 w-fit">
          {[1,2,3].map(i => <div key={i} className="h-8 w-16 bg-[var(--bg-surface)] rounded-md animate-pulse" />)}
        </div>
        <SummaryCardSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-8 space-y-6">
      <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-heading font-semibold ">Reports</motion.h1>

      {/* View Selector */}
      <div className="flex gap-1 p-1 rounded-lg bg-apple-surface/50 mb-6 w-fit overflow-x-auto scrollable-x">
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

      {/* Energy & Pomodoros Trend */}
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
                <motion.div key={p.date} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                  className="flex items-center gap-3 group cursor-pointer stack-on-mobile" onClick={() => setSelected(selected === p.date ? null : p.date)}>
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

      {/* Habit Completion Rate */}
      {habitsByWeek.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-apple-green" />
            <span className="text-small font-semibold ">Habit Completion Rate</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={habitsByWeek}>
                <defs>
                  <linearGradient id="habitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34C759" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: tooltipBg, border: 'none', borderRadius: '8px', color: tooltipText }} formatter={v => [`${v}%`, 'Rate']} />
                <Area type="monotone" dataKey="rate" stroke="#34C759" fill="url(#habitGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Task Completion Velocity */}
      {tasksByWeek.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-apple-blue" />
            <span className="text-small font-semibold ">Task Completion Velocity</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksByWeek}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: tooltipBg, border: 'none', borderRadius: '8px', color: tooltipText }} />
                <Bar dataKey="completed" fill="#5B5BD6" radius={[4, 4, 0, 0]} name="Tasks Done" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Income vs Expense */}
      {financeByMonth.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-apple-amber" />
            <span className="text-small font-semibold ">Income vs Expenses</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: tooltipBg, border: 'none', borderRadius: '8px', color: tooltipText }} />
                <Bar dataKey="income" fill="#34C759" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#FF3B30" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Outreach Activity */}
      {outreachByDay.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Phone size={18} className="text-apple-purple" />
            <span className="text-small font-semibold ">Cold Outreach (Last 14 Days)</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outreachByDay}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: tooltipBg, border: 'none', borderRadius: '8px', color: tooltipText }} />
                <Bar dataKey="Calls" fill="#FF9F0A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="DMs" fill="#AF52DE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Responses" fill="#34C759" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
  const analysis = useAIStore(s => s.analysis)
  const loading = useAIStore(s => s.loading)
  const theme = useThemeStore(s => s.theme)
  if (loading) return <div className="animate-shimmer h-12 rounded-md" />
  if (!analysis) return <p className="text-small text-apple-muted">Click "Analyze" to get AI-powered insights from your journal entries</p>
  return (
    <div className="text-small text-apple-text p-3 rounded-md bg-apple-surface leading-relaxed">
      {analysis}
    </div>
  )
}
