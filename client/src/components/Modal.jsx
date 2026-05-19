import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { modalBackdrop, modalContent } from '../utils/animations'

const widthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export default function Modal({ open, onClose, title, children, maxWidth = 'md', showClose = true, alignTop = false, className = '' }) {
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-50 flex ${alignTop ? 'items-start justify-center pt-[15vh]' : 'items-center justify-center'}`} onClick={onClose}>
          <motion.div {...modalBackdrop} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
          <motion.div
            {...modalContent}
            onClick={e => e.stopPropagation()}
            className={`relative w-full ${widthMap[maxWidth] || widthMap.md} mx-4 p-5 ${className}`}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              {title && <h2 className="text-subheading font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>}
              {!title && <div />}
              {showClose && (
                <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                  className="p-1 rounded-md transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={16} />
                </motion.button>
              )}
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
