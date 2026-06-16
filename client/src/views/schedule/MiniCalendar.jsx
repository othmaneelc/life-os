import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DAYS_SHORT, MONTHS } from './constants'
import { formatDateStr } from './utils'

export default function MiniCalendar({ selectedDate, onSelectDate, events }) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate))
  const todayStr = formatDateStr(new Date())
  const selectedStr = formatDateStr(selectedDate)

  const eventDensity = useMemo(() => {
    const counts = {}
    events.forEach(e => {
      if (e.date) counts[e.date] = (counts[e.date] || 0) + 1
    })
    return counts
  }, [events])

  const maxCount = useMemo(() => Math.max(...Object.values(eventDensity), 1), [eventDensity])

  const days = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    const days = []
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), currentMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false })
    }
    return days
  }, [viewDate])

  const goToday = () => {
    const today = new Date()
    setViewDate(today)
    onSelectDate(today)
  }

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })} aria-label="Previous month" className="p-1 hover:bg-apple-surface rounded">
          <ChevronLeft size={14} className="text-apple-muted" />
        </button>
        <span className="text-small font-semibold">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
        <div className="flex items-center gap-1">
          <button onClick={goToday} aria-label="Go to today"
            className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors"
            style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            Today
          </button>
          <button onClick={() => setViewDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })} aria-label="Next month" className="p-1 hover:bg-apple-surface rounded">
            <ChevronRight size={14} className="text-apple-muted" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-apple-muted py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          const dateStr = formatDateStr(day.date)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedStr
          const count = eventDensity[dateStr] || 0
          const intensity = count > 0 ? Math.min(count / maxCount, 1) : 0

          return (
            <button key={dateStr}
              onClick={() => onSelectDate(day.date)}
              className={`relative text-[11px] py-1 rounded-full transition-colors ${!day.currentMonth ? 'text-apple-muted/30' : ''} ${isToday ? 'text-white font-semibold' : ''} ${isSelected && !isToday ? 'font-semibold' : ''} hover:bg-apple-surface`}
              style={{
                background: isToday ? 'var(--accent)' : isSelected ? 'var(--accent-soft)' : intensity > 0 ? `color-mix(in srgb, var(--accent) ${intensity * 20}%, transparent)` : 'transparent',
                color: isToday ? 'white' : isSelected ? 'var(--accent)' : undefined,
              }}
            >
              {day.date.getDate()}
              {count > 0 && !isToday && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                  <div className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)', opacity: 0.3 + intensity * 0.7 }} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
