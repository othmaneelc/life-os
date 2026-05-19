import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, X, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { usePomodoroStore } from '../store/pomodoroStore'
import toast from 'react-hot-toast'

const POMODORO_MIN = 25
const POMODORO_SEC = POMODORO_MIN * 60

export default function PomodoroTimer() {
  const [minimized, setMinimized] = useState(true)
  const [timeLeft, setTimeLeft] = useState(POMODORO_SEC)
  const [running, setRunning] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const intervalRef = useRef(null)
  const addSession = usePomodoroStore(s => s.addSession)
  const pausedRef = useRef(false)

  const startTimer = useCallback(() => {
    if (running) return
    pausedRef.current = false
    setRunning(true)
  }, [running])

  const pauseTimer = useCallback(() => {
    pausedRef.current = true
    setRunning(false)
  }, [])

  const resetTimer = useCallback(() => {
    pausedRef.current = false
    setRunning(false)
    setTimeLeft(POMODORO_SEC)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running])

  useEffect(() => {
    if (timeLeft > 0 || pausedRef.current) return
    addSession({ duration_min: POMODORO_MIN, task_title: taskTitle, completed: true })
    toast.success('Pomodoro complete! Take a break.')
    try {
      if (Notification.permission === 'granted') new Notification('Pomodoro Complete!', { body: 'Great focus session. Take a 5 min break.' })
    } catch {}
    setRunning(false)
    setTimeLeft(POMODORO_SEC)
  }, [timeLeft, taskTitle, addSession])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const progress = ((POMODORO_SEC - timeLeft) / POMODORO_SEC) * 100
  const circumference = 2 * Math.PI * 28

  return (
    <AnimatePresence>
      {minimized ? (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setMinimized(false)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-apple-blue text-white shadow-lg flex items-center justify-center"
          title="Pomodoro Timer"
        >
          <TimerIcon size={20} />
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-40 bg-apple-elevated rounded-card shadow-apple-hover border border-apple-border w-64 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-small font-semibold text-apple-text">Pomodoro</span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { resetTimer(); setMinimized(true) }} className="p-0.5 hover:bg-apple-surface rounded">
              <X size={14} className="text-apple-muted" />
            </motion.button>
          </div>

          <div className="relative flex justify-center mb-3">
            <svg width="64" height="64" viewBox="0 0 64 64" className="transform -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--timer-ring-bg)" strokeWidth="4" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--timer-ring-progress)" strokeWidth="4"
                strokeDasharray={circumference} strokeDashoffset={circumference - (progress / 100) * circumference}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-heading font-bold text-apple-text font-mono tabular-nums">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
            </div>
          </div>

          <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
            placeholder="What are you working on?"
            className="input-field text-small text-center mb-3" />

          <div className="flex justify-center gap-2">
            {!running ? (
              <motion.button whileTap={{ scale: 0.9 }} onClick={startTimer} className="btn-primary flex items-center gap-1 text-small px-4">
                <Play size={14} /> Start
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.9 }} onClick={pauseTimer} className="btn-ghost flex items-center gap-1 text-small border border-apple-border px-4">
                <Pause size={14} /> Pause
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={resetTimer} className="btn-ghost flex items-center gap-1 text-small px-3">
              <RotateCcw size={14} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
