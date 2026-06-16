import { lazy, Suspense, memo } from 'react'
import { Brain, Sparkles, RefreshCw } from 'lucide-react'
const MarkdownMessage = lazy(() => import('../components/MarkdownMessage'))

const AIBriefing = memo(function AIBriefing({ briefing, briefingLoading }) {
  return (
    <div className="widget-glass widget-glow-border p-5" style={{ animation: 'widgetEnterUp 0.5s ease forwards', animationDelay: '0.1s' }}>
      <div className="absolute inset-0 opacity-[0.03] animate-gradient-shift pointer-events-none" style={{ background: 'var(--gradient-accent)', backgroundSize: '200% 200%' }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
              <Brain size={15} className="text-[var(--accent)]" />
            </div>
            <div>
              <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>AI Daily Briefing</span>
              <span className="text-micro" style={{ color: 'var(--text-muted)' }}> &middot; Your personalized daily strategy</span>
            </div>
          </div>
          {briefingLoading && <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
        </div>
        <div className="text-body leading-relaxed min-h-[60px]" style={{ color: 'var(--text-primary)' }}>
          {briefing ? (
            <div className="prose-sm" style={{ color: 'var(--text-primary)' }}><Suspense fallback={<div className="h-4 w-full rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />}><MarkdownMessage content={briefing} /></Suspense></div>
          ) : briefingLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-full rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />
              <div className="h-4 w-3/4 rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />
              <div className="h-4 w-5/6 rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />
            </div>
          ) : (
            <div className="text-center py-6">
              <Sparkles size={24} className="mx-auto mb-2" style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Tap "Briefing" for a personalized daily strategy</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default AIBriefing
