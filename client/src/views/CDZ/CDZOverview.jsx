import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, AlertTriangle, Plus, MessageSquare, Phone,
  Sparkles, TrendingUp
} from 'lucide-react'
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'

const COLORS = {
  cyan: '#00C2FF',
  gold: '#C9A84C',
  card: '#0D0D0D',
  border: '#1A1A1A',
  surface: '#111111',
  muted: '#666',
}

const STATUS_COLORS = {
  Idea: '#666',
  'In Production': '#00C2FF',
  'Ready for Review': '#FFB800',
  Approved: '#00FF87',
  Posted: '#C9A84C',
}

const PIPELINE_STAGES = ['Idea', 'In Production', 'Ready for Review', 'Approved', 'Posted']

export default function CDZOverview({ posts = [], stats = {}, onTabChange, onNewPost }) {
  const thisMonthPublished = useMemo(
    () => posts.filter((p) => p.status === 'Posted').length,
    [posts]
  )
  const expectedPosts = 8

  const pipelineCounts = useMemo(() => {
    const counts = {}
    PIPELINE_STAGES.forEach((s) => {
      counts[s] = posts.filter((p) => p.status === s).length
    })
    return counts
  }, [posts])

  const pipelinePosts = useMemo(() => {
    const map = {}
    PIPELINE_STAGES.forEach((s) => {
      map[s] = posts
        .filter((p) => p.status === s)
        .slice(0, 2)
    })
    return map
  }, [posts])

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  const weekPosts = useMemo(
    () =>
      posts.filter((p) => {
        if (!p.scheduled_date) return false
        const d = parseISO(p.scheduled_date)
        return isWithinInterval(d, { start: weekStart, end: weekEnd })
      }),
    [posts, weekStart, weekEnd]
  )

  const deadlineAlerts = useMemo(
    () =>
      posts.filter((p) => {
        if (!p.scheduled_date) return false
        if (p.status === 'Approved' || p.status === 'Posted') return false
        const d = parseISO(p.scheduled_date)
        const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
        return diff >= 0 && diff <= 3
      }),
    [posts, today]
  )

  return (
    <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top client card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 flex flex-wrap items-center gap-4"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ background: COLORS.gold, color: '#000' }}
        >
          CDZ
        </div>
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-xl font-semibold text-white">Centre Dentaire Zahir</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.gold }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#00FF87' }} />
              ACTIVE CLIENT
            </span>
            <span className="text-sm" style={{ color: COLORS.muted }}>
              Mar 3 – Jun 3, 2026
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://wa.me/212772153477"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contact via WhatsApp"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <MessageSquare size={18} style={{ color: '#25D366' }} />
          </a>
          <a
            href="tel:+212772153477"
            aria-label="Call clinic"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <Phone size={18} style={{ color: COLORS.cyan }} />
          </a>
        </div>
      </motion.div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Posts Published',
            value: `${thisMonthPublished} / ${expectedPosts}`,
          },
          {
            label: 'Posts in Pipeline',
            value: posts.filter((p) =>
              ['Idea', 'In Production', 'Ready for Review'].includes(p.status)
            ).length,
          },
          { label: 'Pending Approvals', value: stats.pendingApprovals ?? 0 },
          { label: 'Overdue Posts', value: stats.overdue ?? 0 },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-5"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div className="font-['Bebas_Neue'] text-4xl tracking-wide" style={{ color: COLORS.cyan }}>
              {kpi.value}
            </div>
            <div className="text-sm mt-1" style={{ color: COLORS.muted }}>
              {kpi.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pipeline board */}
      <div>
        <h3 className="text-white text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp size={18} style={{ color: COLORS.cyan }} /> Pipeline
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {PIPELINE_STAGES.map((stage, i) => (
            <motion.button
              key={stage}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onTabChange && onTabChange('calendar')}
              className="flex-shrink-0 rounded-xl p-4 text-left transition-colors hover:opacity-90 w-44"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: STATUS_COLORS[stage] }}>
                  {stage}
                </span>
                <span className="font-['Bebas_Neue'] text-lg" style={{ color: COLORS.muted }}>
                  {pipelineCounts[stage]}
                </span>
              </div>
              <div className="space-y-1">
                {pipelinePosts[stage].length === 0 && (
                  <span className="text-xs" style={{ color: COLORS.muted }}>
                    No posts
                  </span>
                )}
                {pipelinePosts[stage].map((p) => (
                  <div key={p.id} className="text-xs truncate" style={{ color: '#aaa' }}>
                    {p.title}
                  </div>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* This Week's Posts */}
      <div>
        <h3 className="text-white text-base font-semibold mb-3 flex items-center gap-2">
          <CalendarDays size={18} style={{ color: COLORS.cyan }} /> This Week's Posts
        </h3>
        {weekPosts.length === 0 ? (
          <div
            className="rounded-xl p-5 text-sm"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.muted }}
          >
            No posts scheduled this week.
          </div>
        ) : (
          <div className="space-y-2">
            {weekPosts.map((p) => {
              const d = p.scheduled_date ? parseISO(p.scheduled_date) : null
              return (
                <motion.button
                  key={p.id}
                  whileHover={{ scale: 1.005 }}
                  onClick={() => onTabChange && onTabChange('production')}
                  className="w-full rounded-xl p-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-left transition-colors hover:opacity-90"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                >
                  <span className="text-sm text-white flex-1 min-w-[160px] truncate">{p.title}</span>
                  {p.type && (
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                      style={{ background: `${COLORS.cyan}20`, color: COLORS.cyan }}
                    >
                      {p.type}
                    </span>
                  )}
                  {p.platform && (
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                      style={{ background: `${COLORS.gold}20`, color: COLORS.gold }}
                    >
                      {p.platform}
                    </span>
                  )}
                  {d && (
                    <span className="text-xs" style={{ color: COLORS.muted }}>
                      {format(d, 'MMM d')}
                    </span>
                  )}
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                    style={{ background: `${STATUS_COLORS[p.status] || '#666'}25`, color: STATUS_COLORS[p.status] || '#666' }}
                  >
                    {p.status}
                  </span>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Deadline alerts */}
      {deadlineAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#FF4D4D' }}>
            <AlertTriangle size={15} /> Upcoming Deadlines
          </h4>
          {deadlineAlerts.map((p) => {
            const d = parseISO(p.scheduled_date)
            const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
            return (
              <div
                key={p.id}
                className="rounded-xl p-4 text-sm"
                style={{
                  background: '#1A0000',
                  border: '1px solid #FF4D4D40',
                  color: '#FF6B6B',
                }}
              >
                <AlertTriangle size={14} className="inline mr-1.5" style={{ color: '#FF4D4D' }} />
                <strong>{p.title}</strong> is due in {diff} day{diff === 1 ? '' : 's'} — {p.status}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {posts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <Sparkles size={36} style={{ color: COLORS.muted }} className="mb-3" />
          <p className="text-white text-base font-medium mb-1">No posts yet</p>
          <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
            Start building your content calendar for Centre Dentaire Zahir.
          </p>
          <button
            onClick={() => onNewPost && onNewPost()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: COLORS.cyan, color: '#000' }}
          >
            <Plus size={16} /> New Post
          </button>
        </motion.div>
      )}
    </div>
  )
}
