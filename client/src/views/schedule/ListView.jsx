import { useState, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Edit3, Trash2, MapPin, Repeat } from 'lucide-react'
import { formatDateStr, timeToMin, isTimeInRange } from './utils'

const SCOPE_OPTIONS = ['Today', 'This Week', 'This Month', 'All']

function getScopeBounds(scope) {
  const now = new Date()
  const today = formatDateStr(now)
  if (scope === 'Today') return { start: today, end: today }
  if (scope === 'This Week') {
    const start = new Date(now)
    start.setDate(start.getDate() - start.getDay())
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { start: formatDateStr(start), end: formatDateStr(end) }
  }
  if (scope === 'This Month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { start: formatDateStr(start), end: formatDateStr(end) }
  }
  return { start: null, end: null }
}

const ListView = memo(function ListView({ events, nowTime, onEdit, onDelete, onShowDetails }) {
  const [scope, setScope] = useState('Today')

  const filteredEvents = useMemo(() => {
    const bounds = getScopeBounds(scope)
    return events.filter(e => {
      if (!bounds.start) return true
      const date = e.date || ''
      return date >= bounds.start && date <= bounds.end
    }).sort((a, b) => {
      if (a.is_all_day && !b.is_all_day) return -1
      if (!a.is_all_day && b.is_all_day) return 1
      return timeToMin(a.start_time) - timeToMin(b.start_time)
    })
  }, [events, scope])

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <Clock size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 8px' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No events scheduled</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Click "Add Event" to create your first event</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-1 p-1 mb-2 rounded-xl inline-flex" style={{ background: 'var(--bg-surface)' }}>
        {SCOPE_OPTIONS.map(s => (
          <button key={s} onClick={() => setScope(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: scope === s ? 'var(--bg-card)' : 'transparent',
              color: scope === s ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: scope === s ? 'var(--shadow-sm)' : 'none',
            }}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-1 rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        {filteredEvents.map((block, i) => {
          const blockColor = block.color || (block.is_google ? 'var(--success)' : 'var(--accent)')
          const isNow = !block.is_all_day && isTimeInRange(nowTime, block.start_time, block.end_time) && block.date === formatDateStr(new Date())

          return (
            <motion.div key={block.id + (block.is_google ? '-g' : '-l')}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.01 }}
              className="flex gap-4 px-4 py-3 cursor-pointer transition-colors"
              style={{
                borderBottom: i < filteredEvents.length - 1 ? '1px solid var(--border-color)' : 'none',
                background: isNow ? `${blockColor}08` : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
              onMouseLeave={e => e.currentTarget.style.background = isNow ? `${blockColor}08` : 'transparent'}
              onClick={() => onShowDetails(block)}
            >
              <div className="w-16 flex-shrink-0 pt-1 text-right">
                <span className="text-xs font-medium" style={{ color: isNow ? blockColor : 'var(--text-muted)' }}>
                  {block.is_all_day ? 'All day' : block.start_time}
                </span>
              </div>

              <div className="relative flex flex-col items-center">
                <div className="w-3 h-3 rounded-full flex-shrink-0 z-10"
                  style={{ background: blockColor, boxShadow: isNow ? `0 0 8px ${blockColor}60` : 'none' }} />
                <div className="w-px flex-1" style={{ background: 'var(--border-color)' }} />
              </div>

              <div className="flex-1 pb-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: blockColor }}>{block.title}</span>
                  {!block.is_all_day && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{block.start_time} — {block.end_time}</span>
                  )}
                  {isNow && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: blockColor, color: 'white' }}>Now</span>
                  )}
                </div>
                {block.subtitle && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{block.subtitle}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {block.date && (
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{block.date}</span>
                  )}
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: `${blockColor}15`, color: blockColor }}>
                    {block.block_type}
                  </span>
                  {block.is_google && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--success)', color: 'white' }}>Google</span>
                  )}
                  {block.recurrence && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      <Repeat size={9} />{block.recurrence}
                    </span>
                  )}
                  {block.subtitle && (
                    <span className="text-[10px] flex items-center gap-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      <MapPin size={9} />{block.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {!block.is_google && (
                <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); onEdit(block) }} aria-label="Edit event"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); onDelete(block) }} aria-label="Delete event"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--danger)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,48,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
})

export default ListView
