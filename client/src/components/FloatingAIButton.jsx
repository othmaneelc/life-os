import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Mic } from 'lucide-react'
import { useAIStore } from '../store/aiStore'

export default function FloatingAIButton() {
  const { isOpen, setOpen, isListening, startListening } = useAIStore()

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Voice button (shows when AI is open) */}
      <AnimatePresence>
        {isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={startListening}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${isListening ? 'animate-pulse' : ''}`}
            style={{
              background: isListening ? 'var(--danger)' : 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: isListening ? '#fff' : 'var(--text-muted)',
            }}
            title="Voice input"
          >
            <Mic size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main AI button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!isOpen)}
        className="relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: 'var(--gradient-accent)' }}
        title="JARVIS AI Assistant"
      >
        {/* Glow ring */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid var(--accent)' }}
        />

        {/* Inner glow */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-1 rounded-full"
          style={{ background: 'var(--accent-glow)' }}
        />

        <Sparkles size={18} className="text-white relative z-10" />
      </motion.button>
    </div>
  )
}
