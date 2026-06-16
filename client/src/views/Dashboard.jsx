import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from 'react'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Brain, TrendingUp, Star, Target, Activity, BookOpen, Sparkles, Flame, Clock as ClockIcon, GripVertical, Eye, EyeOff, RotateCcw, Maximize2, Minimize2, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudFog, Sun, Moon, Sunrise, Sunset } from 'lucide-react'
import DailyReviewModal from '../components/DailyReviewModal'
import { useTaskStore, useTasks } from '../store/taskStore'
import { usePrayerStore } from '../store/prayerStore'
import { useHabitStore, useTodayHabits, useHabitStats } from '../store/habitStore'
import { useAgencyStore, useAgencyClients } from '../store/agencyStore'
import { useTodayReview } from '../store/reviewStore'
import { useFinanceStore, useTransactions } from '../store/financeStore'
import { useJournalEntries } from '../store/journalStore'
import { useAIStore } from '../store/aiStore'
import PatternIntelligence from '../components/PatternIntelligence'
import { useDashboardStore } from '../store/dashboardStore'
import { usePrayerTimes } from '../hooks/usePrayerTimes'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'
import { useWeather } from '../hooks/useWeather'
import { getGreeting, getFormattedDate, getTodayStr, getDaysSince } from '../utils/dateHelpers'
import { motivations } from '../utils/formatters'
import { scrollReveal } from '../utils/animations'
import FlipClock from '../components/FlipClock'
import AmbientParticles from '../components/AmbientParticles'
const TypewriterText = lazy(() => import('../widgets/TypewriterText'))
const AIBriefing = lazy(() => import('../widgets/AIBriefing'))
const RevenuePipeline = lazy(() => import('../widgets/RevenuePipeline'))
const TopPriority = lazy(() => import('../widgets/TopPriority'))
const TodayStats = lazy(() => import('../widgets/TodayStats'))
const PrayerTimes = lazy(() => import('../widgets/PrayerTimes'))
const QuickCheck = lazy(() => import('../widgets/QuickCheck'))
const LatestJournal = lazy(() => import('../widgets/LatestJournal'))
const DailyReview = lazy(() => import('../widgets/DailyReview'))
const QuickOverview = lazy(() => import('../widgets/QuickOverview'))

const WEATHER_ICONS = {
  'sun': Sun, 'cloud-sun': CloudSun, 'cloud': Cloud, 'fog': CloudFog,
  'drizzle': CloudRain, 'rain': CloudRain, 'rain-heavy': CloudRain,
  'snow': CloudSnow, 'thunderstorm': CloudLightning,
}

const WIDGET_CONFIG = {
  'ai-briefing': { colSpan: 'lg:col-span-7', label: 'AI Briefing', icon: Brain },
  'revenue-pipeline': { colSpan: 'lg:col-span-5', label: 'Revenue & Pipeline', icon: TrendingUp },
  'top-priority': { colSpan: 'lg:col-span-3', label: 'Top Priority', icon: Star },
  'today-stats': { colSpan: 'lg:col-span-3', label: "Today's Stats", icon: Target },
  'prayer-times': { colSpan: 'lg:col-span-3', label: 'Prayer Times', icon: ClockIcon },
  'quick-check': { colSpan: 'lg:col-span-3', label: 'Quick Check', icon: Activity },
  'latest-journal': { colSpan: 'lg:col-span-4', label: 'Latest Journal', icon: BookOpen },
  'daily-review': { colSpan: 'lg:col-span-4', label: 'Daily Review', icon: Brain },
  'quick-overview': { colSpan: 'lg:col-span-4', label: 'Quick Overview', icon: Sparkles },
}

const WIDGET_COMPONENTS = {
  'ai-briefing': AIBriefing,
  'revenue-pipeline': RevenuePipeline,
  'top-priority': TopPriority,
  'today-stats': TodayStats,
  'prayer-times': PrayerTimes,
  'quick-check': QuickCheck,
  'latest-journal': LatestJournal,
  'daily-review': DailyReview,
  'quick-overview': QuickOverview,
}

