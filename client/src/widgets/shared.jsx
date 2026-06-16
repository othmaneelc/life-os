import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'

export function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', className = '' }) {
  const displayRef = useRef(0)
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === undefined || value === null) return
    const target = Number(value)
    const duration = 800
    const start = performance.now()
    const from = displayRef.current
    function animate(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (target - from) * eased
      displayRef.current = current
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])
  return <span className={'tabular-nums ' + className}>{prefix}{display.toFixed(decimals)}{suffix}</span>
}

export function TimeAgo({ dateStr }) {
  if (!dateStr) return null
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / (1000 * 60))
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const HabitRing = ({ done, total, icon: Icon }) => {
  const pct = total > 0 ? done / total : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg-surface)" strokeWidth="4" />
          <motion.circle
            cx="28" cy="28" r="22" fill="none" stroke="var(--accent)" strokeWidth="4"
            strokeLinecap="round" strokeDasharray={2 * Math.PI * 22}
            initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - pct) }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            transform="rotate(-90 28 28)"
          />
        </svg>
        {Icon && <Icon size={16} className="absolute inset-0 m-auto text-[var(--accent)]" style={{ top: '50%', transform: 'translateY(-50%)' }} />}
      </div>
      <span className="text-micro font-medium tabular-nums">{done}/{total}</span>
    </div>
  )
}

export const RevenueWidget = ({ transactions }) => {
  const days = useMemo(() => {
    const result = []
    for (let i = 13; i >= 0; i--) {
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

  const net14d = days.reduce((s, d) => s + d.income - d.expense, 0)
  const income7d = days.slice(-7).reduce((s, d) => s + d.income, 0)
  const maxVal = Math.max(...days.map(d => Math.max(d.income, d.expense, 1)))
  const w = 280; const h = 80

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <div>
          <span className="text-[28px] font-bold" style={{ color: net14d >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            <AnimatedNumber value={net14d} />
          </span>
          <span className="text-micro ml-2" style={{ color: 'var(--text-muted)' }}>14d net</span>
        </div>
        <div className="text-small" style={{ color: 'var(--text-muted)' }}>
          Revenue: <span className="font-medium" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={income7d} /> MAD</span>
        </div>
      </div>
      <div className="flex items-end gap-[2px] h-16 mb-1">
        {days.map((d, i) => {
          const barH = maxVal > 0 ? (d.income / maxVal) * 64 : 2
          return (
            <motion.div
              key={d.date}
              initial={{ height: 0 }}
              animate={{ height: Math.max(barH, 2) }}
              transition={{ delay: i * 0.03, duration: 0.4, ease: 'easeOut' }}
              className="flex-1 rounded-t-sm min-w-[6px]"
              style={{ background: d.income > 0 ? 'var(--accent)' : 'var(--bg-surface)' }}
            />
          )
        })}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          fill="url(#revenue-fill)"
          d={`M0,${h} ${days.map((d, i) => `L${(i / (days.length - 1)) * w},${h - (d.income / maxVal) * h}`).join(' ')} L${w},${h}Z`}
        />
        <motion.polyline
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut', delay: 0.2 }}
          fill="none" stroke="var(--accent)" strokeWidth="2" strokeOpacity="0.8"
          points={days.map((d, i) => `${(i / (days.length - 1)) * w},${h - (d.income / maxVal) * h}`).join(' ')}
        />
      </svg>
    </div>
  )
}

export const AgencyPipeline = ({ clients }) => {
  const active = clients.filter(c => c.status !== 'closed_lost' && c.status !== 'inactive')
  const deals = [
    { label: 'New Leads', count: active.filter(c => c.status === 'new_lead' || !c.status).length, color: 'var(--accent)' },
    { label: 'In Progress', count: active.filter(c => c.status === 'conversation_started' || c.status === 'meeting_booked').length, color: 'var(--warning)' },
    { label: 'Proposal', count: active.filter(c => c.status === 'proposal_sent').length, color: 'var(--purple)' },
    { label: 'Active', count: active.filter(c => c.status === 'active').length, color: 'var(--success)' },
  ]
  const total = deals.reduce((s, d) => s + d.count, 0)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[28px] font-bold" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={active.length} /></span>
        <span className="text-small" style={{ color: 'var(--text-muted)' }}>active contacts</span>
      </div>
      <div className="space-y-2">
        {deals.map((d, i) => d.count > 0 && (
          <motion.div key={d.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-2 text-small">
            <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{d.label}</span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 + 0.3 }}
              className="font-medium tabular-nums" style={{ color: d.color }}
            >
              <AnimatedNumber value={d.count} />
            </motion.span>
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${total > 0 ? (d.count / total) * 100 : 0}%` }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: d.color }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
