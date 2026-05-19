import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Star, Target, Flame, Calendar, Clock, ChevronRight, Sparkles, Brain, TrendingUp, DollarSign, BookOpen, BarChart3, RefreshCw } from 'lucide-react'
import StatCard from '../components/StatCard'
import PrayerRow from '../components/PrayerRow'
import DailyReviewModal from '../components/DailyReviewModal'
import { useTaskStore } from '../store/taskStore'
import { usePrayerStore } from '../store/prayerStore'
import { useHabitStore } from '../store/habitStore'
import { useAgencyStore } from '../store/agencyStore'
import { useReviewStore } from '../store/reviewStore'
import { useFinanceStore } from '../store/financeStore'
import { useJournalStore } from '../store/journalStore'
import { useAIStore } from '../store/aiStore'
import { usePrayerTimes, useLiveClock } from '../hooks/usePrayerTimes'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'
import { getGreeting, getFormattedDate, getTodayStr, getDaysSince } from '../utils/dateHelpers'
import { prayerNames, motivations } from '../utils/formatters'
import { staggerContainer, staggerItem, bentoCard } from '../utils/animations'

function TypewriterText({ text, delay = 0 }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) return
    setDisplayed('')
    setDone(false)
    const timer = setTimeout(() => {
      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) { clearInterval(interval); setDone(true) }
      }, 18)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timer)
  }, [text, delay])

  return (
    <span>
      {displayed}
      {!done && <span className="animate-typewrite-cursor text-apple-accent">|</span>}
    </span>
  )
}

function HabitProgressRing({ done, total }) {
  const pct = total > 0 ? done / total : 0
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--bg-surface)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none" stroke="var(--accent)" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-heading font-bold text-apple-text tabular-nums">{Math.round(pct * 100)}%</span>
        <span className="text-micro text-apple-muted">habits</span>
      </div>
    </div>
  )
}

function FinanceSparkline({ transactions }) {
  const days = useMemo(() => {
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayTx = transactions.filter(t => t.date === dateStr)
      const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      result.push({ date: dateStr, income, expense })
    }
    return result
  }, [transactions])

  const maxVal = Math.max(...days.map(d => Math.max(d.income, d.expense, 1)))
  const w = 200; const h = 50
  const incomePoints = days.map((d, i) => `${(i / (days.length - 1)) * w},${h - (d.income / maxVal) * h}`).join(' ')
  const expensePoints = days.map((d, i) => `${(i / (days.length - 1)) * w},${h - (d.expense / maxVal) * h}`).join(' ')

  const net = days.reduce((s, d) => s + d.income - d.expense, 0)

  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-heading font-bold text-apple-text" style={{ color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {net >= 0 ? '+' : ''}{net.toFixed(0)} MAD
        </span>
        <span className="text-micro text-apple-muted">7d net</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <polyline fill="none" stroke="var(--success)" strokeWidth="1.5" strokeOpacity="0.6" points={incomePoints} />
        <polyline fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeOpacity="0.6" points={expensePoints} />
      </svg>
      <div className="flex justify-between text-micro text-apple-muted mt-1">
        <span>{days[0]?.date?.slice(5)}</span>
        <span>{days[days.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  )
}

function ParallaxCard({ children, className = '' }) {
  const ref = useRef(null)
  const x = useMotionValue(0); const y = useMotionValue(0)
  const rotateX = useTransform(y, [-0.5, 0.5], [3, -3])
  const rotateY = useTransform(x, [-0.5, 0.5], [-3, 3])

  function handleMouse(e) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleLeave() { x.set(0); y.set(0) }

  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, perspective: 800 }}
      className={`transition-shadow duration-200 ${className}`}
    >
      {children}
    </motion.div>
  )
}

