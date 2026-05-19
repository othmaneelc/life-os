import { memo } from 'react'
import { motion } from 'framer-motion'

function StatCard({ value, label, icon, color = 'text-apple-muted', index = 0 }) {
  const Icon = icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="card flex items-center gap-4"
    >
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-apple-surface flex-shrink-0`}>
          <Icon size={18} className={color} />
        </div>
      )}
      <div>
        <div className="text-heading font-semibold text-apple-text leading-none tracking-tight tabular-nums">{value}</div>
        <div className="text-small text-apple-muted mt-0.5">{label}</div>
      </div>
    </motion.div>
  )
}

export default memo(StatCard)
