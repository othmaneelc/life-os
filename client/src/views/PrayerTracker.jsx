import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, Check, X, Clock } from 'lucide-react'
import { usePrayerStore } from '../store/prayerStore'
import { usePrayerTimes } from '../hooks/usePrayerTimes'
import PrayerRow from '../components/PrayerRow'
import { getTodayStr, getFormattedDate, getWeekStart } from '../utils/dateHelpers'
import { prayerNames, prayerLabels } from '../utils/formatters'

export default function PrayerTracker() {
  const today = getTodayStr()
  const { prayerTimes, nextPrayer, countdown } = usePrayerTimes(today)
  const todayPrayers = usePrayerStore(s => s.todayPrayers)
  const fajrStreak = usePrayerStore(s => s.fajrStreak)
  const stats = usePrayerStore(s => s.stats)
  const heatmap = usePrayerStore(s => s.heatmap)
  const fetchTodayPrayers = usePrayerStore(s => s.fetchTodayPrayers)
  const fetchFajrStreak = usePrayerStore(s => s.fetchFajrStreak)
  const fetchStats = usePrayerStore(s => s.fetchStats)
  const fetchHeatmap = usePrayerStore(s => s.fetchHeatmap)
  const togglePrayer = usePrayerStore(s => s.togglePrayer)

  useEffect(() => {
    fetchTodayPrayers().catch(() => {}); fetchFajrStreak().catch(() => {})
    const weekStart = getWeekStart()
    fetchStats(weekStart, today).catch(() => {})
    const monthStart = new Date(); monthStart.setDate(1)
    fetchHeatmap(monthStart.toISOString().split('T')[0], today).catch(() => {})
  }, [])

  const doneCount = todayPrayers?.filter(p => p?.done).length ?? 0

  const heatmapData = useMemo(() => {
    const days = []
    for (let w = 0; w < 4; w++) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(); date.setDate(date.getDate() - (w * 7 + (6 - d)))
        const dateStr = date.toISOString().split('T')[0]
        const dayPrayers = prayerNames.map(pn => {
          const r = heatmap.find(h => h.date === dateStr && h.prayer_name === pn)
          return r ? r.done : null
        })
        week.push({ date: dateStr, prayers: dayPrayers })
      }
      days.unshift(week)
    }
    return days
  }, [heatmap])

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading font-semibold ">Prayer Tracker</h1>
        <span className="text-small text-apple-muted">Casablanca</span>
      </div>

      {/* Fajr Card */}
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="card border-l-[3px] border-l-apple-green">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-subheading font-semibold">Did you pray Fajr on time?</h3>
            {fajrStreak > 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-small text-apple-amber mt-1">
                <Flame size={14} /> Fajr on time: {fajrStreak} days in a row
              </motion.p>
            )}
          </div>
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => togglePrayer(today, 'fajr', true)} className="btn-primary !bg-apple-green hover:!bg-green-600 flex items-center gap-1">
              <Check size={14} /> Yes
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => togglePrayer(today, 'fajr', false)} className="btn-ghost text-apple-red flex items-center gap-1">
              <X size={14} /> No
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Daily Prayer View */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label">Prayer Times — {getFormattedDate()}</div>
            {nextPrayer && countdown && (
              <motion.span key={countdown} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="badge-amber flex items-center gap-1 mt-1">
                <Clock size={12} /> {nextPrayer.name} in {countdown}
              </motion.span>
            )}
          </div>
          <motion.div key={doneCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-right">
            <span className="text-subheading font-bold text-apple-blue">{doneCount}/5</span>
            <span className="text-small text-apple-muted ml-1">prayers</span>
          </motion.div>
        </div>
        <div className="space-y-2">
          {prayerNames.map((p, i) => (
            <PrayerRow key={p} prayerName={p} scheduledTime={prayerTimes?.[p]}
              isNext={nextPrayer?.name === p} countdown={nextPrayer?.name === p ? countdown : null} index={i} />
          ))}
        </div>
      </div>

      {/* Weekly Heatmap */}
      <div className="card">
        <div className="section-label mb-4">Prayer Heatmap (Last 4 Weeks)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr><th className="p-1"></th>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <th key={d} className="text-center text-apple-muted font-medium p-1 text-micro">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prayerNames.map((pn, pi) => (
                <tr key={pn}>
                  <td className="text-apple-muted font-medium p-1 text-micro">{prayerLabels[pn]}</td>
                  {heatmapData.map(week => (
                    <td key={week[0]?.date || pi} className="text-center p-1">
                      {week.map(day => {
                        if (!day) return <span key="e" className="inline-block w-5 h-5" />
                        const done = day.prayers[pi]
                        return (
                          <motion.span key={day.date} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: pi * 0.02 }}
                            className={`inline-block w-5 h-5 rounded-sm ${done === 1 ? 'bg-apple-green' : done === 0 ? 'bg-apple-red/30' : 'bg-apple-surface'}`}
                            title={`${day.date} - ${prayerLabels[pn]}: ${done === 1 ? 'Done' : done === 0 ? 'Missed' : 'No data'}`} />
                        )
                      })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats && (
          <div className="mt-4 pt-3 border-t border-apple-border flex items-center gap-4 text-small text-apple-muted">
            <span>Week completion: <strong className="text-apple-text ">{stats.completionRate || 0}%</strong></span>
            <span>Prayers logged: {stats.done}/{stats.total}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
