import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Award, Star, Lock, CheckCircle, ChevronRight, TrendingUp } from 'lucide-react'
import { useGamificationStats, useGamificationLeaderboard } from '../store/gamificationStore'
import { modalBackdrop, modalContent } from '../utils/animations'

const rankColors = {
  1: { bg: '#FFD700', text: '#B8860B' },
  2: { bg: '#C0C0C0', text: '#71717A' },
  3: { bg: '#CD7F32', text: '#8B4513' },
}

export default function GamificationPanel({ isOpen, onClose }) {
  const { data: gData, isLoading } = useGamificationStats()
  const { data: leaderboard = [], isLoading: lbLoading, refetch: refetchLeaderboard } = useGamificationLeaderboard()
  const [activeTab, setActiveTab] = useState('overview')

  const totalXp = gData?.totalXp ?? 0
  const level = gData?.level ?? 1
  const xpForNextLevel = gData?.xpForNextLevel ?? 100
  const xpProgress = gData?.xpProgress ?? 0
  const achievements = gData?.achievements ?? []

  useEffect(() => {
    if (isOpen) refetchLeaderboard()
  }, [isOpen, refetchLeaderboard])

  const progressPct = xpForNextLevel > 0 ? Math.min((xpProgress / xpForNextLevel) * 100, 100) : 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-6"
          {...modalBackdrop}
          onClick={onClose}
        >
          <motion.div
            {...modalContent}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg max-h-[calc(100vh-6rem)] overflow-y-auto card-glass shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[var(--border-glass)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
                  <Trophy size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-body font-semibold text-[var(--text-primary)]">Gamification</h2>
                  <p className="text-small text-[var(--text-muted)]">Track your progress</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-muted)]" aria-label="Close panel"
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
              {['overview', 'achievements', 'leaderboard'].map(tab => (
                <motion.button
                  key={tab}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-small font-medium capitalize transition-all ${
                    activeTab === tab
                      ? 'text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  style={activeTab === tab ? { background: 'var(--gradient-accent)' } : {}}
                >
                  {tab}
                </motion.button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Level & XP */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Award size={18} style={{ color: 'var(--accent)' }} />
                      <span className="text-body font-semibold text-[var(--text-primary)]">Level {level}</span>
                    </div>
                    <span className="text-small font-mono font-medium" style={{ color: 'var(--accent)' }}>
                      {totalXp.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="relative w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full"
                      style={{ background: 'var(--gradient-accent)' }}
                    />
                    <div
                      className="absolute inset-0 rounded-full opacity-20"
                      style={{ background: 'var(--gradient-accent)', filter: 'blur(4px)', width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-micro text-[var(--text-muted)]">{xpProgress} XP</span>
                    <span className="text-micro text-[var(--text-muted)]">{xpForNextLevel} XP to next level</span>
                  </div>
                </div>

                {/* Quick stats */}
                {achievements.length > 0 && (
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <Star size={14} style={{ color: 'var(--accent)' }} />
                      <span className="text-small font-medium text-[var(--text-primary)]">Achievements</span>
                    </div>
                    <p className="text-[var(--text-muted)] text-small">
                      {achievements.filter(a => a.unlocked).length} / {achievements.length} unlocked
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'achievements' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                  </div>
                ) : achievements.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)] text-small">
                    <Trophy size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No achievements yet</p>
                    <p className="text-micro mt-1">Complete actions to earn achievements</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {achievements.map((ach) => (
                      <motion.div
                        key={ach.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`rounded-lg p-3 border transition-all ${
                          ach.unlocked
                            ? 'border-[var(--accent)]/20'
                            : 'border-[var(--border-color)] opacity-50'
                        }`}
                        style={{ background: ach.unlocked ? 'var(--bg-card)' : 'var(--bg-surface)' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                              ach.unlocked ? '' : 'grayscale'
                            }`}
                          >
                            {ach.icon ? (
                              <span>{ach.icon}</span>
                            ) : (
                              <Trophy size={16} style={{ color: ach.unlocked ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                            )}
                          </div>
                          {ach.unlocked ? (
                            <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                          ) : (
                            <Lock size={14} style={{ color: 'var(--text-tertiary)' }} />
                          )}
                        </div>
                        <h4 className={`text-small font-semibold mb-0.5 ${ach.unlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                          {ach.title}
                        </h4>
                        <p className="text-micro text-[var(--text-muted)] line-clamp-2">{ach.description}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                {lbLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)] text-small">
                    <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No leaderboard data yet</p>
                  </div>
                ) : (
                  leaderboard.map((entry, idx) => {
                    const rank = rankColors[idx + 1] || null
                    return (
                      <motion.div
                        key={entry.username || idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-micro font-bold flex-shrink-0"
                          style={rank ? { background: rank.bg, color: rank.text } : { background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-small font-medium text-[var(--text-primary)] truncate">
                            {entry.username || entry.name || `User ${idx + 1}`}
                          </p>
                          <p className="text-micro text-[var(--text-muted)]">Level {entry.level || 1}</p>
                        </div>
                        <span className="text-small font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                          {entry.total_xp?.toLocaleString() || 0} XP
                        </span>
                        {idx < 3 && <ChevronRight size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />}
                      </motion.div>
                    )
                  })
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
