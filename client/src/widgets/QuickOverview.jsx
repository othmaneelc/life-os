import { memo } from 'react'
import { Sparkles, Target, Zap, Moon, Users } from 'lucide-react'
import { HabitRing } from './shared.jsx'

const QuickOverview = memo(function QuickOverview({ tasksDoneToday, totalTasks, habitsDone, todayHabits, prayerDone, clients }) {
  const activeClients = clients.filter(c => c.status === 'active').length
  return (
    <div className="widget-glass widget-glow-border p-5" style={{ animation: 'widgetEnterScale 0.5s ease forwards', animationDelay: '0.55s' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,159,10,0.15)' }}>
          <Sparkles size={13} style={{ color: 'var(--warning)' }} />
        </div>
        <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Overview</span>
      </div>
      <div className="flex items-center justify-around">
        <HabitRing done={tasksDoneToday} total={totalTasks} icon={Target} />
        <HabitRing done={habitsDone} total={todayHabits.length} icon={Zap} />
        <HabitRing done={prayerDone} total={5} icon={Moon} />
        <HabitRing done={activeClients} total={clients.length} icon={Users} />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 text-center text-micro" style={{ color: 'var(--text-muted)' }}>
        <span>Tasks</span>
        <span>Habits</span>
        <span>Prayers</span>
        <span>Clients</span>
      </div>
    </div>
  )
})

export default QuickOverview
