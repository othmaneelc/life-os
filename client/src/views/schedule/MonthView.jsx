import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { DAYS_SHORT } from './constants'
import { formatDateStr } from './utils'

const MonthView = memo(function MonthView({ days, events, selectedDate, onSelectDate, onShowDetails }) {
  const todayStr = formatDateStr(new Date())

  const eventMap = useMemo(() => {
    const map = {}
    events.forEach(e => {
      const key = e.date || 'unknown'
      if (!map[key]) map[key] = []
      if (map[key].length < 4) map[key].push(e)
    })
    return map
  }, [events])

  const heatmap = useMemo(() => {
    const counts = {}
    events.forEach(e => {
      const key = e.date || 'unknown'
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [events])

  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="min-w-[560px]">
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dateStr = formatDateStr(day.date)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === formatDateStr(selectedDate)
          const dayEvents = eventMap[dateStr] || []
          const count = heatmap[dateStr] || 0
          const heatIntensity = Math.min(count / 8, 1)

          return (
            <motion.div key={dateStr}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.003 }}
              className="min-h-[80px] p-1.5 cursor-pointer transition-all relative"
              style={{
                borderBottom: '1px solid var(--border-color)',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border-color)' : 'none',
                background: isToday ? 'var(--accent-soft)' : isSelected ? 'var(--bg-hover)' : 'transparent',
                opacity: day.currentMonth ? 1 : 0.35,
              }}
              onMouseEnter={e => { if (!isToday && !isSelected) e.currentTarget.style.background = 'var(--bg-surface)' }}
              onMouseLeave={e => { if (!isToday && !isSelected) e.currentTarget.style.background = 'transparent' }}
              onClick={() => onSelectDate(day.date)}
            >
              {count > 0 && day.currentMonth && (
                <div className="absolute top-0 right-0 w-full h-full pointer-events-none rounded"
                  style={{ background: `var(--accent)`, opacity: heatIntensity * 0.08 }} />
              )}
              <div className="flex items-center justify-center w-7 h-7 rounded-full mx-auto mb-1 relative"
                style={{
                  background: isToday ? 'var(--accent)' : isSelected ? 'var(--accent-soft)' : 'transparent',
                  color: isToday ? 'white' : isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: isToday || isSelected ? 600 : 400,
                }}>
                {day.date.getDate()}
                {count > 0 && !isToday && !isSelected && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)', opacity: 0.5 }} />
                )}
              </div>
              {dayEvents.map(event => {
                const ec = event.color || 'var(--accent)'
                return (
                  <div key={event.id + (event.is_google ? '-g' : '-l')}
                    className="text-[10px] px-1.5 py-0.5 rounded truncate mb-0.5 cursor-pointer transition-all"
                    style={{ background: `${ec}12`, color: ec, borderLeft: `2px solid ${ec}` }}
                    onClick={e => { e.stopPropagation(); onShowDetails(event) }}
                    onMouseEnter={e => e.currentTarget.style.background = `${ec}20`}
                    onMouseLeave={e => e.currentTarget.style.background = `${ec}12`}>
                    {event.title}
                  </div>
                )
              })}
              {count > 3 && (
                <div className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>+{count - 3} more</div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
    </div>
  )
})

export default MonthView
