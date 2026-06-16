import { useState, useEffect, lazy, Suspense, useRef, useMemo } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'

import { LogoIcon } from './components/Logo'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'

import FloatingAIButton from './components/FloatingAIButton'
import LevelUpNotification from './components/LevelUpNotification'
import QuickCaptureFab from './components/QuickCaptureFab'
import FloatingMic from './components/FloatingMic'
import { useAIStore } from './store/aiStore'
import { useVoiceStore } from './store/voiceStore'

import { useGamificationStats } from './store/gamificationStore'
import { DashboardSkeleton, ListSkeleton } from './components/Skeleton'
import ErrorBoundary from './components/ErrorBoundary'
import { useThemeStore } from './store/themeStore'
import { useAuthStore, useLoadUser } from './store/authStore'
import { useAppUIStore } from './store/appUIStore'
import { useSettings } from './hooks/useSettings'
import { pageTransition } from './utils/animations'

const CommandPalette = lazy(() => import('./components/CommandPalette'))
const AIChatModal = lazy(() => import('./components/AIChatModal'))
const UniversalSearch = lazy(() => import('./components/UniversalSearch'))
const GamificationPanel = lazy(() => import('./components/GamificationPanel'))
const FocusMode = lazy(() => import('./components/FocusMode'))
const DailyReviewModal = lazy(() => import('./components/DailyReviewModal'))
const QuickAddModal = lazy(() => import('./components/QuickAddModal'))
const KbdCheatsheetModal = lazy(() => import('./components/KbdCheatsheetModal'))

const Dashboard = lazy(() => import('./views/Dashboard'))
const Schedule = lazy(() => import('./views/schedule'))
const Tasks = lazy(() => import('./views/Tasks'))
const Journal = lazy(() => import('./views/Journal'))
const PrayerTracker = lazy(() => import('./views/PrayerTracker'))
const Habits = lazy(() => import('./views/Habits'))
const Agency = lazy(() => import('./views/Agency'))
const CDZ = lazy(() => import('./views/CDZ'))
const Agents = lazy(() => import('./views/Agents'))
const Reports = lazy(() => import('./views/Reports'))
const KnowledgeBase = lazy(() => import('./views/KnowledgeBase'))
const Settings = lazy(() => import('./views/Settings'))
const Finance = lazy(() => import('./views/Finance'))
const Goals = lazy(() => import('./views/Goals'))
const Reading = lazy(() => import('./views/Reading'))
const BlackMirror = lazy(() => import('./views/BlackMirror'))
const Vault = lazy(() => import('./views/Vault'))
const IdentityStack = lazy(() => import('./views/IdentityStack'))
const Sleep = lazy(() => import('./views/Sleep'))
const Login = lazy(() => import('./views/Login'))
const Chores = lazy(() => import('./views/Chores'))
const Workouts = lazy(() => import('./views/Workouts'))
const Trips = lazy(() => import('./views/Trips'))
const Relationships = lazy(() => import('./views/Relationships'))

