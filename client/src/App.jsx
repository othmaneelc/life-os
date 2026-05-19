import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import CommandPalette from './components/CommandPalette'
import DailyReviewModal from './components/DailyReviewModal'
import QuickAddModal from './components/QuickAddModal'
import PomodoroTimer from './components/PomodoroTimer'
import AIChatModal from './components/AIChatModal'
import FloatingAIButton from './components/FloatingAIButton'
import { useAIStore } from './store/aiStore'
import { DashboardSkeleton, ListSkeleton } from './components/Skeleton'
import ErrorBoundary from './components/ErrorBoundary'
import { useTaskStore } from './store/taskStore'
import { useThemeStore } from './store/themeStore'
import { pageTransition } from './utils/animations'

const Dashboard = lazy(() => import('./views/Dashboard'))
const Schedule = lazy(() => import('./views/Schedule'))
const Tasks = lazy(() => import('./views/Tasks'))
const Journal = lazy(() => import('./views/Journal'))
const PrayerTracker = lazy(() => import('./views/PrayerTracker'))
const Habits = lazy(() => import('./views/Habits'))
const Agency = lazy(() => import('./views/Agency'))
const Reports = lazy(() => import('./views/Reports'))
const KnowledgeBase = lazy(() => import('./views/KnowledgeBase'))
const Settings = lazy(() => import('./views/Settings'))
const Finance = lazy(() => import('./views/Finance'))
const Goals = lazy(() => import('./views/Goals'))
const Reading = lazy(() => import('./views/Reading'))

const viewLoaders = {
  '/dashboard': <DashboardSkeleton />,
  '/schedule': <ListSkeleton rows={8} />,
  '/tasks': <ListSkeleton rows={6} />,
  '/journal': <div className="p-8 max-w-5xl mx-auto"><div className="grid grid-cols-[280px_1fr] gap-6"><ListSkeleton rows={8} /><div className="card h-96"><div className="space-y-4 p-4"><div className="w-1/2 h-6 bg-apple-surface rounded animate-pulse" /><div className="w-full h-32 bg-apple-surface rounded animate-pulse" /><div className="w-full h-24 bg-apple-surface rounded animate-pulse" /></div></div></div></div>,
  '/prayers': <ListSkeleton rows={6} />,
  '/habits': <ListSkeleton rows={11} />,
  '/agency': <DashboardSkeleton />,
  '/reports': <DashboardSkeleton />,
  '/knowledge': <ListSkeleton rows={6} />,
  '/settings': <div className="p-8 max-w-3xl mx-auto space-y-8">{[1,2,3,4].map(i => <div key={i} className="card h-32"><div className="w-1/3 h-4 bg-apple-surface rounded animate-pulse mb-4" /><div className="w-2/3 h-8 bg-apple-surface rounded animate-pulse" /></div>)}</div>,
  '/goals': <DashboardSkeleton />,
  '/reading': <ListSkeleton rows={6} />,
}

function LoadingView({ path }) {
  return <div className="p-8">{viewLoaders[path] || <DashboardSkeleton />}</div>
}

function useNotifications() {
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])
}

function usePrayerNotifications() {
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    let notified = {}
    let settings = {}
    async function checkSettings() {
      try { const r = await fetch('/api/settings'); settings = await r.json() } catch {}
    }
    checkSettings()
    async function checkPrayers() {
      if (settings.notify_prayer === '0') return
      const today = new Date().toISOString().split('T')[0]
      try {
        const res = await fetch(`/api/prayers/times?date=${today}`)
        const times = await res.json()
        if (!times) return
        const now = new Date()
        const currentMin = now.getHours() * 60 + now.getMinutes()
        const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        const labels = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }
        for (const p of prayers) {
          const t = times[p]; if (!t) continue
          const [h, m] = t.split(':').map(Number)
          const diff = (h * 60 + m) - currentMin
          if (diff > 0 && diff <= 10 && !notified[p]) {
            notified[p] = true
            try { const n = new Notification(`🕌 ${labels[p]} time`, { body: `${labels[p]} prayer is at ${t}.` }); setTimeout(() => n.close(), 10000) } catch (e) {}
          }
        }
      } catch (e) {}
    }
    checkPrayers()
    const interval = setInterval(checkPrayers, 60000)
    return () => clearInterval(interval)
  }, [])
}

