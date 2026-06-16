import { useState, useEffect, memo } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import Modal from './Modal'
import { useTodayReview, useSaveReview } from '../store/reviewStore'
import { useTaskStore, useTasks } from '../store/taskStore'
import { getTodayStr } from '../utils/dateHelpers'
import toast from 'react-hot-toast'

const DailyReviewModal = memo(function DailyReviewModal({ open, onClose }) {
  const today = getTodayStr()
  const [energy, setEnergy] = useState(3)
  const [wins, setWins] = useState('')
  const [lessons, setLessons] = useState('')
  const [tomorrowFocus, setTomorrowFocus] = useState('')
  const [completed, setCompleted] = useState(false)

  const { data: todayReview } = useTodayReview(open ? today : null)
  const save = useSaveReview()
  const tasks = useTaskStore(s => s.tasks) || []
  const { refetch: refetchTasks } = useTasks()

  useEffect(() => {
    if (!open) return
    refetchTasks()
  }, [open])

  useEffect(() => {
    if (todayReview) {
      setEnergy(todayReview.energy || 3)
      setWins(todayReview.wins || '')
      setLessons(todayReview.lessons || '')
      setTomorrowFocus(todayReview.tomorrow_focus || '')
      setCompleted(!!todayReview.completed)
    }
  }, [todayReview])

  const todayTasksDone = tasks.filter(t => t.status === 'done' && t.completed_at?.startsWith(today))
  const todayTaskTitles = todayTasksDone.map(t => t.title).join('\n')

  function handleSave() {
    save.mutate({ date: today, energy, wins, lessons, tomorrow_focus: tomorrowFocus, completed }, {
      onSuccess: () => { toast.success(completed ? 'Day completed!' : 'Review saved'); onClose() }
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Daily Review" maxWidth="lg">
      <div className="space-y-3">
        <div>
          <label className="section-label block mb-1">Tasks completed today ({todayTasksDone.length})</label>
          <div className="text-small p-2 rounded-input min-h-[40px] whitespace-pre-line" style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>
            {todayTaskTitles || 'No tasks completed yet'}
          </div>
        </div>

        <div>
          <label className="section-label block mb-1.5">Energy level</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <motion.button key={n} whileTap={{ scale: 1.1 }} onClick={() => setEnergy(n)}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-base transition-colors ${energy === n ? 'text-white' : ''}`}
                style={energy === n ? { background: 'var(--accent)' } : { background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                {['😴', '🙁', '😐', '😊', '🔥'][n - 1]}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <label className="section-label block mb-1">3 wins today</label>
          <textarea value={wins} onChange={e => setWins(e.target.value)} placeholder="What went well?" className="input-field min-h-[60px] resize-none" />
        </div>

        <div>
          <label className="section-label block mb-1">1 lesson learned</label>
          <textarea value={lessons} onChange={e => setLessons(e.target.value)} placeholder="What could be better?" className="input-field min-h-[60px] resize-none" />
        </div>

        <div>
          <label className="section-label block mb-1">Tomorrow's #1 priority</label>
          <input type="text" value={tomorrowFocus} onChange={e => setTomorrowFocus(e.target.value)} placeholder="What matters most tomorrow?" className="input-field" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)}
            className="w-4 h-4 rounded border-apple-border text-apple-green focus:ring-apple-green/30 cursor-pointer" />
          <span className="text-body" style={{ color: 'var(--text-primary)' }}>Mark this day as complete</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Check size={14} /> {completed ? 'Complete Day' : 'Save Review'}
        </motion.button>
      </div>
    </Modal>
  )
})

export default DailyReviewModal