const viewLoaders = {
  '/dashboard': <DashboardSkeleton />,
  '/schedule': <ListSkeleton rows={8} />,
  '/tasks': <ListSkeleton rows={6} />,
  '/journal': <div className="p-8 max-w-5xl mx-auto"><div className="grid grid-cols-[280px_1fr] gap-6"><ListSkeleton rows={8} /><div className="card h-96"><div className="space-y-4 p-4"><div className="w-1/2 h-6 bg-apple-surface rounded animate-pulse" /><div className="w-full h-32 bg-apple-surface rounded animate-pulse" /><div className="w-full h-24 bg-apple-surface rounded animate-pulse" /></div></div></div></div>,
  '/prayers': <ListSkeleton rows={6} />,
  '/habits': <ListSkeleton rows={11} />,
  '/agency': <DashboardSkeleton />,
  '/client/cdz': <DashboardSkeleton />,
  '/agents': <ListSkeleton rows={6} />,
  '/reports': <DashboardSkeleton />,
  '/knowledge': <ListSkeleton rows={6} />,
  '/settings': <div className="p-8 max-w-3xl mx-auto space-y-8">{[1,2,3,4].map(i => <div key={i} className="card h-32"><div className="w-1/3 h-4 bg-apple-surface rounded animate-pulse mb-4" /><div className="w-2/3 h-8 bg-apple-surface rounded animate-pulse" /></div>)}</div>,
  '/goals': <DashboardSkeleton />,
  '/reading': <ListSkeleton rows={6} />,
  '/black-mirror': <DashboardSkeleton />,
  '/vault': <DashboardSkeleton />,
  '/identities': <DashboardSkeleton />,
  '/sleep': <ListSkeleton rows={6} />,
  '/chores': <ListSkeleton rows={6} />,
  '/workouts': <ListSkeleton rows={6} />,
  '/travel': <ListSkeleton rows={6} />,
  '/relationships': <ListSkeleton rows={6} />,
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
  const { data: settings } = useSettings()
  const notifyEnabled = useMemo(() => settings ? settings.notify_prayer !== '0' : false, [settings])
  const adhanEnabled = useMemo(() => settings ? settings.notify_adhan !== '0' : false, [settings])
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
    if (!notifyEnabled) return
    let notified = {}
    const adhanAudio = new Audio('https://www.islamcan.com/audio/adhan/azan1.mp3')
    adhanAudio.preload = 'none'
    async function checkPrayers() {
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
            if (diff >= 0 && diff <= 2 && !notified[p]) {
              notified[p] = true
              if (notifyEnabled && Notification.permission === 'granted') {
                try { const n = new Notification(`🕌 ${labels[p]} time`, { body: `${labels[p]} prayer is now.` }); setTimeout(() => n.close(), 15000) } catch (e) {}
              }
              if (adhanEnabled) {
                try { adhanAudio.play().catch(() => {}) } catch (e) {}
              }
            }
          }
        } catch (e) {}
      }
      checkPrayers()
      const interval = setInterval(checkPrayers, 30000)
      return () => clearInterval(interval)
  }, [notifyEnabled, adhanEnabled])
}

function useRoutineNotifications() {
  const { data: settings } = useSettings()
  const enabled = useMemo(() => {
    if (!settings) return false
    return settings.notify_review !== '0' || settings.notify_weekly !== '0'
  }, [settings])
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    if (!enabled) return
    let notified = {}
    function checkReminders() {
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
  }, [enabled])
}

function usePushSubscriptions() {
  const { data: settings } = useSettings()
  const anyPushEnabled = useMemo(() => {
    if (!settings) return false
    return settings.push_prayer !== '0' || settings.push_summary !== '0' || settings.push_review !== '0' || settings.push_weekly !== '0'
  }, [settings])
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!anyPushEnabled) return
    let cancelled = false
    async function subscribe() {
      try {
        if (Notification.permission === 'default') await Notification.requestPermission()
        if (Notification.permission !== 'granted') return

        const registration = await navigator.serviceWorker.ready
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          const res2 = await fetch('/api/push/vapid-public-key')
          const { publicKey } = await res2.json()
          if (!publicKey || cancelled) return
          const key = Uint8Array.from(atob(publicKey), c => c.charCodeAt(0))
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key,
          })
        }

        if (!cancelled) {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription.toJSON()),
          })
        }
      } catch {}
    }
    subscribe()
    return () => { cancelled = true }
  }, [])
}

