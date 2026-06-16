import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Play, Pause, RotateCcw, Coffee, CheckSquare, Clock } from 'lucide-react'

const QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "Focus is a matter of deciding what things you're not going to do. — John Carmack",
  "It's not that I'm so smart, it's just that I stay with problems longer. — Albert Einstein",
  "Do the hard jobs first. The easy jobs will take care of themselves. — Dale Carnegie",
  "You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
  "The way to get started is to quit talking and begin doing. — Walt Disney",
  "Concentrate all your thoughts upon the work at hand. — Alexander Graham Bell",
  "It always seems impossible until it's done. — Nelson Mandela",
  "Action is the foundational key to all success. — Pablo Picasso",
  "Small daily improvements over time lead to stunning results. — Robin Sharma",
  "Your focus determines your reality. — George Lucas",
]

const WORK_SEC = 25 * 60
const BREAK_SEC = 5 * 60

function saveSession(taskTitle) {
  fetch('/api/pomodoro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      task_title: taskTitle || 'Focus session',
      duration_min: 25,
      completed: true,
      started_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    }),
  }).catch(() => {})
}

function fetchTasks() {
  return fetch('/api/tasks').then(r => r.json()).then(d => Array.isArray(d) ? d : d?.tasks || []).catch(() => [])
}

export default function FocusMode({ onClose }) {
  const [timeLeft, setTimeLeft] = useState(WORK_SEC)
  const [running, setRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [selectedTask, setSelectedTask] = useState('')
  const [showTasks, setShowTasks] = useState(false)
  const [tasks, setTasks] = useState([])
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const intervalRef = useRef(null)

  const totalTime = isBreak ? BREAK_SEC : WORK_SEC
  const pct = ((totalTime - timeLeft) / totalTime) * 100
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  // Load tasks on open
  useEffect(() => {
    fetchTasks().then(setTasks)
  }, [])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.code === 'Space') { e.preventDefault(); setRunning(r => !r) }
      if (e.key === 'r' || e.key === 'R') { setRunning(false); setTimeLeft(isBreak ? BREAK_SEC : WORK_SEC) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, isBreak])

  // Timer
  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          if (!isBreak) {
            setCompleted(c => c + 1)
            saveSession(selectedTask)
            if (Notification.permission === 'granted') {
              new Notification('Focus session complete!', { body: `Great work! Time for a ${BREAK_SEC / 60}-minute break.` })
            }
            setIsBreak(true)
            return BREAK_SEC
          } else {
            setIsBreak(false)
            if (Notification.permission === 'granted') {
              new Notification('Break over!', { body: 'Ready for another focus session?' })
            }
            return WORK_SEC
          }
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, isBreak, selectedTask])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  function reset() { setRunning(false); setIsBreak(false); setTimeLeft(WORK_SEC) }
  const accent = isBreak ? 'var(--accent-green)' : 'var(--accent)'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'var(--focus-bg, rgba(0,0,0,0.95))', backdropFilter: 'blur(24px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-6 relative z-10" onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute -top-2 -right-2 p-2 rounded-full transition-colors" style={{ color: 'var(--text-tertiary, rgba(255,255,255,0.3))' }} aria-label="Close focus mode"
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary, rgba(255,255,255,0.7))'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary, rgba(255,255,255,0.3))'}>
          <X size={20} />
        </button>

        {/* Mode label */}
        <div className="flex items-center gap-2">
          {isBreak ? <Coffee size={16} color={accent} /> : <Sparkles size={16} color={accent} />}
          <span className="text-sm font-medium" style={{ color: isBreak ? accent : 'var(--text-tertiary, rgba(255,255,255,0.4))' }}>
            {isBreak ? 'Break time' : 'Deep work'}
          </span>
        </div>

        {/* Timer ring */}
        <div className="relative flex items-center justify-center">
          <svg width="240" height="240" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="120" cy="120" r="100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="120" cy="120" r="100" fill="none" stroke={accent} strokeWidth="3"
              strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 100}`}
              strokeDashoffset={`${(1 - pct / 100) * 2 * Math.PI * 100}`}
              style={{ transition: 'stroke-dashoffset 0.5s linear', filter: `drop-shadow(0 0 8px ${accent}40)` }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-7xl font-bold tabular-nums tracking-tight" style={{ color: 'white', textShadow: `0 0 40px ${accent}30` }}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-xs mt-2 tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {isBreak ? 'break' : 'focus'}
            </span>
          </div>
        </div>

        {/* Task selector */}
        <div className="relative">
          <button onClick={() => setShowTasks(!showTasks)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
            <CheckSquare size={14} />
            <span>{selectedTask || 'Select task...'}</span>
          </button>
          <AnimatePresence>
            {showTasks && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute bottom-full mb-2 left-1/2 w-64 rounded-xl overflow-hidden z-50"
                style={{ transform: 'translateX(-50%)', background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
                <div className="p-2 max-h-48 overflow-y-auto">
                  <button onClick={() => { setSelectedTask(''); setShowTasks(false) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    No task
                  </button>
                  {tasks.filter(t => t.status !== 'done').slice(0, 10).map(t => (
                    <button key={t.id} onClick={() => { setSelectedTask(t.title); setShowTasks(false) }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors"
                      style={{ color: selectedTask === t.title ? accent : 'rgba(255,255,255,0.8)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {t.title}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setRunning(r => !r)}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}40)`, border: `1px solid ${accent}30` }}>
            {running ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 2 }} />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={reset}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
            <RotateCcw size={16} />
          </motion.button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            <span>{completed} session{completed !== 1 ? 's' : ''}</span>
          </div>
          {completed > 0 && (
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} />
              <span>{completed * 25} min focused</span>
            </div>
          )}
        </div>

        {/* Quote */}
        <p className="text-xs text-center max-w-sm leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.12)' }}>
          &ldquo;{quote}&rdquo;
        </p>

        {/* Hints */}
        <div className="flex items-center gap-3 text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.1)' }}>
          <span>Space — play/pause</span>
          <span>&middot;</span>
          <span>R — reset</span>
          <span>&middot;</span>
          <span>Esc — close</span>
        </div>
      </motion.div>
    </div>
  )
}