export default function Dashboard() {
  const today = getTodayStr()
  const clock = useLiveClock()
  const { prayerTimes, nextPrayer, countdown } = usePrayerTimes(today)
  const { events } = useGoogleCalendar(today)
  const tasks = useTaskStore(s => s.tasks)
  const fetchTasks = useTaskStore(s => s.fetchTasks)
  const todayPrayers = usePrayerStore(s => s.todayPrayers)
  const fetchTodayPrayers = usePrayerStore(s => s.fetchTodayPrayers)
  const fetchFajrStreak = usePrayerStore(s => s.fetchFajrStreak)
  const fajrStreak = usePrayerStore(s => s.fajrStreak)
  const todayHabits = useHabitStore(s => s.todayHabits)
  const habitsStats = useHabitStore(s => s.stats)
  const fetchToday = useHabitStore(s => s.fetchToday)
  const toggleLog = useHabitStore(s => s.toggleLog)
  const fetchHabitsStats = useHabitStore(s => s.fetchStats)
  const clients = useAgencyStore(s => s.clients)
  const fetchClients = useAgencyStore(s => s.fetchClients)
  const todayReviewEntry = useReviewStore(s => s.todayReview)
  const fetchTodayReview = useReviewStore(s => s.fetchToday)
  const transactions = useFinanceStore(s => s.transactions)
  const fetchTransactions = useFinanceStore(s => s.fetchTransactions)
  const entries = useJournalStore(s => s.entries)
  const fetchEntries = useJournalStore(s => s.fetchEntries)
  const briefing = useAIStore(s => s.briefing)
  const briefingLoading = useAIStore(s => s.briefingLoading)
  const getBriefing = useAIStore(s => s.getBriefing)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [userName, setUserName] = useState('Othmane')
  const [briefingLoaded, setBriefingLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.user_name) setUserName(s.user_name)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    Promise.allSettled([
      fetchTasks(), fetchTodayPrayers(), fetchToday(), fetchClients(), fetchTransactions(),
      fetchEntries(),
    ]).catch(() => {})
    fetchFajrStreak()?.catch?.(() => {})
    fetchHabitsStats()?.catch?.(() => {})
    fetchTodayReview(today)?.catch?.(() => {})
  }, [])

  useEffect(() => {
    if (!briefing && !briefingLoaded && !briefingLoading) {
      getBriefing('dashboard')
      setBriefingLoaded(true)
    }
  }, [briefing, briefingLoaded, briefingLoading])

  const topPriority = useMemo(() => tasks.find(t => t.is_top_priority), [tasks])
  const urgentTasks = useMemo(() => tasks.filter(t => t.category === 'urgent' && t.status !== 'done').slice(0, 3), [tasks])
  const tasksDoneToday = useMemo(() => tasks.filter(t => t.status === 'done' && t.completed_at?.startsWith(today)).length, [tasks])
  const habitsDone = useMemo(() => todayHabits.filter(h => h.done_today).length, [todayHabits])
  const daysBuilding = getDaysSince('2026-01-03')

  const latestEntry = useMemo(() => entries?.[0] || null, [entries])
  const randomMotivation = useMemo(() => motivations[Math.floor(Math.random() * motivations.length)], [])



  return (
    <div className="h-full overflow-y-auto">
      <div className="relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ background: 'var(--gradient-accent)', backgroundSize: '200% 200%' }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-5 space-y-4">
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
            <div>
              <h1 className="text-hero font-semibold text-apple-text tracking-tight">
                {getGreeting()}, {userName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-body text-apple-muted">{getFormattedDate()}</span>
                <span className="text-body font-mono text-apple-muted font-medium tabular-nums">{clock.toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-small text-apple-muted bg-apple-glass border border-apple-glass-border rounded-full px-3 py-1.5 backdrop-blur-xl">
              <Flame size={13} className="text-apple-amber" />
              <span>{daysBuilding} days building</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard value={`${tasksDoneToday}/${tasks.length}`} label="Tasks done today" icon={Target} />
            <StatCard value={`${habitsDone}/${todayHabits.length}`} label="Habits checked" icon={Sparkles} />
            <StatCard value={habitsStats?.weekCompletion ? `${habitsStats.weekCompletion}%` : '—'} label="Week completion" icon={BarChart3} />
            <StatCard value={daysBuilding} label="Days building" icon={Flame} />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4">
            <motion.div {...bentoCard} transition={{ delay: 0.1 }} className="lg:col-span-5 bg-apple-card border border-apple-border rounded-xl p-5 overflow-hidden relative">
              <div className="absolute inset-0 opacity-[0.03] animate-gradient-shift pointer-events-none" style={{ background: 'var(--gradient-accent)', backgroundSize: '200% 200%' }} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={15} className="text-apple-purple" />
                  <span className="text-small font-semibold text-apple-text">AI Daily Briefing</span>
                  {briefingLoading && <RefreshCw size={12} className="animate-spin text-apple-muted" />}
                </div>
                <div className="text-body text-apple-text leading-relaxed min-h-[60px]">
                  {briefing ? (
                    <TypewriterText text={briefing} />
                  ) : briefingLoading ? (
                    <span className="text-apple-muted animate-pulse">Loading your briefing...</span>
                  ) : (
                    <span className="text-apple-muted">Tap the AI button for a personalized daily briefing</span>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div {...bentoCard} transition={{ delay: 0.15 }} className="lg:col-span-3 bg-apple-card border border-apple-border rounded-xl p-5 flex flex-col items-center justify-center relative">
              <HabitProgressRing done={habitsDone} total={todayHabits.length || 1} />
              <div className="text-center mt-3">
                <p className="text-small font-medium text-apple-text">{habitsDone} of {todayHabits.length} habits</p>
                <p className="text-micro text-apple-muted mt-0.5">{randomMotivation}</p>
              </div>
            </motion.div>

            <motion.div {...bentoCard} transition={{ delay: 0.2 }} className="lg:col-span-4 bg-apple-card border border-apple-border rounded-xl p-5 relative overflow-hidden"
              style={{ borderLeft: '3px solid var(--accent)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Star size={14} className="text-apple-amber" />
                <span className="text-small font-semibold text-apple-text">Top Priority</span>
              </div>
              {topPriority ? (
                <div>
                  <p className="text-subheading font-semibold text-apple-text leading-snug">{topPriority.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {topPriority.tag && <span className="badge-gray text-micro">{topPriority.tag}</span>}
                    <span className="badge-gray text-micro capitalize">{topPriority.priority}</span>
                  </div>
                </div>
              ) : (
                <p className="text-body text-apple-muted">Tap ★ on a task to set priority</p>
              )}
              {urgentTasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-apple-border">
                  <p className="text-micro font-medium text-apple-red mb-1.5">Urgent</p>
                  <div className="space-y-1">
                    {urgentTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-small text-apple-text">
                        <div className="w-1 h-3 rounded-full bg-apple-red/60" />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div {...bentoCard} transition={{ delay: 0.25 }} className="lg:col-span-4 bg-apple-card border border-apple-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-small font-semibold text-apple-text">Prayer Times</span>
                {nextPrayer && countdown && (
                  <span className="flex items-center gap-1 text-micro text-apple-muted bg-apple-surface px-2 py-1 rounded-full">
                    <Clock size={11} /> {nextPrayer.name} in {countdown}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {prayerNames.map((p, i) => (
                  <PrayerRow key={p} prayerName={p} scheduledTime={prayerTimes?.[p]}
                    isNext={nextPrayer?.name === p} countdown={nextPrayer?.name === p ? countdown : null} index={i} />
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 text-small text-apple-muted border-t border-apple-border">
                <span>Done: <strong className="text-apple-text">{todayPrayers?.filter(p => p?.done).length ?? 0}/5</strong></span>
                {fajrStreak > 0 && <span className="flex items-center gap-1 text-apple-amber"><Flame size={12} /> Fajr: {fajrStreak}d</span>}
              </div>
            </motion.div>

            <motion.div {...bentoCard} transition={{ delay: 0.3 }} className="lg:col-span-4 bg-apple-card border border-apple-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-apple-muted" />
                <span className="text-small font-semibold text-apple-text">Today's Events</span>
              </div>
              {events.length > 0 ? (
                <div className="space-y-1.5">
                  {events.slice(0, 4).map((event, i) => (
                    <div key={event.id || i} className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-apple-surface transition-colors">
                      <div className="w-0.5 h-6 rounded-full bg-apple-blue/40" />
                      <div className="min-w-0 flex-1">
                        <div className="text-small font-medium text-apple-text truncate">{event.summary}</div>
                        <div className="text-micro text-apple-muted">
                          {event.start ? new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-apple-muted">
                  <Calendar size={20} className="mb-1.5 opacity-40" />
                  <span className="text-small">No events today</span>
                </div>
              )}
            </motion.div>

            <motion.div {...bentoCard} transition={{ delay: 0.35 }} className="lg:col-span-4 bg-apple-card border border-apple-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-apple-muted" />
                <span className="text-small font-semibold text-apple-text">Quick Check</span>
              </div>
              <div className="space-y-1">
                {todayHabits.slice(0, 5).map((h, i) => (
                  <label key={h.id} className="flex items-center gap-2.5 py-1 px-1 rounded-md hover:bg-apple-surface transition-colors cursor-pointer">
                    <input type="checkbox" checked={h.done_today} onChange={() => toggleLog(h.id, today, !h.done_today)}
                      className="w-3.5 h-3.5 rounded border-apple-border text-apple-green focus:ring-apple-green/30 cursor-pointer" />
                    <span className={`text-small flex-1 transition-colors ${h.done_today ? 'line-through text-apple-tertiary' : 'text-apple-text'}`}>{h.name}</span>
                  </label>
                ))}
              </div>
              {todayHabits.length > 5 && (
                <p className="text-micro text-apple-muted text-center mt-2">+{todayHabits.length - 5} more</p>
              )}
            </motion.div>

            <motion.div {...bentoCard} transition={{ delay: 0.4 }} className="lg:col-span-4 bg-apple-card border border-apple-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={14} className="text-apple-green" />
                <span className="text-small font-semibold text-apple-text">Finance</span>
              </div>
              <FinanceSparkline transactions={transactions} />
            </motion.div>

            <motion.div {...bentoCard} transition={{ delay: 0.45 }} className="lg:col-span-4 bg-apple-card border border-apple-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-apple-muted" />
                <span className="text-small font-semibold text-apple-text">Agency Pulse</span>
              </div>
              {clients.length > 0 ? (
                <div>
                  <p className="text-body font-medium text-apple-text truncate">{clients[0].name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1.5 flex-1 bg-apple-surface rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 0.6 }} className="h-full bg-apple-accent rounded-full" />
                    </div>
                    <span className="text-micro text-apple-muted">3/3mo</span>
                  </div>
                  {clients[0].contract_end && <p className="text-micro text-apple-muted mt-1">Expires {clients[0].contract_end}</p>}
                </div>
              ) : (
                <p className="text-small text-apple-muted">No active clients</p>
              )}
              <div className="mt-2 pt-2 border-t border-apple-border">
                <div className="flex items-center justify-between text-small">
                  <span className="text-apple-muted">Active clients:</span>
                  <span className="text-apple-text font-medium">{clients.length}</span>
                </div>
              </div>
            </motion.div>

            <ParallaxCard className="lg:col-span-4">
              <motion.div {...bentoCard} transition={{ delay: 0.5 }} className="bg-apple-card border border-apple-border rounded-xl p-5 h-full"
                style={{ background: 'var(--gradient-hero)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen size={14} className="text-apple-purple" />
                  <span className="text-small font-semibold text-apple-text">Latest Journal</span>
                </div>
                {latestEntry ? (
                  <div>
                    <p className="text-small font-medium text-apple-text truncate">{latestEntry.date}</p>
                    <p className="text-micro text-apple-muted mt-1 line-clamp-3">
                      {latestEntry.what_happened || 'No content'}
                    </p>
                  </div>
                ) : (
                  <p className="text-small text-apple-muted">No entries yet. Start journaling!</p>
                )}
              </motion.div>
            </ParallaxCard>
          </div>

          <motion.div {...bentoCard} transition={{ delay: 0.55 }} className="bg-apple-card border border-apple-border rounded-xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.02] animate-gradient-shift pointer-events-none" style={{ background: 'var(--gradient-success)', backgroundSize: '200% 200%' }} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain size={15} className="text-apple-purple" />
                <div>
                  <span className="text-small font-semibold text-apple-text">Daily Review</span>
                  <p className="text-micro text-apple-muted mt-0.5">
                    {todayReviewEntry?.completed ? 'Today reviewed' : 'End your day with reflection'}
                  </p>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setReviewOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-small font-medium rounded-lg bg-apple-surface text-apple-text hover:bg-apple-elevated transition-colors"
              >{todayReviewEntry?.completed ? 'View' : 'Reflect'} <ChevronRight size={13} /></motion.button>
            </div>
            {todayReviewEntry?.completed && (
              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-apple-border">
                <div className="text-center">
                  <div className="text-micro text-apple-muted mb-0.5">Energy</div>
                  <div className="text-body">{['😴','🙁','😐','😊','🔥'][(todayReviewEntry.energy || 3) - 1]}</div>
                </div>
                <div className="text-center">
                  <div className="text-micro text-apple-muted mb-0.5">Wins</div>
                  <div className="text-small text-apple-text truncate">{todayReviewEntry.wins?.split('\n')[0] || '—'}</div>
                </div>
                <div className="text-center">
                  <div className="text-micro text-apple-muted mb-0.5">Tomorrow</div>
                  <div className="text-small text-apple-text truncate">{todayReviewEntry.tomorrow_focus || '—'}</div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      {reviewOpen && <DailyReviewModal onClose={() => setReviewOpen(false)} />}
    </div>
  )
}
