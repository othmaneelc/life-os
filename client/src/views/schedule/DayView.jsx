import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { Edit3, Trash2, MapPin } from 'lucide-react'
import { HOURS } from './constants'
import { formatDateStr, timeToMin } from './utils'

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

const DayView = memo(function DayView({ date, events, nowTime, onSlotClick, onEdit, onDelete, onShowDetails, onDragStart, onDragEnd, onDrop, onResizeStart, dragResize, dragging }) {
  const scrollRef = useRef(null)
  const [dragCreate, setDragCreate] = useState(null)
  const todayStr = formatDateStr(date)
  const isToday = todayStr === formatDateStr(new Date())
  const allDayEvents = events.filter(e => e.is_all_day)
  const timedEvents = events.filter(e => !e.is_all_day)

  useEffect(() => {
    if (!isToday || !scrollRef.current) return
    const hourNow = nowTime.getHours()
    const scrollTo = Math.max(0, (hourNow - 1) * 64)
    scrollRef.current.scrollTop = scrollTo
  }, [])

  const handleMouseDown = useCallback((hour, e) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const startMin = hour * 60 + Math.floor((offsetY / 64) * 60)
    setDragCreate({ hour, startMin, currentMin: startMin })
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragCreate) return
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const currentMin = dragCreate.hour * 60 + Math.floor((offsetY / 64) * 60)
    setDragCreate(prev => prev ? { ...prev, currentMin: Math.max(prev.startMin, currentMin) } : null)
  }, [dragCreate])

  const handleMouseUp = useCallback((e) => {
    if (!dragCreate) return
    const startM = dragCreate.startMin
    const endM = dragCreate.currentMin
    if (endM - startM < 15) {
      onSlotClick(todayStr, Math.floor(startM / 60), startM % 60)
    } else {
      onSlotClick(todayStr, Math.floor(startM / 60), startM % 60, endM - startM)
    }
    setDragCreate(null)
  }, [dragCreate, onSlotClick, todayStr])

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      {allDayEvents.length > 0 && (
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface)' }}>
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>All-day</div>
          <div className="flex gap-2 flex-wrap">
            {allDayEvents.map(event => (
              <motion.div key={event.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="rounded-lg px-3 py-1.5 text-sm cursor-pointer transition-shadow hover:shadow-md"
                style={{ background: `${event.color || '#5B5BD6'}15`, borderLeft: `3px solid ${event.color || '#5B5BD6'}` }}
                onClick={e => { e.stopPropagation(); onShowDetails(event) }}>
                <span className="font-medium" style={{ color: event.color || 'var(--text-primary)' }}>{event.title}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="max-h-[80vh] overflow-y-auto">
        {HOURS.map(hour => {
          const hourEvents = timedEvents.filter(e => Math.floor(timeToMin(e.start_time) / 60) === hour)
          const currentTimeMarker = isToday && hour === nowTime.getHours()
          const dragActive = dragCreate?.hour === hour

          return (
            <div key={hour}
              className="flex min-h-[64px] relative"
              style={{ borderBottom: '1px solid var(--border-color)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); onDrop(todayStr, hour) }}
            >
              <div className="w-16 flex-shrink-0 pt-2 pr-3 text-right">
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </span>
              </div>
              <div
                className="flex-1 py-1 cursor-pointer transition-colors relative"
                style={{ borderLeft: '1px solid var(--border-color)' }}
                onMouseDown={(e) => handleMouseDown(hour, e)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e => { if (!dragActive) e.currentTarget.style.background = 'transparent' }}
              >
                {currentTimeMarker && (
                  <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: `${(nowTime.getMinutes() / 60) * 64}px` }}>
                    <div className="w-3 h-3 rounded-full -ml-1.5 flex-shrink-0" style={{ background: 'var(--danger)' }} />
                    <div className="flex-1 h-px" style={{ background: 'var(--danger)' }} />
                  </div>
                )}
                {dragActive && dragCreate && (
                  <div className="absolute left-1 right-2 rounded-lg px-3 py-1.5 z-10 opacity-50"
                    style={{
                      top: `${((dragCreate.startMin - hour * 60) / 60) * 64}px`,
                      height: `${Math.max(((dragCreate.currentMin - dragCreate.startMin) / 60) * 64, 28)}px`,
                      background: 'var(--accent)',
                    }}
                  />
                )}
                {hourEvents.map(event => {
                  const startMin = timeToMin(event.start_time)
                  const endMin = timeToMin(event.end_time)
                  const duration = endMin - startMin || 60
                  const topOffset = ((startMin % 60) / 60) * 64
                  const height = Math.max((duration / 60) * 64, 28)
                  const isResizing = dragResize?.block?.id === event.id
                  const isDragging = dragging?.id === event.id
                  const conflict = hasConflict(event, timedEvents)
                  const blockColor = event.color || 'var(--accent)'

                  return (
                    <motion.div
                      key={event.id + (event.is_google ? '-g' : '-l')}
                      layout
                      draggable={!event.is_google}
                      onDragStart={e => onDragStart(e, event)}
                      onDragEnd={onDragEnd}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: isDragging ? 1.03 : 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`absolute left-1 right-2 rounded-lg px-3 py-1.5 text-sm cursor-pointer group transition-all ${isDragging ? 'z-20' : ''}`}
                      style={{
                        top: `${topOffset}px`,
                        height: `${isResizing ? ((dragResize.newEnd - startMin) / 60) * 64 : height}px`,
                        background: `linear-gradient(135deg, ${blockColor}12, ${blockColor}05)`,
                        borderLeft: `3px solid ${blockColor}`,
                        boxShadow: isDragging ? `0 8px 32px ${blockColor}30, 0 0 0 1px ${blockColor}20` : conflict ? 'inset 0 0 0 1px var(--danger)' : 'none',
                      }}
                      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.boxShadow = `0 4px 16px ${blockColor}20` }}
                      onMouseLeave={e => { if (!isDragging) e.currentTarget.style.boxShadow = conflict ? 'inset 0 0 0 1px var(--danger)' : 'none' }}
                      onClick={e => { e.stopPropagation(); onShowDetails(event) }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate text-sm" style={{ color: blockColor }}>{event.title}</span>
                        {!event.is_google && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); onEdit(event) }} aria-label="Edit event"
                              className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <Edit3 size={12} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); onDelete(event) }} aria-label="Delete event"
                              className="p-1 rounded-md transition-colors" style={{ color: 'var(--danger)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{event.start_time} – {event.end_time}</div>
                      {conflict && (
                        <span className="text-[9px] font-medium px-1 rounded mt-0.5 inline-block" style={{ background: 'var(--danger)', color: 'white' }}>Conflict</span>
                      )}
                      {event.is_google && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ background: 'var(--success)', color: 'white' }}>Google</span>
                      )}
                      {!event.is_google && event.subtitle && (
                        <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                          <MapPin size={9} /> {event.subtitle}
                        </div>
                      )}
                      {!event.is_google && (
                        <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          onMouseDown={e => onResizeStart(e, event)}>
                          <div className="w-8 h-0.5 rounded" style={{ background: 'var(--text-tertiary)' }} />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default DayView
