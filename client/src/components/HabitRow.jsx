import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, X, Flame } from 'lucide-react'
import { useHabitStore } from '../store/habitStore'
import { getTodayStr } from '../utils/dateHelpers'

function HabitRow({ habit, weekStart, weekEnd, showName = true, index = 0 }) {
  const toggleLog = useHabitStore(s => s.toggleLog)

  const days = useMemo(() => {
    const result = []
    const start = new Date(weekStart)
    const end = new Date(weekEnd)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push(new Date(d).toISOString().split('T')[0])
    }
    return result
  }, [weekStart, weekEnd])

  const today = getTodayStr()

  const isDone = useMemo(() => {
    const doneSet = new Set(
      (habit.logs || []).filter(l => l.done).map(l => l.date)
    )
    return (date) => doneSet.has(date)
  }, [habit.logs])

  const streak = habit.streak || 0
  const weeklyDone = days.filter(d => isDone(d)).length

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="flex items-center gap-3 py-2.5 px-3 hover:bg-apple-surface rounded-lg transition-colors group"
    >
      {showName && (
        <div className="flex-1 min-w-[140px]">
          <div className="text-body font-medium text-apple-text">{habit.name}</div>
          <div className="text-micro text-apple-muted">{habit.category}</div>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        {days.map(date => (
          <motion.button
            key={date}
            whileTap={{ scale: 0.85 }}
            onClick={() => toggleLog(habit.id, date, !isDone(date))}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 ${
              isDone(date)
                ? 'bg-apple-green text-white'
                : date === today
                  ? 'bg-apple-surface border border-apple-blue/30 text-apple-muted hover:bg-apple-green/10'
                  : 'bg-apple-surface text-apple-tertiary hover:bg-apple-surface'
            } ${date === today ? 'ring-1 ring-apple-blue/40' : ''}`}
          >
            {isDone(date) ? <Check size={14} /> : date === today ? <X size={14} /> : null}
          </motion.button>
        ))}
      </div>
      <div className="flex items-center gap-2 min-w-[60px] justify-end">
        {streak > 0 ? (
          <motion.span
            key={streak}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 text-small text-apple-amber"
          >
            <Flame size={14} /> {streak}
          </motion.span>
        ) : (
          <span className="text-small text-apple-tertiary">— 0</span>
        )}
        <span className="text-micro text-apple-muted w-8 text-right">{Math.round((weeklyDone / days.length) * 100)}%</span>
      </div>
    </motion.div>
  )
}

export default memo(HabitRow)
