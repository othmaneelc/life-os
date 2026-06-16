import { memo } from 'react'
import { motion } from 'framer-motion'

const NowPlayingBar = memo(function NowPlayingBar({ currentBlock }) {
  if (!currentBlock) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card flex items-center gap-4 relative overflow-hidden p-4"
      style={{ borderLeft: `4px solid ${currentBlock.color || (currentBlock.is_google ? 'var(--success)' : 'var(--accent)')}` }}
    >
      <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${currentBlock.color || 'var(--accent)'}, transparent)` }} />

      <div className="relative flex items-center gap-3">
        <div className="relative">
          <div className="w-3 h-3 rounded-full" style={{ background: currentBlock.is_google ? 'var(--success)' : 'var(--accent)' }} />
          <motion.div
            animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full"
            style={{ background: currentBlock.is_google ? 'var(--success)' : 'var(--accent)' }}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Now: {currentBlock.title}</span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{currentBlock.start_time} — {currentBlock.end_time}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {currentBlock.is_google && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--success)', color: 'white' }}>Google</span>
            )}
            {currentBlock.block_type && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: `${currentBlock.color || 'var(--accent)'}20`, color: currentBlock.color || 'var(--text-muted)' }}>
                {currentBlock.block_type}
              </span>
            )}
            {currentBlock.subtitle && (
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{currentBlock.subtitle}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

export default NowPlayingBar
