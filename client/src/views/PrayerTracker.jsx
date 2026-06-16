import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Check, Clock, MapPin, Volume2, VolumeX, Calendar, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePrayerStore, useTodayPrayers, useFajrStreak, usePrayerStats, useHeatmap, useMonthlyStats } from '../store/prayerStore'
import { usePrayerTimes } from '../hooks/usePrayerTimes'
import PrayerRow from '../components/PrayerRow'
import { getTodayStr, getFormattedDate, getWeekStart } from '../utils/dateHelpers'
import { prayerNames, prayerLabels, prayerTimeColors, prayerTimeGradients, PRAYER_METHODS } from '../utils/formatters'

function PrayerTimeCard({ name, time, color, gradient, isNext, isPast, isDone, countdown, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative overflow-hidden rounded-2xl p-4 ${isNext ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-page)]' : ''}`}
      style={{
        background: gradient,
        '--tw-ring-color': isNext ? color : 'transparent',
        boxShadow: isNext ? `0 0 24px ${color}40` : 'none',
      }}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white/90 text-lg">{prayerLabels[name]}</span>
            {isNext && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold uppercase tracking-wider">
                Next
              </span>
            )}
            {isDone && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold">
                Done ✓
              </span>
            )}
          </div>
          <div className="text-white/70 text-[13px] mt-0.5">{name === 'sunrise' ? 'Sunrise' : 'Prayer'}</div>
        </div>
        <div className="text-right">
          <div className="text-white text-2xl font-bold tracking-tight">{time || '--:--'}</div>
          {isNext && countdown && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-white/80 text-[11px] font-medium mt-0.5"
            >
              in {countdown}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function PrayerTracker() {
  const today = getTodayStr()
  const prayerTimesResult = usePrayerTimes(today)
  const { prayerTimes, nextPrayer, countdown } = prayerTimesResult
  const location = prayerTimesResult.location || { city: 'Casablanca', country: 'Morocco', method: 2 }
  const todayPrayersResult = useTodayPrayers(today)
  const fajrStreakResult = useFajrStreak()
  const statsResult = usePrayerStats(getWeekStart(), today)
  const heatmapResult = useHeatmap(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], today)
  const monthlyStatsResult = useMonthlyStats(new Date().getFullYear(), new Date().getMonth())
  const todayPrayers = todayPrayersResult.data || []
  const fajrStreak = fajrStreakResult.data || 0
  const stats = statsResult.data || null
  const heatmap = heatmapResult.data || []
  const monthlyStats = monthlyStatsResult.data || null
  const adhanEnabled = usePrayerStore(s => s.adhanEnabled)
  const togglePrayer = usePrayerStore(s => s.togglePrayer)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())



  const doneCount = todayPrayers?.filter(p => p?.done).length ?? 0

  const methodName = useMemo(() => {
    const m = PRAYER_METHODS.find(m => m.id === (location?.method || 2))
    return m ? m.name : 'ISNA'
  }, [location])

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-semibold flex items-center gap-2">
            <span className="text-2xl">🕌</span> Prayer Tracker
          </h1>
          <div className="flex items-center gap-3 text-small text-apple-muted mt-1">
            <span className="flex items-center gap-1"><MapPin size={12} /> {location.city}, {location.country}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> {getFormattedDate()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => usePrayerStore.setState(s => ({ adhanEnabled: !s.adhanEnabled }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-micro font-medium transition-colors ${adhanEnabled ? 'bg-apple-green/10 text-apple-green' : 'bg-apple-surface text-apple-muted'}`}
          >
            {adhanEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            Adhan {adhanEnabled ? 'On' : 'Off'}
          </motion.button>
        </div>
      </div>

      {/* Today's Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Prayed', value: `${doneCount}/5`, color: 'text-apple-green', icon: Check },
          { label: 'Fajr Streak', value: `${fajrStreak} days`, color: 'text-apple-amber', icon: Flame },
          { label: 'Next Prayer', value: nextPrayer ? prayerLabels[nextPrayer.name] : '--', color: 'text-apple-blue', icon: Clock },
          { label: 'Method', value: methodName.split('(')[0].trim(), color: 'text-apple-purple', icon: Sparkles },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} bg-current/5`}>
                <Icon size={18} className={item.color} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-apple-muted uppercase tracking-wider font-medium">{item.label}</div>
                <div className={`text-sm font-bold truncate ${item.color}`}>{item.value}</div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Next Prayer Highlight */}
      {nextPrayer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-5 relative overflow-hidden"
          style={{
            background: prayerTimeGradients[nextPrayer.name] || 'var(--bg-card)',
          }}
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="text-white/60 text-[11px] uppercase tracking-wider font-medium">Next Prayer</div>
              <div className="text-white text-xl font-bold mt-0.5">{prayerLabels[nextPrayer.name]}</div>
              <div className="text-white/80 text-sm mt-0.5">at {nextPrayer.time}</div>
            </div>
            <div className="text-right">
              <div className="text-white text-3xl font-bold tabular-nums">{countdown || '00:00'}</div>
              <div className="text-white/60 text-[11px] uppercase tracking-wider mt-0.5">remaining</div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            {nextPrayer && (() => {
              const now = new Date()
              const [h, m] = (nextPrayer.time || '00:00').split(':').map(Number)
              const target = new Date(); target.setHours(h, m, 0)
              const prevPrayerIdx = prayerNames.indexOf(nextPrayer.name) - 1
              let prevTime
              if (prevPrayerIdx >= 0) {
                const prev = prayerTimes?.[prayerNames[prevPrayerIdx]]
                if (prev) {
                  const [ph, pm] = prev.split(':').map(Number)
                  prevTime = new Date(); prevTime.setHours(ph, pm, 0)
                }
              }
              if (!prevTime) {
                const prev = new Date(target); prev.setHours(target.getHours() - 12)
                prevTime = prev
              }
              const total = target - prevTime
              const elapsed = now - prevTime
              const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0
              return <motion.div className="h-full bg-white/30" initial={{ width: '0%' }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
            })()}
          </div>
        </motion.div>
      )}

      {/* All Prayer Times - Beautiful Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {prayerNames.map((name, i) => (
          <PrayerTimeCard
            key={name}
            name={name}
            time={prayerTimes?.[name]}
            color={prayerTimeColors[name]}
            gradient={prayerTimeGradients[name]}
            isNext={nextPrayer?.name === name}
            isPast={(() => {
              if (!prayerTimes?.[name]) return false
              const now = new Date()
              const [h, m] = prayerTimes[name].split(':').map(Number)
              const pt = new Date(); pt.setHours(h, m, 0)
              return now > pt
            })()}
            isDone={todayPrayers?.find(p => p.prayer_name === name)?.done || false}
            countdown={nextPrayer?.name === name ? countdown : null}
            index={i}
          />
        ))}
      </div>

      {/* Prayer Actions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-label">Mark Your Prayers</div>
          <motion.div key={doneCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-right">
            <span className="text-subheading font-bold" style={{ color: 'var(--accent)' }}>{doneCount}</span>
            <span className="text-small text-apple-muted ml-1">/ 5 done</span>
          </motion.div>
        </div>
        <div className="space-y-2">
          {prayerNames.map((p, i) => (
            <PrayerRow key={p} prayerName={p} scheduledTime={prayerTimes?.[p]}
              isNext={nextPrayer?.name === p} countdown={nextPrayer?.name === p ? countdown : null} index={i} />
          ))}
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-label">Monthly Overview</div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => { if (selectedMonth === 0) { setSelectedYear(y => y - 1); setSelectedMonth(11) } else setSelectedMonth(m => m - 1) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-apple-surface transition-colors"
            >
              <ChevronLeft size={14} />
            </motion.button>
            <span className="text-small font-medium min-w-[90px] text-center">{monthLabels[selectedMonth]} {selectedYear}</span>
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => { if (selectedMonth === 11) { setSelectedYear(y => y + 1); setSelectedMonth(0) } else setSelectedMonth(m => m + 1) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-apple-surface transition-colors"
            >
              <ChevronRight size={14} />
            </motion.button>
          </div>
        </div>
        {monthlyStats ? (
          <div className="grid grid-cols-5 gap-2">
            {prayerNames.map((pn) => {
              const s = monthlyStats.stats?.[pn]
              const pct = s?.total > 0 ? Math.round((s.done / s.total) * 100) : 0
              return (
                <div key={pn} className="text-center p-2 rounded-xl" style={{ background: `${prayerTimeColors[pn]}08` }}>
                  <div className="text-[11px] text-apple-muted font-medium">{prayerLabels[pn]}</div>
                  <div className={`text-lg font-bold mt-0.5 ${pct >= 80 ? 'text-apple-green' : pct >= 50 ? 'text-apple-amber' : 'text-apple-red'}`}>
                    {pct}%
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-apple-surface mt-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className="h-full rounded-full"
                      style={{ background: prayerTimeColors[pn] }}
                    />
                  </div>
                  <div className="text-[10px] text-apple-muted mt-1">{s?.done || 0}/{s?.total || 0}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-small text-apple-muted py-4">Select a month to view stats</div>
        )}
      </div>

      {/* Heatmap */}
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
                  {(() => {
                    const weeks = []
                    for (let w = 0; w < 4; w++) {
                      const week = []
                      for (let d = 0; d < 7; d++) {
                        const date = new Date(); date.setDate(date.getDate() - (w * 7 + (6 - d)))
                        const dateStr = date.toISOString().split('T')[0]
                        const r = heatmap.find(h => h.date === dateStr && h.prayer_name === pn)
                        week.push({ date: dateStr, done: r ? r.done : null })
                      }
                      weeks.push(week)
                    }
                    return weeks.map(week => (
                      <td key={week[0]?.date} className="text-center p-1">
                        <div className="flex gap-0.5 justify-center">
                          {week.map(day => (
                            <motion.span
                              key={day.date}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: pi * 0.02 }}
                              className={`inline-block w-5 h-5 rounded-sm ${day.done === 1 ? 'bg-apple-green' : day.done === 0 ? 'bg-apple-red/30' : 'bg-apple-surface'}`}
                              title={`${day.date} - ${prayerLabels[pn]}: ${day.done === 1 ? 'Done' : day.done === 0 ? 'Missed' : 'No data'}`}
                            />
                          ))}
                        </div>
                      </td>
                    ))
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats && (
          <div className="mt-4 pt-3 border-t border-apple-border flex flex-wrap items-center gap-4 text-small text-apple-muted">
            <span>Week completion: <strong className="text-apple-text">{stats.completionRate || 0}%</strong></span>
            <span>On time: <strong className="text-apple-text">{stats.onTimeRate || 0}%</strong></span>
            <span>Prayers logged: {stats.done}/{stats.total}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
