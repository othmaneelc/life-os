import { memo } from 'react'
import { TrendingUp, Building2 } from 'lucide-react'
import { RevenueWidget, AgencyPipeline } from './shared.jsx'

const RevenuePipeline = memo(function RevenuePipeline({ transactions, clients }) {
  return (
    <div className="space-y-4" style={{ animation: 'widgetEnterRight 0.5s ease forwards', animationDelay: '0.15s' }}>
      <div className="widget-glass widget-glow-border p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <TrendingUp size={13} className="text-[var(--accent)]" />
          </div>
          <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Revenue</span>
        </div>
        <RevenueWidget transactions={transactions} />
      </div>
      <div className="widget-glass p-5" style={{ borderLeft: '3px solid var(--accent)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <Building2 size={13} className="text-[var(--accent)]" />
          </div>
          <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Pipeline</span>
        </div>
        <AgencyPipeline clients={clients} />
      </div>
    </div>
  )
})

export default RevenuePipeline
