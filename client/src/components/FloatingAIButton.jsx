import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useAIStore } from '../store/aiStore'

export default function FloatingAIButton() {
  const isOpen = useAIStore(s => s.isOpen)
  const setOpen = useAIStore(s => s.setOpen)

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 md:bottom-6 md:right-6" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(!isOpen)}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        className="relative w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--gradient-accent)',
          boxShadow: '0 4px 20px var(--accent-glow), 0 0 40px var(--accent-glow)',
        }}
        title="JARVIS AI Assistant"
      >
        {/* Breathing glow ring */}
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid var(--accent)' }}
        />

        {/* Secondary glow ring */}
        <motion.div
          animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid var(--accent)' }}
        />

        {/* Inner glow */}
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-1.5 rounded-full"
          style={{ background: 'var(--accent-glow)' }}
        />

        <Sparkles size={20} className="text-white relative z-10" />
      </motion.button>
    </div>
  )
}
