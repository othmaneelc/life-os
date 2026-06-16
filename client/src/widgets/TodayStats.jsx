import { memo } from 'react'
import { motion } from 'framer-motion'
import { Target, CheckCircle2, Zap, Moon, Flame } from 'lucide-react'
import { AnimatedNumber } from './shared.jsx'

const TodayStats = memo(function TodayStats({ tasksDoneToday, totalTasks, habitsDone, todayHabits, prayerDone, fajrStreak, habitsStats }) {
  return (
    <div className="widget-glass widget-glow-border p-5" style={{ animation: 'widgetEnterUp 0.5s ease forwards', animationDelay: '0.3s' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
          <Target size={13} className="text-[var(--accent)]" />
        </div>
        <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Today&apos;s Stats</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><CheckCircle2 size={13} style={{ color: 'var(--success)' }} /><span className="text-small" style={{ color: 'var(--text-primary)' }}>Tasks done</span></div>
          <span className="text-body font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={tasksDoneToday} />/{totalTasks}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden progress-shimmer" style={{ background: 'var(--bg-surface)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${(tasksDoneToday / totalTasks) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: 'var(--success)' }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Zap size={13} style={{ color: 'var(--warning)' }} /><span className="text-small" style={{ color: 'var(--text-primary)' }}>Habits checked</span></div>
          <span className="text-body font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={habitsDone} />/{todayHabits.length}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden progress-shimmer" style={{ background: 'var(--bg-surface)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${todayHabits.length > 0 ? (habitsDone / todayHabits.length) * 100 : 0}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: 'var(--warning)' }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Moon size={13} style={{ color: 'var(--purple)' }} /><span className="text-small" style={{ color: 'var(--text-primary)' }}>Prayers done</span></div>
          <span className="text-body font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}><AnimatedNumber value={prayerDone} />/5</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden progress-shimmer" style={{ background: 'var(--bg-surface)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${(prayerDone / 5) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full" style={{ background: 'var(--purple)' }} />
        </div>
        {fajrStreak > 0 && (
          <div className="flex items-center gap-1.5 text-small" style={{ color: 'var(--text-muted)' }}>
            <Flame size={12} style={{ color: 'var(--warning)' }} />
            Fajr streak: {fajrStreak}d
          </div>
        )}
        {habitsStats?.weekCompletion && (
          <div className="flex items-center justify-between text-small" style={{ color: 'var(--text-muted)' }}>
            <span>Week completion</span>
            <span className="font-medium">{habitsStats.weekCompletion}%</span>
          </div>
        )}
      </div>
    </div>
  )
})

export default TodayStats