function useServerHealth() {
  const [serverOnline, setServerOnline] = useState(true)
  const [browserOffline, setBrowserOffline] = useState(!navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    function onOnline() { setBrowserOffline(false) }
    function onOffline() { setBrowserOffline(true) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const r = await fetch('/api/health')
        if (mounted) setServerOnline(r.ok)
      } catch {
        if (mounted) setServerOnline(false)
      }
      if (mounted && window.__offlineQueue) {
        try { setQueueCount(await window.__offlineQueue.queueLength()) } catch {}
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  return { serverOnline, browserOffline, queueCount }
}

export default function App() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [direction, setDirection] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  const focusOpen = useAppUIStore(s => s.focusOpen)
  const gamificationOpen = useAppUIStore(s => s.gamificationOpen)
  const quickAddOpen = useAppUIStore(s => s.quickAddOpen)
  const reviewOpen = useAppUIStore(s => s.dailyReviewOpen)
  const searchOpen = useAppUIStore(s => s.searchOpen)
  const toggleFocus = useAppUIStore(s => s.toggleFocus)
  const setFocusOpen = useAppUIStore(s => s.setFocusOpen)
  const toggleGamification = useAppUIStore(s => s.toggleGamification)
  const setGamificationOpen = useAppUIStore(s => s.setGamificationOpen)
  const openQuickAdd = useAppUIStore(s => s.openQuickAdd)
  const setQuickAddOpen = useAppUIStore(s => s.setQuickAddOpen)
  const openDailyReview = useAppUIStore(s => s.openDailyReview)
  const setDailyReviewOpen = useAppUIStore(s => s.setDailyReviewOpen)
  const setSearchOpen = useAppUIStore(s => s.setSearchOpen)

  const theme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)
  const { serverOnline, browserOffline, queueCount } = useServerHealth()

  const token = useAuthStore(s => s.token)
  const authLoading = useAuthStore(s => s.loading)
  const pendingCount = useVoiceStore(s => s.pendingActions.length)
  useGamificationStats()
  const { isLoading: userLoading } = useLoadUser()

  useNotifications()
  usePrayerNotifications()
  useRoutineNotifications()
  usePushSubscriptions()

  useEffect(() => {
    if (pendingCount > 0 && !commandPaletteOpen) {
      setCommandPaletteOpen(true)
    }
  }, [pendingCount, commandPaletteOpen])

  const aiIsOpen = useAIStore(s => s.isOpen)
  const setAiOpen = useAIStore(s => s.setOpen)

  const shortcutKeys = useRef({
    '1': '/dashboard', '2': '/schedule', '3': '/tasks', '4': '/journal',
    '5': '/prayers', '6': '/habits', '7': '/agency', '8': '/reports',
    '9': '/knowledge', '0': '/settings', 'k': '__command__', 'j': '/journal', ',': '/settings'
  })

  const { data: settingsData } = useSettings()
  useEffect(() => {
    if (!settingsData) return
    const map = { '1': '/dashboard', '2': '/schedule', '3': '/tasks', '4': '/journal',
      '5': '/prayers', '6': '/habits', '7': '/agency', '8': '/reports',
      '9': '/knowledge', '0': '/settings', 'k': '__command__', 'j': '/journal', ',': '/settings' }
    for (const [key, val] of Object.entries(settingsData)) {
      if (key.startsWith('shortcut_')) {
        const match = val.match(/(\d|\w)$/)
        if (match) map[match[1]] = val.replace(/^.*\d\s/, '').trim() || map[match[1]]
      }
    }
    shortcutKeys.current = map
  }, [settingsData])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === '?' && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCheatsheetOpen(true)
        return
      }
      if (!(e.metaKey || e.ctrlKey)) return

      if (e.key === 'n') { e.preventDefault(); openQuickAdd(); return }
      if (e.key === 'i') { e.preventDefault(); useAIStore.getState().setOpen(!useAIStore.getState().isOpen); return }
      if (e.key === 'b') { e.preventDefault(); setSidebarCollapsed(s => !s); return }
      if (e.key === 'd') { e.preventDefault(); setTheme(t => (t === 'dark' ? 'light' : 'dark')); return }

      if (e.shiftKey) {
        if (e.key === 'F') { e.preventDefault(); toggleFocus(); return }
        if (e.key === 'G') { e.preventDefault(); toggleGamification(); return }
        if (e.key === 'R') { e.preventDefault(); openDailyReview(); return }
        return
      }

      const target = shortcutKeys.current[e.key]
      if (target === '__command__') { e.preventDefault(); setSearchOpen(true); return }
      if (target) { e.preventDefault(); navigate(target) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, setTheme])

  if (authLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center noise" style={{ background: 'var(--gradient-surface)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-5"
        >
          <LogoIcon size={48} />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm font-medium gradient-text"
          >
            Loading your Life OS...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  if (!token) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-surface)' }}>
          <LogoIcon size={32} />
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

