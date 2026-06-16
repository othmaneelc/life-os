import { motion, AnimatePresence } from 'framer-motion'
import { Award, Star, X } from 'lucide-react'
import { useGamificationStore } from '../store/gamificationStore'

const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 300 - 150,
  y: Math.random() * -200 - 50,
  rotation: Math.random() * 720 - 360,
  color: ['#FFD700', '#FF6B6B', '#40A9FF', '#34C759', '#AF52DE', '#FF9F0A'][Math.floor(Math.random() * 6)],
  size: Math.random() * 6 + 4,
}))

export default function LevelUpNotification() {
  const showLevelUp = useGamificationStore(s => s.showLevelUp)
  const levelUpData = useGamificationStore(s => s.levelUpData)
  const dismissLevelUp = useGamificationStore(s => s.dismissLevelUp)

  return (
    <AnimatePresence>
      {showLevelUp && levelUpData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiPieces.map(piece => (
              <motion.div
                key={piece.id}
                initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0 }}
                animate={{
                  opacity: [1, 1, 0],
                  x: piece.x,
                  y: piece.y,
                  rotate: piece.rotation,
                  scale: [0, 1.2, 1],
                }}
                transition={{ duration: 1.5, delay: Math.random() * 0.3, ease: 'easeOut' }}
                className="absolute left-1/2 top-1/2 rounded-sm"
                style={{
                  width: piece.size,
                  height: piece.size,
                  background: piece.color,
                }}
              />
            ))}
          </div>

          {/* Main card */}
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 22 }}
            className="pointer-events-auto relative max-w-sm w-full mx-4"
            onClick={dismissLevelUp}
          >
            <div className="card-glass text-center p-8 shadow-2xl" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={dismissLevelUp}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-muted)]" aria-label="Dismiss notification"
              >
                <X size={14} />
              </motion.button>

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <Award size={28} className="text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-xl font-bold text-[var(--text-primary)] mb-1"
              >
                Level Up!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-[var(--text-muted)] text-body mb-4"
              >
                You reached <strong style={{ color: 'var(--accent)' }}>Level {levelUpData.level}</strong>
              </motion.p>

              {levelUpData.newAchievements?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-center gap-1.5 text-small text-[var(--text-muted)] mb-2">
                    <Star size={12} />
                    <span>New achievements unlocked</span>
                  </div>
                  {levelUpData.newAchievements.map((ach, i) => (
                    <motion.div
                      key={ach.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + i * 0.1 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'var(--bg-surface)' }}
                    >
                      <span className="text-lg">{ach.icon || '🏆'}</span>
                      <div className="text-left">
                        <p className="text-small font-medium text-[var(--text-primary)]">{ach.title}</p>
                        <p className="text-micro text-[var(--text-muted)]">{ach.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
