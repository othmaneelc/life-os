import { useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { modalBackdrop, modalContent } from '../utils/animations'

const widthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

const Modal = memo(function Modal({ open, onClose, title, children, maxWidth = 'md', showClose = true, alignTop = false, className = '' }) {
  const contentRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!open) {
      if (previousFocus.current) {
        previousFocus.current.focus()
        previousFocus.current = null
      }
      return
    }
    previousFocus.current = document.activeElement
    document.body.style.overflow = 'hidden'

    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    const timer = setTimeout(() => {
      const el = contentRef.current?.querySelector('input, textarea, select, button')
      if (el) el.focus()
    }, 100)
    return () => {
      window.removeEventListener('keydown', handleKey)
      clearTimeout(timer)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div
          className={`fixed inset-0 z-50 flex ${alignTop ? 'items-start justify-center pt-[15vh]' : 'items-center justify-center'}`}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : 'Dialog'}
        >
          <motion.div {...modalBackdrop} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
          <motion.div
            ref={contentRef}
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
                  className="p-1 rounded-md transition-colors hover:bg-[var(--bg-surface)]" style={{ color: 'var(--text-muted)' }}
                  aria-label="Close"
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
})

export default Modal