return (
    <div className="flex h-screen overflow-hidden noise bg-mesh-animated">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium focus:bg-apple-card focus:text-apple-text focus:shadow-lg focus:outline-2 focus:outline-[var(--accent)]">
        Skip to content
      </a>
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="aria-live-announcer" />
      <ErrorBoundary name="Sidebar"><Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(s => !s)} /></ErrorBoundary>
      <div className="flex-1 flex flex-col overflow-hidden">
        {(browserOffline || !serverOnline || queueCount > 0) && (
          <div
            className="flex-shrink-0 px-6 py-1.5 text-small text-center font-medium flex items-center justify-center gap-2"
            style={{
              background: browserOffline ? 'var(--danger-glow, rgba(239,68,68,0.1))' : queueCount > 0 ? 'var(--warning-glow, rgba(234,179,8,0.1))' : 'rgba(234,179,8,0.1)',
              borderBottom: `1px solid ${browserOffline ? 'rgba(239,68,68,0.2)' : queueCount > 0 ? 'rgba(234,179,8,0.2)' : 'rgba(234,179,8,0.2)'}`,
              color: browserOffline ? 'var(--danger, #ef4444)' : 'var(--warning, #eab308)',
            }}
          >
            {browserOffline ? (
              <>You are offline — showing cached data{queueCount > 0 && ` (${queueCount} pending)`}</>
            ) : queueCount > 0 ? (
              <>{queueCount} change(s) pending sync</>
            ) : (
              <>Server offline — reconnecting...</>
            )}
          </div>
        )}
        <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0 bg-gradient-mesh">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={location.pathname}
            {...pageTransition}
          >
            <Suspense fallback={<LoadingView path={location.pathname} />}>
              <Routes location={location}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary>} />
                <Route path="/schedule" element={<ErrorBoundary name="Schedule"><Schedule /></ErrorBoundary>} />
                <Route path="/tasks" element={<ErrorBoundary name="Tasks"><Tasks /></ErrorBoundary>} />
                <Route path="/journal" element={<ErrorBoundary name="Journal"><Journal /></ErrorBoundary>} />
                <Route path="/prayers" element={<ErrorBoundary name="Prayers"><PrayerTracker /></ErrorBoundary>} />
                <Route path="/habits" element={<ErrorBoundary name="Habits"><Habits /></ErrorBoundary>} />
                <Route path="/agency" element={<ErrorBoundary name="Agency"><Agency /></ErrorBoundary>} />
                <Route path="/client/cdz" element={<ErrorBoundary name="CDZ"><CDZ /></ErrorBoundary>} />
                <Route path="/agents" element={<ErrorBoundary name="Agents"><Agents /></ErrorBoundary>} />
                <Route path="/reports" element={<ErrorBoundary name="Reports"><Reports /></ErrorBoundary>} />
                <Route path="/knowledge" element={<ErrorBoundary name="Knowledge"><KnowledgeBase /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary name="Settings"><Settings /></ErrorBoundary>} />
                <Route path="/finance" element={<ErrorBoundary name="Finance"><Finance /></ErrorBoundary>} />
                <Route path="/goals" element={<ErrorBoundary name="Goals"><Goals /></ErrorBoundary>} />
                <Route path="/reading" element={<ErrorBoundary name="Reading"><Reading /></ErrorBoundary>} />
                <Route path="/chores" element={<ErrorBoundary name="Chores"><Chores /></ErrorBoundary>} />
                <Route path="/black-mirror" element={<ErrorBoundary name="BlackMirror"><BlackMirror /></ErrorBoundary>} />
                <Route path="/vault" element={<ErrorBoundary name="Vault"><Vault /></ErrorBoundary>} />
                <Route path="/identities" element={<ErrorBoundary name="IdentityStack"><IdentityStack /></ErrorBoundary>} />
                <Route path="/sleep" element={<ErrorBoundary name="Sleep"><Sleep /></ErrorBoundary>} />
                <Route path="/workouts" element={<ErrorBoundary name="Workouts"><Workouts /></ErrorBoundary>} />
                <Route path="/travel" element={<ErrorBoundary name="Trips"><Trips /></ErrorBoundary>} />
                <Route path="/relationships" element={<ErrorBoundary name="Relationships"><Relationships /></ErrorBoundary>} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
       </main>
        {commandPaletteOpen && <Suspense fallback={null}><ErrorBoundary name="CommandPalette"><CommandPalette
            onClose={() => setCommandPaletteOpen(false)}
            onOpenReview={() => { setCommandPaletteOpen(false); openDailyReview() }}
            onOpenAddTask={() => { setCommandPaletteOpen(false); openQuickAdd() }}
            onOpenAddJournal={() => { setCommandPaletteOpen(false); navigate('/journal') }}
            onOpenAddHabit={() => { setCommandPaletteOpen(false); navigate('/habits') }}
            onOpenAIChat={() => { setCommandPaletteOpen(false); setAiOpen(true) }}
          /></ErrorBoundary></Suspense>}
        <Suspense fallback={null}><ErrorBoundary name="DailyReviewModal"><DailyReviewModal open={reviewOpen} onClose={() => setDailyReviewOpen(false)} /></ErrorBoundary></Suspense>
       <Suspense fallback={null}><ErrorBoundary name="QuickAddModal"><QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} /></ErrorBoundary></Suspense>
        {aiIsOpen && <Suspense fallback={null}><ErrorBoundary name="AIChatModal"><AIChatModal open={aiIsOpen} onClose={() => setAiOpen(false)} /></ErrorBoundary></Suspense>}
        <FloatingAIButton />
        <FloatingMic />
        <MobileNav />
       <QuickCaptureFab />
       <Suspense fallback={null}><ErrorBoundary name="KbdCheatsheetModal"><KbdCheatsheetModal open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} /></ErrorBoundary></Suspense>
        {focusOpen && <Suspense fallback={null}><ErrorBoundary name="FocusMode"><FocusMode onClose={() => setFocusOpen(false)} /></ErrorBoundary></Suspense>}
       <LevelUpNotification />
        {gamificationOpen && <Suspense fallback={null}><ErrorBoundary name="GamificationPanel"><GamificationPanel isOpen={gamificationOpen} onClose={() => setGamificationOpen(false)} /></ErrorBoundary></Suspense>}
       {searchOpen && <Suspense fallback={null}><ErrorBoundary name="UniversalSearch"><UniversalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} /></ErrorBoundary></Suspense>}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-primary)',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: 'var(--shadow-lg), 0 8px 32px rgba(0,0,0,0.12)',
              padding: '12px 16px',
              maxWidth: '380px',
            },
            success: {
              iconTheme: { primary: 'var(--success)', secondary: 'white' },
              style: { borderLeft: '3px solid var(--success)' },
            },
            error: {
              iconTheme: { primary: 'var(--danger)', secondary: 'white' },
              style: { borderLeft: '3px solid var(--danger)', duration: 5000 },
            },
          }}
        />
      </div>
      </div>
  )
}