function useRoutineNotifications() {
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    let notified = {}
    let settings = {}
    fetch('/api/settings').then(r => r.json()).then(d => settings = d).catch(() => {})
    function checkReminders() {
      if (settings.notify_review === '0' && settings.notify_weekly === '0') return
      const now = new Date()
      const currentTotal = now.getHours() * 60 + now.getMinutes()
      const reminders = [
        { time: 21*60+30, id: 'review', title: 'Daily Review', body: 'Time for your Muhasaba — daily review and journaling.' },
        { time: 22*60+45, id: 'sleep', title: 'Sleep Reminder', body: "It's almost 11PM. Finish up and sleep." },
      ]
      const day = now.getDay()
      if (day >= 1 && day <= 5) reminders.push({ time: 12*60, id: 'calls', title: 'HVAC Calls', body: 'Time for your HVAC cold outreach calls.' })
      for (const r of reminders) {
        const diff = currentTotal - r.time
        if (diff >= 0 && diff <= 5 && !notified[r.id]) {
          notified[r.id] = true
          try { const n = new Notification(r.title, { body: r.body }); setTimeout(() => n.close(), 10000) } catch (e) {}
        }
      }
    }
    checkReminders()
    const interval = setInterval(checkReminders, 60000)
    return () => clearInterval(interval)
  }, [])
}

export default function App() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [direction, setDirection] = useState(0)
  const fetchTasks = useTaskStore(s => s.fetchTasks)
  const navigate = useNavigate()
  const location = useLocation()

  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)

  useNotifications()
  usePrayerNotifications()
  useRoutineNotifications()

  const aiIsOpen = useAIStore(s => s.isOpen)
  const setAiOpen = useAIStore(s => s.setOpen)

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const shortcuts = { '1': '/dashboard', '2': '/schedule', '3': '/tasks', '4': '/journal', '5': '/prayers', '6': '/habits', '7': '/agency', '8': '/reports', '9': '/knowledge', '0': '/finance' }

  useEffect(() => {
    function handleNav(e) {
      if (!(e.metaKey || e.ctrlKey)) return
      const path = shortcuts[e.key]
      if (path) { e.preventDefault(); navigate(path) }
      if (e.key === 'j') { e.preventDefault(); navigate('/journal') }
      if (e.key === ',') { e.preventDefault(); navigate('/settings') }
    }
    window.addEventListener('keydown', handleNav)
    return () => window.removeEventListener('keydown', handleNav)
  }, [navigate])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(s => !s)} />
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--gradient-surface)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            {...pageTransition}
          >
            <Suspense fallback={<LoadingView path={location.pathname} />}>
              <ErrorBoundary>
                <Routes location={location}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/prayers" element={<PrayerTracker />} />
                  <Route path="/habits" element={<Habits />} />
                  <Route path="/agency" element={<Agency />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/knowledge" element={<KnowledgeBase />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/reading" element={<Reading />} />
                </Routes>
              </ErrorBoundary>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      {commandPaletteOpen && <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onOpenReview={() => { setCommandPaletteOpen(false); setReviewOpen(true) }}
          onOpenAddTask={() => { setCommandPaletteOpen(false); setQuickAddOpen(true) }}
          onOpenAIChat={() => { setCommandPaletteOpen(false); setAiOpen(true) }}
        />}
      <DailyReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} />
      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <AIChatModal open={aiIsOpen} onClose={() => setAiOpen(false)} />
      <FloatingAIButton />
    </div>
  )
}
