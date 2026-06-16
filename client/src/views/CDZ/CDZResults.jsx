import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  BarChart3, TrendingUp, TrendingDown, Eye, Users, Image, Video,
  Target, ChevronLeft, ChevronRight, Sparkles, Hash, Calendar,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

const COLORS = {
  cyan: '#00C2FF',
  gold: '#C9A84C',
  card: '#0D0D0D',
  border: '#1A1A1A',
  surface: '#111111',
  muted: '#666',
  success: '#00FF87',
  danger: '#FF4444',
}

const INITIAL_FORM = {
  fb_views: '', fb_reach: '', fb_new_followers: '', fb_top_post: '',
  ig_views: '', ig_reach: '', ig_new_followers: '', ig_saves: '',
  ig_top_post: '', reels_views: '', reels_shares: '',
  total_posts_published: '', notes: '', goals_next_month: '',
}

export default function CDZResults({ results = [] }) {
  const queryClient = useQueryClient()
  const debounceRef = useRef(null)
  const isDirty = useRef(false)

  const resultsArray = useMemo(() => {
    if (Array.isArray(results)) return results
    return []
  }, [results])

  const availableMonths = useMemo(() => {
    return [...resultsArray].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })
  }, [resultsArray])

  const [selectedIdx, setSelectedIdx] = useState(0)
  const current = availableMonths[selectedIdx] || {}

  const [form, setForm] = useState(INITIAL_FORM)

  useEffect(() => {
    isDirty.current = false
    if (current && current.id) {
      setForm({
        fb_views: current.fb_views ?? '',
        fb_reach: current.fb_reach ?? '',
        fb_new_followers: current.fb_new_followers ?? '',
        fb_top_post: current.fb_top_post ?? '',
        ig_views: current.ig_views ?? '',
        ig_reach: current.ig_reach ?? '',
        ig_new_followers: current.ig_new_followers ?? '',
        ig_saves: current.ig_saves ?? '',
        ig_top_post: current.ig_top_post ?? '',
        reels_views: current.reels_views ?? '',
        reels_shares: current.reels_shares ?? '',
        total_posts_published: current.total_posts_published ?? '',
        notes: current.notes ?? '',
        goals_next_month: current.goals_next_month ?? '',
      })
    } else {
      setForm(INITIAL_FORM)
    }
  }, [current])

  const saveMutation = useMutation({
    mutationFn: (data) =>
      fetch('/api/cdz/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to save')
        return r.json()
      }).catch((e) => { throw e }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdz-results'] })
      toast.success('Saved \u2713')
    },
    onError: () => {
      toast.error('Failed to save')
    },
  })

  const debouncedSave = useCallback(
    (data) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        saveMutation.mutate(data)
      }, 800)
    },
    [saveMutation]
  )

  const handleFieldChange = (field, value) => {
    isDirty.current = true
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleBlur = () => {
    if (!isDirty.current) return
    isDirty.current = false
    if (!current.month || !current.year) return
    const payload = { month: current.month, year: current.year }
    for (const [k, v] of Object.entries(form)) {
      payload[k] = v === '' || v === null || v === undefined ? null : v
    }
    debouncedSave(payload)
  }

  const prevMonth = availableMonths[selectedIdx - 1] || null

  const combinedReach = useMemo(() => {
    const fb = parseInt(current.fb_reach) || 0
    const ig = parseInt(current.ig_reach) || 0
    return fb + ig
  }, [current])

  const topMetric = useMemo(() => {
    if (!prevMonth || !current) return null
    const metrics = [
      { label: 'FB Views', prev: parseInt(prevMonth.fb_views) || 0, curr: parseInt(current.fb_views) || 0 },
      { label: 'IG Views', prev: parseInt(prevMonth.ig_views) || 0, curr: parseInt(current.ig_views) || 0 },
      { label: 'IG Followers', prev: parseInt(prevMonth.ig_new_followers) || 0, curr: parseInt(current.ig_new_followers) || 0 },
      { label: 'FB Reach', prev: parseInt(prevMonth.fb_reach) || 0, curr: parseInt(current.fb_reach) || 0 },
      { label: 'IG Reach', prev: parseInt(prevMonth.ig_reach) || 0, curr: parseInt(current.ig_reach) || 0 },
    ]
    let best = { change: -Infinity }
    for (const m of metrics) {
      const change = m.prev > 0 ? ((m.curr - m.prev) / m.prev) * 100 : m.curr > 0 ? 100 : 0
      if (change > best.change) best = { ...m, change: Math.round(change) }
    }
    return best.change > -Infinity ? best : null
  }, [prevMonth, current])

  const runningTotals = useMemo(() => {
    let totalViews = 0, totalFollowers = 0, totalPosts = 0
    for (const r of availableMonths) {
      totalViews += parseInt(r.fb_views) || 0
      totalViews += parseInt(r.ig_views) || 0
      totalFollowers += parseInt(r.ig_new_followers) || 0
      totalFollowers += parseInt(r.fb_new_followers) || 0
      totalPosts += parseInt(r.total_posts_published) || 0
    }
    return { totalViews, totalFollowers, totalPosts }
  }, [availableMonths])

  const followerChartData = useMemo(() => {
    return availableMonths.map((r) => ({
      month: format(new Date(r.year, r.month - 1), 'MMM'),
      followers: parseInt(r.ig_new_followers) || 0,
    }))
  }, [availableMonths])

  const fmt = (n) => {
    const num = parseInt(n)
    return isNaN(num) ? '\u2014' : num.toLocaleString()
  }

  const pctChange = (prev, curr) => {
    const p = parseInt(prev) || 0
    const c = parseInt(curr) || 0
    if (p === 0) return c > 0 ? '+100%' : '\u2014'
    const change = ((c - p) / p) * 100
    return `${change >= 0 ? '+' : ''}${Math.round(change)}%`
  }

  const comparisonRows = [
    {
      label: 'FB Views', prev: fmt(prevMonth?.fb_views), curr: fmt(current.fb_views),
      change: pctChange(prevMonth?.fb_views, current.fb_views),
      direction: (parseInt(current.fb_views) || 0) > (parseInt(prevMonth?.fb_views) || 0) ? 'up'
        : (parseInt(current.fb_views) || 0) < (parseInt(prevMonth?.fb_views) || 0) ? 'down' : 'same',
    },
    {
      label: 'IG Views', prev: fmt(prevMonth?.ig_views), curr: fmt(current.ig_views),
      change: pctChange(prevMonth?.ig_views, current.ig_views),
      direction: (parseInt(current.ig_views) || 0) > (parseInt(prevMonth?.ig_views) || 0) ? 'up'
        : (parseInt(current.ig_views) || 0) < (parseInt(prevMonth?.ig_views) || 0) ? 'down' : 'same',
    },
    {
      label: 'IG Followers', prev: fmt(prevMonth?.ig_new_followers), curr: fmt(current.ig_new_followers),
      change: pctChange(prevMonth?.ig_new_followers, current.ig_new_followers),
      direction: (parseInt(current.ig_new_followers) || 0) > (parseInt(prevMonth?.ig_new_followers) || 0) ? 'up'
        : (parseInt(current.ig_new_followers) || 0) < (parseInt(prevMonth?.ig_new_followers) || 0) ? 'down' : 'same',
    },
  ]

  if (availableMonths.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
      >
        <BarChart3 size={48} style={{ color: COLORS.muted }} className="mb-4" />
        <p className="text-white text-base font-medium mb-1">No monthly data yet</p>
        <p className="text-sm" style={{ color: COLORS.muted }}>
          Monthly results will appear here once you start tracking them.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 py-2">
        <button
          onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
          disabled={selectedIdx === 0}
          className="p-2 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: COLORS.muted, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <span
          className="text-lg font-semibold min-w-[140px] text-center"
          style={{ color: '#fff', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.5px' }}
        >
          {current.month
            ? format(new Date(current.year, current.month - 1), 'MMMM yyyy')
            : 'Select Month'}
        </span>
        <button
          onClick={() => setSelectedIdx((i) => Math.min(availableMonths.length - 1, i + 1))}
          disabled={selectedIdx === availableMonths.length - 1}
          className="p-2 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: COLORS.muted, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Input form */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
      >
        <h3 className="text-white text-base font-semibold mb-4 flex items-center gap-2">
          <Hash size={16} style={{ color: COLORS.cyan }} /> Monthly Data Entry
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#1877F2' }}>
              <Eye size={15} /> Facebook
            </h4>
            <div className="space-y-3">
              {[
                { label: 'Views', field: 'fb_views' },
                { label: 'Reach', field: 'fb_reach' },
                { label: 'New Followers', field: 'fb_new_followers' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>{label}</label>
                  <input
                    type="number"
                    value={form[field]}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    onBlur={handleBlur}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>Top Post</label>
                <input
                  type="text"
                  value={form.fb_top_post}
                  onChange={(e) => handleFieldChange('fb_top_post', e.target.value)}
                  onBlur={handleBlur}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#E4405F' }}>
              <Image size={15} /> Instagram
            </h4>
            <div className="space-y-3">
              {[
                { label: 'Views', field: 'ig_views' },
                { label: 'Reach', field: 'ig_reach' },
                { label: 'New Followers', field: 'ig_new_followers' },
                { label: 'Saves', field: 'ig_saves' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>{label}</label>
                  <input
                    type="number"
                    value={form[field]}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    onBlur={handleBlur}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>Top Post</label>
                <input
                  type="text"
                  value={form.ig_top_post}
                  onChange={(e) => handleFieldChange('ig_top_post', e.target.value)}
                  onBlur={handleBlur}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                />
              </div>
              {[
                { label: 'Reels Views', field: 'reels_views' },
                { label: 'Reels Shares', field: 'reels_shares' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>{label}</label>
                  <input
                    type="number"
                    value={form[field]}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    onBlur={handleBlur}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>Total Posts Published</label>
            <input
              type="number"
              value={form.total_posts_published}
              onChange={(e) => handleFieldChange('total_posts_published', e.target.value)}
              onBlur={handleBlur}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              onBlur={handleBlur}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.muted }}>Goals for Next Month</label>
            <textarea
              value={form.goals_next_month}
              onChange={(e) => handleFieldChange('goals_next_month', e.target.value)}
              onBlur={handleBlur}
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Results dashboard */}
      {current.month && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 text-center"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <div
              className="font-['Bebas_Neue'] text-6xl md:text-7xl tracking-wide"
              style={{ color: COLORS.cyan }}
            >
              {fmt(combinedReach)}
            </div>
            <div className="text-sm mt-1" style={{ color: COLORS.muted }}>
              Total Combined Reach
            </div>
          </motion.div>

          {followerChartData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={16} style={{ color: COLORS.gold }} /> Follower Growth
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={followerChartData}>
                  <XAxis dataKey="month" tick={{ fill: COLORS.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: COLORS.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: '#fff', fontSize: 13 }}
                  />
                  <Bar dataKey="followers" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {topMetric && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center gap-3">
                <Target size={20} style={{ color: COLORS.success }} />
                <div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>Top Performing Metric</div>
                  <div className="text-white text-base font-semibold">
                    {topMetric.label}{' '}
                    <span style={{ color: topMetric.change >= 0 ? COLORS.success : COLORS.danger }}>
                      {topMetric.change >= 0 ? '+' : ''}{topMetric.change}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {prevMonth && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                <Calendar size={16} style={{ color: COLORS.cyan }} /> Month-over-Month Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>
                      <th className="text-left py-2 pr-4 font-medium">Metric</th>
                      <th className="text-right py-2 px-4 font-medium">Last Month</th>
                      <th className="text-right py-2 px-4 font-medium">This Month</th>
                      <th className="text-right py-2 pl-4 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <td className="py-3 pr-4 text-white">{row.label}</td>
                        <td className="py-3 px-4 text-right" style={{ color: COLORS.muted }}>{row.prev}</td>
                        <td className="py-3 px-4 text-right text-white">{row.curr}</td>
                        <td className="py-3 pl-4 text-right">
                          <span
                            className="inline-flex items-center gap-1"
                            style={{
                              color: row.direction === 'up' ? COLORS.success
                                : row.direction === 'down' ? COLORS.danger
                                : COLORS.muted,
                            }}
                          >
                            {row.direction === 'up' && <ArrowUp size={13} />}
                            {row.direction === 'down' && <ArrowDown size={13} />}
                            {row.direction === 'same' && <Minus size={13} />}
                            {row.change}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-5 flex flex-wrap gap-6 items-center justify-center"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            {[
              { label: 'Total Views', value: fmt(runningTotals.totalViews) },
              { label: 'Total Followers', value: fmt(runningTotals.totalFollowers) },
              { label: 'Total Posts', value: fmt(runningTotals.totalPosts) },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="font-['Bebas_Neue'] text-3xl tracking-wide" style={{ color: COLORS.gold }}>
                  {item.value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: COLORS.muted }}>{item.label}</div>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
