import { useEffect, useRef, memo } from 'react'
import { motion } from 'framer-motion'
import { DAYS_SHORT, HOURS } from './constants'
import { formatDateStr, timeToMin } from './utils'

const WeekendColumn = memo(function WeekendColumn({ isWeekend }) {
  if (!isWeekend) return null
  return <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--bg-surface)', opacity: 0.3 }} />
})

function hasConflict(event, events) {
  if (event.is_all_day) return false
  const start = timeToMin(event.start_time)
  const end = timeToMin(event.end_time)
  return events.some(e => {
    if (e.id === event.id || e.is_all_day) return false
    const es = timeToMin(e.start_time)
    const ee = timeToMin(e.end_time)
    return start < ee && end > es
  })
}

const WeekView = memo(function WeekView({ weekDates, events, nowTime, onSlotClick, onEdit, onDelete, onShowDetails, onDragStart, onDragEnd, onDrop, onResizeStart, dragResize, dragging }) {
  const scrollRef = useRef(null)
  const todayStr = formatDateStr(new Date())
  const allDayEvents = events.filter(e => e.is_all_day)
  const timedEvents = events.filter(e => !e.is_all_day)

  useEffect(() => {
    if (!scrollRef.current) return
    const hourNow = nowTime.getHours()
    const scrollTo = Math.max(0, (hourNow - 1) * 50)
    scrollRef.current.scrollTop = scrollTo
  }, [])

  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div className="min-w-[672px]">
      {allDayEvents.length > 0 && (
        <div className="flex" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
          <div className="w-14 flex-shrink-0" />
          {weekDates.map((d, i) => {
            const dateStr = formatDateStr(d)
            const dayAllDay = allDayEvents.filter(e => e.date === dateStr)
            return (
              <div key={dateStr} className="flex-1 relative p-1 min-h-[28px]" style={{ borderLeft: '1px solid var(--border-color)' }}>
                <WeekendColumn isWeekend={i >= 5} />
                {dayAllDay.map(event => (
                  <div key={event.id} className="rounded px-1.5 py-0.5 text-[11px] cursor-pointer truncate mb-0.5"
                    style={{ background: `${event.color || '#5B5BD6'}15`, borderLeft: `2px solid ${event.color || '#5B5BD6'}` }}
                    onClick={e => { e.stopPropagation(); onShowDetails(event) }}>
                    <span className="font-medium truncate" style={{ color: event.color || 'var(--text-primary)' }}>{event.title}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
        <div className="w-14 flex-shrink-0" />
        {weekDates.map((d, i) => {
          const dateStr = formatDateStr(d)
          const isToday = dateStr === todayStr
          return (
            <div key={dateStr} className="flex-1 text-center py-3"
              style={{ borderLeft: '1px solid var(--border-color)', background: isToday ? 'var(--accent-soft)' : 'transparent' }}>
              <div className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{DAYS_SHORT[d.getDay()]}</div>
              <div className={`text-lg font-bold ${isToday ? 'gradient-text' : ''}`}
                style={{ color: isToday ? 'var(--accent)' : 'var(--text-primary)' }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="flex min-h-[50px]"
            style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="w-14 flex-shrink-0 pt-1 pr-2 text-right">
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
              </span>
            </div>
            {weekDates.map((d, i) => {
              const dateStr = formatDateStr(d)
              const isToday = dateStr === todayStr
              const isWeekend = i >= 5
              const hourEvents = timedEvents.filter(e => {
                if (e.date && e.date !== dateStr) return false
                return Math.floor(timeToMin(e.start_time) / 60) === hour
              })
              const currentTimeMarker = isToday && hour === nowTime.getHours()

              return (
                <div key={`${dateStr}-${hour}`}
                  className="flex-1 py-0.5 cursor-pointer transition-colors relative"
                  style={{
                    borderLeft: '1px solid var(--border-color)',
                    background: isToday ? 'var(--accent-soft)' : isWeekend ? 'var(--bg-surface)' : 'transparent',
                  }}
                  onClick={() => onSlotClick(dateStr, hour, hour * 60)}
                  onMouseEnter={e => e.currentTarget.style.background = isToday ? 'var(--accent-glow)' : 'var(--bg-surface)'}
                  onMouseLeave={e => { e.currentTarget.style.background = isToday ? 'var(--accent-soft)' : isWeekend ? 'var(--bg-surface)' : 'transparent' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); onDrop(dateStr, hour) }}
                >
                  {currentTimeMarker && (
                    <div className="absolute left-0 right-0 z-10" style={{ top: `${(nowTime.getMinutes() / 60) * 50}px` }}>
                      <div className="w-2 h-2 rounded-full -ml-1" style={{ background: 'var(--danger)' }} />
                      <div className="h-px" style={{ background: 'var(--danger)' }} />
                    </div>
                  )}
                  {hourEvents.map(event => {
                    const startMin = timeToMin(event.start_time)
                    const endMin = timeToMin(event.end_time)
                    const duration = endMin - startMin || 60
                    const height = Math.max((duration / 60) * 50, 20)
                    const isResizing = dragResize?.block?.id === event.id
                    const isDragging = dragging?.id === event.id
                    const conflict = hasConflict(event, timedEvents.filter(e => e.date === dateStr && !e.is_google))
                    const blockColor = event.color || 'var(--accent)'
                    return (
                      <motion.div key={event.id + (event.is_google ? '-g' : '-l')}
                        layout draggable={!event.is_google}
                        onDragStart={e => onDragStart(e, event)}
                        onDragEnd={onDragEnd}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, scale: isDragging ? 1.05 : 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={`rounded-md px-1.5 py-0.5 text-[11px] cursor-pointer group transition-shadow mb-0.5 truncate relative ${isDragging ? 'z-20' : ''}`}
                        style={{
                          height: `${isResizing ? ((dragResize.newEnd - startMin) / 60) * 50 : height}px`,
                          background: `linear-gradient(135deg, ${blockColor}18, ${blockColor}08)`,
                          borderLeft: `2px solid ${blockColor}`,
                          boxShadow: conflict ? `inset 0 0 0 1px var(--danger)` : isDragging ? `0 4px 16px ${blockColor}30` : 'none',
                        }}
                        onClick={e => { e.stopPropagation(); onShowDetails(event) }}
                        title={event.title}
                      >
                        <span className="font-semibold truncate" style={{ color: blockColor }}>{event.title}</span>
                        <span className="text-[9px] opacity-60 block truncate">{event.start_time}</span>
                        {conflict && (
                          <span className="text-[8px] font-medium px-1 rounded absolute top-0.5 right-0.5" style={{ background: 'var(--danger)', color: 'white' }}>!</span>
                        )}
                        {!event.is_google && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100"
                            onMouseDown={e => onResizeStart(e, event)} />
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
    </div>
  )
})

export default WeekView
