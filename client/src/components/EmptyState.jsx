import { motion } from 'framer-motion'
import { Sparkles, CheckSquare, Dumbbell, BookOpen, Target, BookMarked, Wallet, Briefcase, Calendar, Bot, BarChart3, Brain, Heart } from 'lucide-react'

const icons = {
  tasks: CheckSquare,
  habits: Dumbbell,
  workouts: Dumbbell,
  journal: BookOpen,
  goals: Target,
  reading: BookMarked,
  knowledge: Brain,
  finance: Wallet,
  agency: Briefcase,
  schedule: Calendar,
  agents: Bot,
  reports: BarChart3,
  prayers: Heart,
  default: Sparkles,
}

const colors = {
  tasks: 'var(--accent)',
  habits: 'var(--warning)',
  workouts: '#5AC8FA',
  journal: '#34C759',
  goals: '#AF52DE',
  reading: '#FF3B30',
  knowledge: '#5AC8FA',
  finance: '#34C759',
  agency: '#FF9F0A',
  schedule: '#5B5BD6',
  agents: '#AF52DE',
  reports: '#FF3B30',
  prayers: '#34C759',
  default: '#5B5BD6',
}

export default function EmptyState({ icon = 'default', title, description, action, actionLabel, onAction }) {
  const Icon = icons[icon] || icons.default
  const color = colors[icon] || colors.default

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Animated icon with glow */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        className="relative mb-5"
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
          style={{ background: `${color}15`, border: `1px solid ${color}20` }}>
          <Icon size={28} style={{ color }} />
        </div>
        {/* Glow effect */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-2xl"
          style={{ background: `${color}20`, filter: 'blur(12px)' }}
        />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-lg font-semibold mb-1.5 text-center"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-sm text-center max-w-xs mb-5"
          style={{ color: 'var(--text-muted)' }}
        >
          {description}
        </motion.p>
      )}

      {/* CTA Button */}
      {action && onAction && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          whileHover={{ scale: 1.05, boxShadow: `0 4px 20px ${color}30` }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 2px 10px ${color}25` }}
        >
          {actionLabel || action}
        </motion.button>
      )}
    </motion.div>
  )
}
