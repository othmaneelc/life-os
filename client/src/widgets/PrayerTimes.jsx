import { memo } from 'react'
import { Clock as ClockIcon, Flame } from 'lucide-react'
import PrayerRow from '../components/PrayerRow'
import { prayerNames } from '../utils/formatters'

const PrayerTimes = memo(function PrayerTimes({ prayerTimes, nextPrayer, countdown, prayerDone, fajrStreak }) {
  return (
    <div className="widget-glass widget-glow-border p-5" style={{ animation: 'widgetEnterLeft 0.5s ease forwards', animationDelay: '0.35s' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-small font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <ClockIcon size={13} style={{ color: 'var(--text-muted)' }} /> Prayer Times
        </span>
        {nextPrayer && countdown && (
          <span className="flex items-center gap-1 text-micro glass-sm px-2 py-1 rounded-full" style={{ color: 'var(--text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', animation: 'pulseDot 2s ease-in-out infinite' }} /> {nextPrayer.name} in {countdown}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {prayerNames.map((p, i) => (
          <PrayerRow key={p} prayerName={p} scheduledTime={prayerTimes?.[p]}
            isNext={nextPrayer?.name === p} countdown={nextPrayer?.name === p ? countdown : null} index={i} />
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 pt-2 text-small" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
        <span>Done: <strong style={{ color: 'var(--text-primary)' }}>{prayerDone}/5</strong></span>
        {fajrStreak > 0 && <span className="flex items-center gap-1" style={{ color: 'var(--warning)' }}><Flame size={12} /> Fajr: {fajrStreak}d</span>}
      </div>
    </div>
  )
})

export default PrayerTimes
