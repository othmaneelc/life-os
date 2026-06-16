import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { startOfWeek, endOfWeek, isSameMonth, differenceInDays, parseISO } from 'date-fns'
import { Plus, Calendar, CheckSquare2, MessageSquareText, BarChart3, LayoutDashboard, ChevronLeft } from 'lucide-react'
import DataError from '../components/DataError'
const CDZOverview = lazy(() => import('./CDZ/CDZOverview'))
const CDZCalendar = lazy(() => import('./CDZ/CDZCalendar'))
const CDZProduction = lazy(() => import('./CDZ/CDZProduction'))
const CDZComms = lazy(() => import('./CDZ/CDZComms'))
const CDZResults = lazy(() => import('./CDZ/CDZResults'))

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'production', label: 'Production', icon: CheckSquare2 },
  { id: 'comms', label: 'Comms', icon: MessageSquareText },
  { id: 'results', label: 'Results', icon: BarChart3 },
]

export default function CDZ() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [newPostModalOpen, setNewPostModalOpen] = useState(false)

  const { data: posts = [], isLoading: postsLoading, isError: postsError, refetch: refetchPosts } = useQuery({
    queryKey: ['cdz-posts'],
    queryFn: () => fetch('/api/cdz/posts').then(r => { if (!r.ok) throw new Error('Failed'); return r.json() }),
    staleTime: 30000,
  })

  const { data: stats = {}, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['cdz-stats'],
    queryFn: () => fetch('/api/cdz/stats').then(r => { if (!r.ok) throw new Error('Failed'); return r.json() }),
    staleTime: 30000,
  })

  const { data: comms = [], isLoading: commsLoading, isError: commsError, refetch: refetchComms } = useQuery({
    queryKey: ['cdz-comms'],
    queryFn: () => fetch('/api/cdz/comms').then(r => { if (!r.ok) throw new Error('Failed'); return r.json() }),
    staleTime: 30000,
  })

  const { data: results = [], isLoading: resultsLoading, isError: resultsError, refetch: refetchResults } = useQuery({
    queryKey: ['cdz-results'],
    queryFn: () => fetch('/api/cdz/results').then(r => { if (!r.ok) throw new Error('Failed'); return r.json() }),
    staleTime: 30000,
  })

  const isLoading = postsLoading || statsLoading || commsLoading || resultsLoading
  const isError = postsError || statsError || commsError || resultsError
  const refetchAll = () => { refetchPosts(); refetchStats(); refetchComms(); refetchResults() }

  const today = new Date()

  const overduePosts = useMemo(() => {
    return posts.filter(p => {
      if (!p.scheduled_date) return false
      const d = parseISO(p.scheduled_date)
      return differenceInDays(today, d) > 0 && p.status !== 'Posted' && p.status !== 'Archived'
    })
  }, [posts])

  const pendingApprovals = useMemo(() => {
    return posts.filter(p => p.status === 'Ready for Review')
  }, [posts])

  const thisMonthPosts = useMemo(() => {
    return posts.filter(p => {
      if (!p.scheduled_date) return false
      return isSameMonth(parseISO(p.scheduled_date), today)
    })
  }, [posts])

  const thisWeekPosts = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    return posts.filter(p => {
      if (!p.scheduled_date) return false
      const d = parseISO(p.scheduled_date)
      return d >= weekStart && d <= weekEnd
    })
  }, [posts])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key) - 1
        setActiveTab(TABS[idx].id)
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setActiveTab('calendar')
        setNewPostModalOpen(true)
      }
      if (e.key === 'Escape') {
        setNewPostModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleTabChange = (tabId) => setActiveTab(tabId)
  const handleNewPost = () => { setActiveTab('calendar'); setNewPostModalOpen(true) }

  const sharedProps = {
    posts,
    stats,
    comms,
    results,
    refetchPosts,
    refetchStats,
    refetchComms,
    refetchResults,
    activeTab,
    setActiveTab,
    newPostModalOpen,
    setNewPostModalOpen,
    overduePosts,
    pendingApprovals,
    thisMonthPosts,
    thisWeekPosts,
    onTabChange: handleTabChange,
    onNewPost: handleNewPost,
  }

  return (
    <div className="min-h-screen" style={{ background: '#0D0D0D' }}>
      <div className="max-w-7xl mx-auto px-4 pb-24 md:pb-8">
        <div className="sticky top-0 z-30" style={{ background: '#0D0D0D' }}>
          <div className="flex items-center justify-between py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/agency')}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/60 hover:text-white"
                aria-label="Back to agency"
              >
                <ChevronLeft size={20} />
              </button>
              <h1 className="text-xl font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                CDZ Agency
              </h1>
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#C9A84C' }}
              />
            </div>
          </div>

          <div className="flex gap-1 py-3 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                  aria-label={tab.label}
                >
                  <Icon size={16} />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{ background: '#00C2FF' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl" />)}
          </div>
        )}
        {isError && <DataError message="Failed to load CDZ data" onRetry={refetchAll} />}
        {!isLoading && !isError && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
          >
            <Suspense fallback={<div className="card p-8 text-center text-apple-muted"><div className="h-8 w-8 mx-auto rounded-full bg-apple-surface animate-pulse mb-3" /><div className="h-4 w-32 mx-auto bg-apple-surface rounded animate-pulse" /></div>}>
              {activeTab === 'overview' && <CDZOverview {...sharedProps} />}
              {activeTab === 'calendar' && <CDZCalendar {...sharedProps} />}
              {activeTab === 'production' && <CDZProduction {...sharedProps} />}
              {activeTab === 'comms' && <CDZComms {...sharedProps} />}
              {activeTab === 'results' && <CDZResults {...sharedProps} />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
        )}
      </div>

      <button
        onClick={() => { setActiveTab('calendar'); setNewPostModalOpen(true) }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform md:hidden"
        style={{ background: '#00C2FF' }}
        aria-label="New post"
      >
        <Plus size={24} className="text-black" />
      </button>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/5"
        style={{ background: '#0D0D0D' }}
      >
        <div className="flex items-center justify-around py-2">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-1 px-3 py-1"
                aria-label={tab.label}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-white/40'} />
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? 'text-white' : 'text-white/40'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