function SortableWidget({ id, children }) {
  const editMode = useDashboardStore((s) => s.editMode)
  const toggleHidden = useDashboardStore((s) => s.toggleHidden)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const config = WIDGET_CONFIG[id]
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : 'auto',
  }
  return (
    <div ref={setNodeRef} style={style} className={`${config?.colSpan || ''}`}>
      {editMode && (
        <div className="flex items-center gap-1.5 mb-2 px-1 py-0.5 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
          <button {...attributes} {...listeners}
            className="p-0.5 rounded cursor-grab active:cursor-grabbing hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            <GripVertical size={14} />
          </button>
          <span className="text-micro font-medium flex-1" style={{ color: 'var(--accent)' }}>
            {config?.label || id}
          </span>
          <button onClick={() => toggleHidden(id)}
            className="p-0.5 rounded hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
            title="Hide widget"
          >
            <EyeOff size={13} />
          </button>
        </div>
      )}
      {children}
    </div>
  )
}

export default function Dashboard() {
  const today = getTodayStr()
  const { prayerTimes, nextPrayer, countdown } = usePrayerTimes(today)
  useGoogleCalendar(today)
  const tasks = useTaskStore(s => s.tasks)
  const todayPrayers = usePrayerStore(s => s.todayPrayers)
  const fajrStreak = usePrayerStore(s => s.fajrStreak)
  const todayHabits = useHabitStore(s => s.todayHabits)
  const habitsStats = useHabitStore(s => s.stats)
  const toggleLog = useHabitStore(s => s.toggleLog)
  const clients = useAgencyStore(s => s.clients)
  const { data: todayReviewEntry } = useTodayReview(today)
  const transactions = useFinanceStore(s => s.transactions)
  const { data: entries = [] } = useJournalEntries()

  useTasks(); useTodayHabits(); useHabitStats(); useAgencyClients(); useTransactions()

  const briefing = useAIStore(s => s.briefing)
  const briefingLoading = useAIStore(s => s.briefingLoading)
  const getBriefing = useAIStore(s => s.getBriefing)

  const [reviewOpen, setReviewOpen] = useState(false)
  const [briefingLoaded, setBriefingLoaded] = useState(false)
  const [clockFullscreen, setClockFullscreen] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const heroRef = useRef(null)

  const { data: weather, isLoading: weatherLoading } = useWeather()

  const widgetOrder = useDashboardStore((s) => s.widgetOrder)
  const hiddenWidgets = useDashboardStore((s) => s.hiddenWidgets)
  const editMode = useDashboardStore((s) => s.editMode)
  const toggleEditMode = useDashboardStore((s) => s.toggleEditMode)
  const moveWidget = useDashboardStore((s) => s.moveWidget)
  const toggleHidden = useDashboardStore((s) => s.toggleHidden)
  const resetDefault = useDashboardStore((s) => s.resetDefault)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const visibleWidgets = widgetOrder.filter((id) => !hiddenWidgets.includes(id))

  function handleDragEnd(event) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      moveWidget(widgetOrder.indexOf(active.id), widgetOrder.indexOf(over.id))
    }
  }

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => { const r = await fetch('/api/settings'); if (r.status === 401) return null; if (!r.ok) throw Error(); return r.json() },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  useEffect(() => {
    let cancelled = false
    if (!briefing && !briefingLoaded && !briefingLoading) {
      const cached = sessionStorage.getItem('briefing-cache')
      const cachedTime = sessionStorage.getItem('briefing-cache-time')
      if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 300000) {
        useAIStore.setState({ briefing: cached, briefingLoaded: true })
      } else {
        getBriefing('dashboard')
      }
      if (!cancelled) setBriefingLoaded(true)
    }
    return () => { cancelled = true }
  }, [briefing, briefingLoaded, briefingLoading])

  useEffect(() => {
    if (briefing) {
      sessionStorage.setItem('briefing-cache', briefing)
      sessionStorage.setItem('briefing-cache-time', String(Date.now()))
    }
  }, [briefing])

  const topPriority = useMemo(() => tasks?.find(t => t.is_top_priority), [tasks])
  const urgentTasks = useMemo(() => (tasks || []).filter(t => t.category === 'urgent' && t.status !== 'done').slice(0, 3), [tasks])
  const tasksDoneToday = useMemo(() => (tasks || []).filter(t => t.status === 'done' && t.completed_at?.startsWith(today)).length, [tasks])
  const habitsDone = useMemo(() => (todayHabits || []).filter(h => h.done_today).length, [todayHabits])
  const daysBuilding = getDaysSince('2026-01-03')
  const latestEntry = useMemo(() => entries?.[0] || null, [entries])
  const randomMotivation = useMemo(() => motivations[Math.floor(Math.random() * motivations.length)], [])
  const totalTasks = (tasks || []).length || 1
  const prayerDone = todayPrayers?.filter(p => p?.done).length ?? 0
  const greeting = getGreeting()
  const greetingIcon = greeting === 'Good morning' ? Sunrise : greeting === 'Good afternoon' ? Sun : greeting === 'Good evening' ? Sunset : Moon

  const handleMouseMove = useCallback((e) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
    heroRef.current.style.setProperty('--mouse-x', ((e.clientX - rect.left) / rect.width * 100) + '%')
    heroRef.current.style.setProperty('--mouse-y', ((e.clientY - rect.top) / rect.height * 100) + '%')
  }, [])

  const widgetProps = {
    topPriority, urgentTasks,
    tasksDoneToday, totalTasks,
    habitsDone, todayHabits, habitsStats, toggleLog,
    prayerDone, prayerTimes, nextPrayer, countdown, fajrStreak,
    clients, transactions,
    latestEntry, randomMotivation,
    todayReviewEntry,
    briefing, briefingLoading,
    today,
  }

  return (
    <div className="h-full overflow-y-auto relative">
      <AmbientParticles count={30} speed={0.6} />
      <div className="relative max-w-7xl mx-auto px-6 py-5 space-y-4" style={{ zIndex: 1 }}>
        <motion.div
          ref={heroRef}
          onMouseMove={handleMouseMove}
          {...scrollReveal()}
          className="hero-ambient relative overflow-hidden rounded-2xl p-6"
          style={{ background: 'var(--gradient-hero)', border: '1px solid var(--border-color)' }}
        >
          <div className="mouse-orb" style={{
            width: '350px', height: '350px', background: 'var(--accent-glow)',
            top: '0', left: '0',
            transform: `translate(${(mousePos.x - 0.5) * 30}px, ${(mousePos.y - 0.5) * 30}px)`,
            opacity: 0.3,
          }} />
          <div className="mouse-orb" style={{
            width: '250px', height: '250px', background: 'var(--accent-glow)',
            bottom: '-50px', right: '-50px',
            transform: `translate(${(mousePos.x - 0.5) * -20}px, ${(mousePos.y - 0.5) * -20}px)`,
            opacity: 0.2,
          }} />
          <div className="absolute inset-0 opacity-[0.04] animate-gradient-shift pointer-events-none" style={{ background: 'var(--gradient-accent)', backgroundSize: '200% 200%', animationDuration: '10s' }} />
          <div className="relative flex items-start justify-between stack-on-mobile gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="pulse-ring">
                  <div className="animate-wobble">
                    {greetingIcon && (() => { const Icon = greetingIcon; return <Icon size={22} className="text-[var(--accent)]" /> })()}
                  </div>
                </div>
                <h1 className="text-hero font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  <TypewriterText text={`${greeting}, ${settings?.user_name || ''}`} delay={200} />
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                <span className="text-body" style={{ color: 'var(--text-muted)' }}>{getFormattedDate()}</span>
                <FlipClock size="hero" />
                {nextPrayer && countdown && (
                  <span className="flex items-center gap-1.5 text-small px-2.5 py-0.5 rounded-full glass-sm" style={{ color: 'var(--text-muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', animation: 'pulseDot 2s ease-in-out infinite' }} />
                    {nextPrayer.name} in <strong style={{ color: 'var(--accent)' }}>{countdown}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 stack-on-mobile shrink-0">
              <div className="weather-card flex items-center gap-2.5">
                {weatherLoading ? (
                  <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)] animate-pulse" />
                ) : weather ? (
                  <>
                    {(() => { const Icon = WEATHER_ICONS[weather.icon] || Cloud; return <Icon size={20} className="weather-icon-animated" style={{ color: 'var(--accent)' }} /> })()}
                    <div className="flex flex-col leading-tight">
                      <span className="temp-value !text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{weather.temp}°</span>
                      <span className="text-micro" style={{ color: 'var(--text-muted)' }}>{weather.condition}</span>
                    </div>
                  </>
                ) : null}
              </div>
              <button onClick={() => getBriefing('dashboard')}
                className="btn-ripple flex items-center gap-1.5 px-3 py-1.5 rounded-full text-small font-medium hover-scale"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--accent)' }}
              ><Sparkles size={13} /> Briefing</button>
              <button onClick={toggleEditMode}
                className="btn-ripple flex items-center gap-1.5 px-3 py-1.5 rounded-full text-small font-medium hover-scale"
                style={{ background: editMode ? 'var(--accent)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: editMode ? '#fff' : 'var(--accent)' }}
              >{editMode ? 'Done' : 'Edit'}</button>
              <button onClick={() => setClockFullscreen(true)}
                className="clock-toggle-btn flex items-center gap-1 px-2.5 py-1.5 rounded-full text-small font-medium"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                title="Full-screen clock"
              ><Maximize2 size={12} /></button>
              <span className="flex items-center gap-1.5 text-small glass-sm rounded-full px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>
                <Flame size={12} style={{ color: 'var(--warning)' }} />
                {daysBuilding} days
              </span>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {clockFullscreen && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(40px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="clock-fullscreen-overlay"
              onClick={() => setClockFullscreen(false)}
            >
              <div className="flex flex-col items-center gap-8">
                <FlipClock size="fullscreen" />
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-body" style={{ color: 'var(--text-muted)' }}>{getFormattedDate()}</motion.p>
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  onClick={() => setClockFullscreen(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-small font-medium hover-scale"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                ><Minimize2 size={13} /> Dismiss</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleWidgets} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {visibleWidgets.map((id) => {
                const Widget = WIDGET_COMPONENTS[id]
                return Widget ? (
                  <SortableWidget key={id} id={id}>
                    <Suspense fallback={<div className="widget-glass p-5"><div className="h-20 rounded-lg bg-[var(--bg-surface)] animate-pulse" /></div>}>
                      <Widget {...widgetProps} onOpen={() => setReviewOpen(true)} />
                    </Suspense>
                  </SortableWidget>
                ) : null
              })}
            </div>
          </SortableContext>
        </DndContext>

        {editMode && (
          <div className="widget-glass p-4 border-2 border-dashed" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-small font-medium" style={{ color: 'var(--text-muted)' }}>Hidden Widgets ({hiddenWidgets.length})</p>
              <button onClick={resetDefault}
                className="btn-ripple flex items-center gap-1 px-2.5 py-1 text-micro rounded-lg hover-scale"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
              ><RotateCcw size={11} /> Reset</button>
            </div>
            {hiddenWidgets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {hiddenWidgets.map((id) => {
                  const cfg = WIDGET_CONFIG[id]
                  return (
                    <button key={id} onClick={() => toggleHidden(id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-small hover-scale btn-ripple"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                    ><Eye size={13} /> {cfg?.label || id}</button>
                  )
                })}
              </div>
            ) : (
              <p className="text-micro italic" style={{ color: 'var(--text-muted)' }}>All widgets are visible.</p>
            )}
          </div>
        )}

        <PatternIntelligence />

        <div className="text-center text-micro py-4" style={{ color: 'var(--text-tertiary)' }}>
          {daysBuilding} days building Life OS · {new Date().getFullYear()}
        </div>
      </div>
      {reviewOpen && <DailyReviewModal onClose={() => setReviewOpen(false)} />}
    </div>
  )
}
