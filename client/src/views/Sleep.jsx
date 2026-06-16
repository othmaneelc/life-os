import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Star, Clock, Trash2, Edit3, Plus } from 'lucide-react'
import { useSleepLogs, useCurrentSleep, useLogSleep, useDeleteSleep } from '../store/sleepStore'
import { getTodayStr, getFormattedDate } from '../utils/dateHelpers'
import { staggerContainer, staggerItem } from '../utils/animations'
import EmptyState from '../components/EmptyState'
import DataError from '../components/DataError'
import { useConfirm } from '../hooks/useConfirm'
import PageHeader from '../components/PageHeader'

function calcDuration(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let startMin = bh * 60 + bm
  let endMin = wh * 60 + wm
  if (endMin <= startMin) endMin += 1440
  return endMin - startMin
}

function formatDuration(min) {
  if (min == null) return '--'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function StarRating({ value, onChange, size = 20 }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="transition-all duration-150 hover:scale-110"
        >
          <Star
            size={size}
            fill={i <= value ? '#FF9F0A' : 'transparent'}
            color={i <= value ? '#FF9F0A' : 'var(--text-tertiary)'}
            strokeWidth={i <= value ? 0 : 1.5}
          />
        </button>
      ))}
    </div>
  )
}

export default function Sleep() {
  const today = getTodayStr()
  const { data: logs = [], isLoading: logsLoading, isError: logsError } = useSleepLogs()
  const { data: current, isLoading: currentLoading, isError: currentError } = useCurrentSleep()
  const logSleep = useLogSleep()
  const deleteSleep = useDeleteSleep()
  const { confirm, ConfirmModal } = useConfirm()

  const [bedtime, setBedtime] = useState('')
  const [wakeTime, setWakeTime] = useState('')
  const [quality, setQuality] = useState(3)
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (current) {
      setBedtime(current.bedtime || '')
      setWakeTime(current.wake_time || '')
      setQuality(current.quality || 3)
      setNotes(current.notes || '')
    } else {
      setBedtime('')
      setWakeTime('')
      setQuality(3)
      setNotes('')
    }
  }, [current])

  const duration = useMemo(() => calcDuration(bedtime, wakeTime), [bedtime, wakeTime])

  function handleSave(e) {
    e.preventDefault()
    logSleep.mutate({
      date: today,
      bedtime: bedtime || null,
      wake_time: wakeTime || null,
      duration_min: duration,
      quality,
      notes: notes || null,
    })
    setEditing(false)
  }

  async function handleDelete() {
    if (!current) return
    if (await confirm('Delete this sleep log?')) {
      deleteSleep.mutate(current.id)
      setEditing(false)
    }
  }

  function handleEditPreset(log) {
    setBedtime(log.bedtime || '')
    setWakeTime(log.wake_time || '')
    setQuality(log.quality || 3)
    setNotes(log.notes || '')
    setEditing(true)
  }

  const recentLogs = useMemo(() => {
    return logs.filter(l => l.date !== today).slice(0, 30)
  }, [logs, today])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
        <PageHeader icon={Moon} title="Sleep" subtitle={getFormattedDate()} />

        {(logsError || currentError) && (
          <DataError message="Failed to load sleep data" />
        )}
        <motion.div variants={staggerItem} className="card-glass p-5">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {current && !editing ? 'Today\'s Sleep Log' : 'Log Tonight\'s Sleep'}
              </h2>
              {current && !editing && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditing(true)} className="p-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'var(--bg-surface)', color: 'var(--accent)' }}>
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sleep-bedtime" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Moon size={14} className="inline mr-1.5" />Bedtime
                </label>
                <input
                  id="sleep-bedtime"
                  type="time"
                  value={bedtime}
                  onChange={e => setBedtime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label htmlFor="sleep-waketime" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Sun size={14} className="inline mr-1.5" />Wake Time
                </label>
                <input
                  id="sleep-waketime"
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Clock size={14} className="inline mr-1.5" />Duration
                </label>
                <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                  {duration != null ? formatDuration(duration) : '--'}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Star size={14} className="inline mr-1.5" />Quality
                </label>
                <StarRating value={quality} onChange={setQuality} />
              </div>
            </div>

            <div>
              <label htmlFor="sleep-notes" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes</label>
              <textarea
                id="sleep-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="How did you sleep?"
                className="w-full px-3 py-2.5 rounded-xl text-sm transition-colors resize-none"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={logSleep.isPending}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #5B5BD6, #5B5BD6CC)', boxShadow: '0 2px 10px #5B5BD625' }}
              >
                {logSleep.isPending ? 'Saving...' : current ? 'Update' : 'Log Sleep'}
              </button>
              {current && editing && (
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>
                  Cancel
                </button>
              )}
              {current && (
                <button type="button" onClick={handleDelete} disabled={deleteSleep.isPending} className="p-2.5 rounded-xl transition-colors" style={{ color: 'var(--danger)', background: 'var(--bg-surface)' }} aria-label="Delete sleep entry">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </form>
        </motion.div>

        <motion.div variants={staggerItem}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>History</h2>
          {recentLogs.length === 0 ? (
            <EmptyState icon="default" title="No sleep history" description="Your sleep logs will appear here once you start tracking." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {recentLogs.map((log, i) => {
                  const d = calcDuration(log.bedtime, log.wake_time)
                  return (
                    <motion.div
                      key={log.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
                      className="card-glass p-4 cursor-pointer hover:shadow-glow transition-shadow"
                      onClick={() => handleEditPreset(log)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        {log.quality && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: log.quality }, (_, i) => (
                              <Star key={i} size={10} fill="#FF9F0A" color="#FF9F0A" strokeWidth={0} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1"><Moon size={11} />{log.bedtime || '--'}</span>
                        <span className="flex items-center gap-1"><Sun size={11} />{log.wake_time || '--'}</span>
                        <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--accent)' }}>{d != null ? formatDuration(d) : '--'}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      <ConfirmModal />
      </motion.div>
    </div>
  )
}
