import { memo } from 'react'
import { Activity, CheckCircle2 } from 'lucide-react'

const QuickCheck = memo(function QuickCheck({ todayHabits, toggleLog, today }) {
  return (
    <div className="widget-glass widget-glow-border p-5" style={{ animation: 'widgetEnterRight 0.5s ease forwards', animationDelay: '0.4s' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
          <Activity size={13} className="text-[var(--accent)]" />
        </div>
        <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Check</span>
      </div>
      <div className="space-y-1">
        {todayHabits.slice(0, 5).map((h, i) => (
          <label
            key={h.id}
            className="flex items-center gap-2.5 py-1.5 px-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ animation: 'fadeSlideIn 0.3s ease forwards', animationDelay: `${i * 0.05}s`, opacity: 0 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all active:scale-75 ${h.done_today ? 'border-transparent' : ''}`}
              style={{ background: h.done_today ? 'var(--success)' : 'transparent', borderColor: h.done_today ? 'var(--success)' : 'var(--border-color)' }}
              onClick={() => toggleLog(h.id, today, !h.done_today)}
            >
              {h.done_today && <CheckCircle2 size={10} className="text-white" />}
            </div>
            <span className={`text-small flex-1 transition-colors ${h.done_today ? 'line-through' : ''}`} style={{ color: h.done_today ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{h.name}</span>
          </label>
        ))}
      </div>
      {todayHabits.length > 5 && (
        <p className="text-micro text-center mt-2" style={{ color: 'var(--text-muted)' }}>+{todayHabits.length - 5} more</p>
      )}
    </div>
  )
})

export default QuickCheck
