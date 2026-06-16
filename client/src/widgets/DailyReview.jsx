import { memo } from 'react'
import { Brain, ChevronRight } from 'lucide-react'

const DailyReview = memo(function DailyReview({ todayReviewEntry, onOpen }) {
  return (
    <div className="widget-glass widget-glow-border p-5 relative overflow-hidden" style={{ animation: 'widgetEnterUp 0.5s ease forwards', animationDelay: '0.5s' }}>
      <div className="absolute inset-0 opacity-[0.02] animate-gradient-shift pointer-events-none" style={{ background: 'var(--gradient-success)', backgroundSize: '200% 200%' }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(175,82,222,0.15)' }}>
              <Brain size={13} style={{ color: 'var(--purple)' }} />
            </div>
            <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Review</span>
          </div>
          <button onClick={onOpen}
            className="btn-ripple flex items-center gap-1 px-3 py-1.5 text-small font-medium rounded-lg hover-scale"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >{todayReviewEntry?.completed ? 'View' : 'Reflect'} <ChevronRight size={13} /></button>
        </div>
        {todayReviewEntry?.completed ? (
          <div className="space-y-2 text-small">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--text-muted)' }}>Energy:</span>
              <span>{['😴','🙁','😐','😊','🔥'][(todayReviewEntry.energy || 3) - 1]}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Wins:</span>
              <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>{todayReviewEntry.wins || '—'}</p>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Tomorrow:</span>
              <p className="mt-0.5" style={{ color: 'var(--text-primary)' }}>{todayReviewEntry.tomorrow_focus || '—'}</p>
            </div>
          </div>
        ) : (
          <p className="text-body" style={{ color: 'var(--text-muted)' }}>End your day with reflection. What went well?</p>
        )}
      </div>
    </div>
  )
})

export default DailyReview
