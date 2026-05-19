import { memo } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { usePrayerStore } from '../store/prayerStore'
import { prayerLabels, prayerIcons } from '../utils/formatters'
import { getTodayStr } from '../utils/dateHelpers'

function PrayerRow({ prayerName, scheduledTime, isNext, countdown, index = 0 }) {
  const todayPrayers = usePrayerStore(s => s.todayPrayers)
  const togglePrayer = usePrayerStore(s => s.togglePrayer)
  const today = getTodayStr()

  const prayerRecord = todayPrayers.find(p => p.prayer_name === prayerName)
  const isDone = prayerRecord?.done || false

  const now = new Date()
  const [h, m] = (scheduledTime || '00:00').split(':').map(Number)
  const prayerTime = new Date()
  prayerTime.setHours(h, m, 0)
  const hasPassed = now > prayerTime

  function getStateColor() {
    if (isDone) return 'text-apple-green'
    if (isNext) return 'text-apple-amber'
    if (hasPassed) return 'text-apple-red'
    return 'text-apple-muted'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      className={`flex items-center gap-3 p-2 rounded-md transition-colors ${isNext ? 'bg-apple-amber/5' : 'hover:bg-apple-surface'}`}
    >
      <div className="w-8 text-center">
        <span className={`text-base ${getStateColor()}`}>{prayerIcons[prayerName] || ''}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-body font-medium ${isDone ? 'text-apple-tertiary' : 'text-apple-text'}`}>{prayerLabels[prayerName] || prayerName}</span>
          {isNext && countdown && <span className="badge-gray text-micro">{countdown}</span>}
        </div>
        <div className="text-small text-apple-muted">{scheduledTime}</div>
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => togglePrayer(today, prayerName, !isDone)}
        className={`px-2.5 py-1 rounded-input text-small font-medium transition-colors ${
          isDone
            ? 'bg-apple-green/10 text-apple-green'
            : 'bg-apple-surface text-apple-muted hover:text-apple-green'
        }`}
      >
        {isDone ? <Check size={13} /> : 'Mark'}
      </motion.button>
    </motion.div>
  )
}

export default memo(PrayerRow)
