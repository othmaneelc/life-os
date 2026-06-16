import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Sparkles, BarChart3, CheckCircle2, Brain, DollarSign, BookOpen, Target, Zap } from 'lucide-react'
import { useWeeklyReview } from '../store/weeklyStore'
import { useThemeStore } from '../store/themeStore'

export default function BlackMirror() {
  const { data, isLoading } = useWeeklyReview()
  const theme = useThemeStore(s => s.theme)
  const isDark = theme === 'dark' || theme === 'monk' || theme === 'night'

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="w-48 h-8 bg-apple-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="card p-4 h-24"><div className="w-16 h-4 bg-apple-surface rounded animate-pulse" /></div>)}
        </div>
        <div className="card p-6 h-48"><div className="w-full h-full bg-apple-surface rounded animate-pulse" /></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="text-heading text-apple-muted mb-2">No data yet this week</div>
        <p className="text-small text-apple-muted">Complete your daily reviews, prayers, and habits to see your weekly report.</p>
      </div>
    )
  }

  const scoreColor = data.score >= 80 ? 'text-apple-green' : data.score >= 60 ? 'text-apple-amber' : 'text-apple-red'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-semibold ">Black Mirror</h1>
          <p className="text-small text-apple-muted">Weekly Review — {data.period?.start} to {data.period?.end}</p>
        </div>
        <div className={`text-4xl font-bold ${scoreColor}`}>{data.score}<span className="text-lg text-apple-muted">/100</span></div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Brain, label: 'Avg Energy', value: data.energy?.avg ?? '—', trend: data.energy?.trend, color: 'text-apple-blue' },
          { icon: CheckCircle2, label: 'Habit Rate', value: data.habits?.rate != null ? `${data.habits.rate}%` : '—', color: 'text-apple-green' },
          { icon: BookOpen, label: 'Prayer Rate', value: data.prayers?.rate != null ? `${data.prayers.rate}%` : '—', color: 'text-apple-purple' },
          { icon: Target, label: 'Tasks Done', value: data.tasks?.done ?? 0, color: 'text-apple-amber' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
            className="card p-3">
            <stat.icon size={18} className={stat.color + ' mb-1 opacity-75'} />
            <div className="flex items-center gap-1">
              <div className="text-heading font-bold ">{stat.value}</div>
              {stat.trend != null && (
                stat.trend > 0 ? <TrendingUp size={14} className="text-apple-green" /> :
                stat.trend < 0 ? <TrendingDown size={14} className="text-apple-red" /> : null
              )}
            </div>
            <div className="text-micro text-apple-muted">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-apple-amber" />
            <span className="text-small font-semibold ">Finance</span>
          </div>
          <div className="space-y-2 text-small">
            <div className="flex justify-between"><span className="text-apple-muted">Income</span><span className="font-medium text-apple-green">${(data.finance?.income || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-apple-muted">Expenses</span><span className="font-medium text-apple-red">${(data.finance?.expense || 0).toLocaleString()}</span></div>
            <div className="flex justify-between pt-1 border-t border-apple-border"><span className="text-apple-muted">Net</span><span className={`font-bold ${(data.finance?.net || 0) >= 0 ? 'text-apple-green' : 'text-apple-red'}`}>${(data.finance?.net || 0).toLocaleString()}</span></div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-apple-blue" />
            <span className="text-small font-semibold ">Pomodoro</span>
          </div>
          <div className="space-y-2 text-small">
            <div className="flex justify-between"><span className="text-apple-muted">Sessions</span><span className="font-medium">{data.pomodoro?.sessions || 0}</span></div>
            <div className="flex justify-between"><span className="text-apple-muted">Focus Time</span><span className="font-medium">{data.pomodoro?.minutes || 0} min</span></div>
            <div className="flex justify-between"><span className="text-apple-muted">Avg Mood</span><span className="font-medium">{data.mood?.avg ?? '—'}/5</span></div>
          </div>
        </div>
      </div>

      {/* Energy Trend */}
      {data.energy?.days?.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-apple-blue" />
            <span className="text-small font-semibold ">Energy Trend</span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {data.energy.days.map((d, i) => {
              const pct = d.energy ? (d.energy / 5) * 100 : 0
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }}
                    className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: d.energy >= 3 ? 'var(--success)' : 'var(--warning)' }} />
                  <span className="text-[9px] text-apple-muted">{d.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Habits & Best Streak */}
      {data.habits?.bestStreak && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-apple-green" />
            <span className="text-small font-semibold ">Best Streak</span>
          </div>
          <p className="text-body"><span className="font-bold">{data.habits.bestStreak.name}</span> — {data.habits.bestStreak.streak} day streak</p>
        </div>
      )}

      {/* AI Summary */}
      {data.aiSummary && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-apple-muted" />
            <span className="text-small font-semibold ">AI Analysis</span>
          </div>
          <div className="text-small text-apple-text p-3 rounded-md bg-apple-surface leading-relaxed">
            {data.aiSummary}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
