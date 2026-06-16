import { memo } from 'react'
import { motion } from 'framer-motion'

function StatCard({ value, label, icon, color = 'var(--text-muted)', index = 0, accent }) {
  const Icon = icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
      whileHover={{ y: -4, scale: 1.02, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
      className="card flex items-center gap-4 p-4 cursor-default"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {accent && (
        <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      )}
      {Icon && (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent || 'var(--accent)'}15` }}>
          <Icon size={18} style={{ color: accent || color }} />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xl font-bold tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</div>
        <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </motion.div>
  )
}

export default memo(StatCard)
