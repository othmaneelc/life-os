import { memo } from 'react'
import { Star } from 'lucide-react'

const TopPriority = memo(function TopPriority({ topPriority, urgentTasks }) {
  return (
    <div className="widget-glass widget-glow-border p-5 relative overflow-hidden" style={{ animation: 'widgetEnterUp 0.5s ease forwards', animationDelay: '0.25s' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,159,10,0.15)' }}>
          <Star size={13} style={{ color: 'var(--warning)' }} />
        </div>
        <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Top Priority</span>
      </div>
      {topPriority ? (
        <div>
          <p className="text-subheading font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{topPriority.title}</p>
          <div className="flex items-center gap-2 mt-2">
            {topPriority.tag && <span className="badge-gray text-micro">{topPriority.tag}</span>}
            <span className="badge-gray text-micro capitalize">{topPriority.priority}</span>
          </div>
        </div>
      ) : (
        <p className="text-body" style={{ color: 'var(--text-muted)' }}>Tap ★ on a task to set priority</p>
      )}
      {urgentTasks.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)', animation: 'fadeSlideIn 0.4s ease forwards' }}>
          <p className="text-micro font-medium mb-1.5" style={{ color: 'var(--danger)' }}>Urgent</p>
          <div className="space-y-1">
            {urgentTasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-small" style={{ color: 'var(--text-primary)' }}>
                <div className="w-1 h-3 rounded-full" style={{ background: 'var(--danger)', opacity: 0.6 }} />
                <span className="truncate">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default TopPriority
