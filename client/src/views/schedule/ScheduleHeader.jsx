import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, Calendar, RefreshCw } from 'lucide-react'
import { DAYS_FULL, MONTHS } from './constants'
import { formatDateStr } from './utils'

const ScheduleHeader = memo(function ScheduleHeader({
  selectedDate, viewMode, setViewMode, showMiniCal, setShowMiniCal,
  gcalConnected, syncing, handleSync, onNewEvent, navigate, goToday
}) {
  const weekStart = useMemo(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - d.getDay())
    return d
  }, [selectedDate])

  const getWeekNumber = (d) => {
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    const diff = d - startOfYear + (startOfYear.getTimezoneOffset() - d.getTimezoneOffset()) * 60000
    return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7)
  }

  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return `${DAYS_FULL[selectedDate.getDay()]}, ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`
    }
    if (viewMode === 'week') {
      const end = new Date(weekStart)
      end.setDate(end.getDate() + 6)
      const wn = getWeekNumber(weekStart)
      if (weekStart.getMonth() === end.getMonth()) {
        return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${end.getDate()}, ${weekStart.getFullYear()} · W${wn}`
      }
      return `${MONTHS[weekStart.getMonth()].substring(0, 3)} ${weekStart.getDate()} – ${MONTHS[end.getMonth()].substring(0, 3)} ${end.getDate()}, ${end.getFullYear()} · W${wn}`
    }
    const wn = getWeekNumber(selectedDate)
    return `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()} · W${wn}`
  }, [selectedDate, viewMode, weekStart])

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} aria-label="Previous date"
          className="p-2 rounded-xl transition-colors" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
          <ChevronLeft size={20} />
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={goToday}
          className="px-4 py-1.5 text-sm font-medium rounded-xl transition-all"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}>
          Today
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(1)} aria-label="Next date"
          className="p-2 rounded-xl transition-colors" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
          <ChevronRight size={20} />
        </motion.button>
        <motion.h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{headerTitle}</motion.h1>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowMiniCal(!showMiniCal)} aria-label="Toggle mini calendar"
          className="p-2 rounded-xl transition-colors"
          style={{ background: showMiniCal ? 'var(--accent-soft)' : 'transparent', color: showMiniCal ? 'var(--accent)' : 'var(--text-muted)' }}>
          <Calendar size={16} />
        </motion.button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
          {[['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['list', 'List']].map(([key, label]) => (
            <motion.button key={key} whileTap={{ scale: 0.95 }} onClick={() => setViewMode(key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: viewMode === key ? 'var(--bg-card)' : 'transparent',
                color: viewMode === key ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: viewMode === key ? 'var(--shadow-sm)' : 'none',
              }}>
              {label}
            </motion.button>
          ))}
        </div>

        {gcalConnected && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync'}
          </motion.button>
        )}
        <motion.button whileHover={{ scale: 1.02, boxShadow: '0 4px 20px var(--accent-glow)' }} whileTap={{ scale: 0.98 }}
          onClick={onNewEvent}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus size={15} /> Add Event
        </motion.button>
      </div>
    </div>
  )
})

export default ScheduleHeader
