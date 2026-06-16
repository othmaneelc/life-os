import { motion } from 'framer-motion'
import { TrendingUp, Sparkles, Brain, CheckCircle2, XCircle, Sun, Moon } from 'lucide-react'
import { usePatterns } from '../store/patternStore'

export default function PatternIntelligence() {
  const { data, isLoading } = usePatterns()

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-apple-muted" />
          <span className="text-small font-semibold">Pattern Intelligence</span>
        </div>
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-8 bg-apple-surface rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-apple-purple" />
        <span className="text-small font-semibold">Pattern Intelligence</span>
      </div>

      <div className="space-y-3">
        {/* Habit Streaks */}
        {data.habits?.bestStreaks?.length > 0 && (
          <div>
            <div className="text-micro text-apple-muted mb-1">Best Habit Streaks (30d)</div>
            <div className="space-y-1">
              {data.habits.bestStreaks.slice(0, 3).map((h, i) => (
                <div key={h.id || i} className="flex items-center gap-2 text-small">
                  <CheckCircle2 size={12} className="text-apple-green shrink-0" />
                  <span className="font-medium">{h.name}</span>
                  <span className="text-apple-muted ml-auto">{h.streak} days</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Skipped */}
        {data.habits?.mostSkipped?.length > 0 && (
          <div>
            <div className="text-micro text-apple-muted mb-1">Most Skipped Habits</div>
            <div className="space-y-1">
              {data.habits.mostSkipped.slice(0, 3).map((h, i) => (
                <div key={h.id || i} className="flex items-center gap-2 text-small">
                  <XCircle size={12} className="text-apple-red shrink-0" />
                  <span className="font-medium">{h.name}</span>
                  <span className="text-apple-muted ml-auto">{h.skipped} skips</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prayer Consistency */}
        {data.prayers?.consistency?.length > 0 && (
          <div>
            <div className="text-micro text-apple-muted mb-1">Prayer Consistency (7d)</div>
            <div className="space-y-1">
              {data.prayers.consistency.map((p, i) => (
                <div key={p.prayer_name || i} className="flex items-center gap-2 text-small">
                  <Moon size={12} className="text-apple-blue shrink-0" />
                  <span className="capitalize w-14">{p.prayer_name}</span>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(p.rate || 0, 4)}%` }}
                    className="h-2 rounded-full bg-apple-green/60" style={{ width: `${Math.max(p.rate || 0, 4)}%` }} />
                  <span className="text-apple-muted ml-auto">{p.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Energy Correlation */}
        {data.correlations?.energyWithFajr?.avg_energy && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-apple-surface">
              <div className="flex items-center gap-1 mb-1">
                <Sun size={10} className="text-apple-amber" />
                <span className="text-micro text-apple-muted">With Fajr</span>
              </div>
              <div className="text-small font-bold text-apple-green">{parseFloat(data.correlations.energyWithFajr.avg_energy).toFixed(1)}/5</div>
              <div className="text-micro text-apple-muted">{data.correlations.energyWithFajr.days} days</div>
            </div>
            <div className="p-2 rounded-md bg-apple-surface">
              <div className="flex items-center gap-1 mb-1">
                <Sun size={10} className="text-apple-muted" />
                <span className="text-micro text-apple-muted">Without Fajr</span>
              </div>
              <div className="text-small font-bold text-apple-red">{data.correlations.energyWithoutFajr?.avg_energy ? parseFloat(data.correlations.energyWithoutFajr.avg_energy).toFixed(1) : '—'}/5</div>
              <div className="text-micro text-apple-muted">{data.correlations.energyWithoutFajr?.days || 0} days</div>
            </div>
          </div>
        )}

        {/* Best Day of Week */}
        {data.correlations?.bestDayOfWeek && (
          <div className="flex items-center gap-2 text-small">
            <TrendingUp size={14} className="text-apple-green" />
            <span>Best day: <strong>{data.correlations.bestDayOfWeek.day_name}</strong> — {parseFloat(data.correlations.bestDayOfWeek.avg_energy).toFixed(1)}/5 energy</span>
          </div>
        )}

        {/* AI Insight */}
        {data.aiInsight && (
          <div className="p-3 rounded-md bg-apple-surface mt-2">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles size={12} className="text-apple-purple" />
              <span className="text-micro text-apple-muted">AI Insight</span>
            </div>
            <p className="text-small text-apple-text leading-relaxed">{data.aiInsight}</p>
          </div>
        )}
      </div>
    </div>
  )
}
