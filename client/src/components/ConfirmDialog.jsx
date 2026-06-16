import { useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ConfirmDialog = memo(function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Delete', variant = 'danger' }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onCancel?.() }
      if (e.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleKeyDown)
    cancelRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <div ref={dialogRef} className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title || 'Confirm'}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="relative rounded-xl p-5 w-full max-w-sm mx-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-subheading font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title || 'Confirm'}</h3>
            <p className="text-small mb-5" style={{ color: 'var(--text-muted)' }}>{message}</p>
            <div className="flex gap-2 justify-end">
              <motion.button ref={cancelRef} whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                className="px-4 py-1.5 rounded-lg text-small font-medium transition-colors hover:bg-apple-surface"
                style={{ color: 'var(--text-muted)' }}>
                Cancel
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={onConfirm}
                className="px-4 py-1.5 rounded-lg text-small font-medium text-white transition-colors"
                style={{ background: variant === 'danger' ? 'var(--danger-color, #ef4444)' : 'var(--accent)' }}>
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

export default ConfirmDialog
