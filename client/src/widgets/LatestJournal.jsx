import { memo } from 'react'
import { BookOpen, Quote } from 'lucide-react'
import { TimeAgo } from './shared.jsx'

const LatestJournal = memo(function LatestJournal({ latestEntry, randomMotivation }) {
  return (
    <div className="widget-glass p-5 relative overflow-hidden" style={{ animation: 'widgetEnterUp 0.5s ease forwards', animationDelay: '0.45s', background: 'var(--gradient-hero)' }}>
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ background: 'var(--gradient-accent)', backgroundSize: '200% 200%' }} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(175,82,222,0.15)' }}>
            <BookOpen size={13} style={{ color: 'var(--purple)' }} />
          </div>
          <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Latest Journal</span>
          {latestEntry && <span className="text-micro ml-auto" style={{ color: 'var(--text-muted)' }}><TimeAgo dateStr={latestEntry.created_at} /></span>}
        </div>
        {latestEntry ? (
          <div>
            <p className="text-small font-medium" style={{ color: 'var(--text-primary)' }}>{latestEntry.date}</p>
            <p className="text-body mt-2 line-clamp-3 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{latestEntry.what_happened || 'No content'}</p>
          </div>
        ) : (
          <p className="text-small" style={{ color: 'var(--text-muted)' }}>No entries yet. Start journaling!</p>
        )}
        <div className="flex items-center gap-2 mt-3 text-micro" style={{ color: 'var(--text-muted)' }}>
          <Quote size={12} style={{ opacity: 0.5 }} />
          <span className="italic">{randomMotivation}</span>
        </div>
      </div>
    </div>
  )
})

export default LatestJournal
