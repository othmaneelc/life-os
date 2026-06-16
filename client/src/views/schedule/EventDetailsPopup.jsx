import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, MapPin, AlignLeft, Edit3, Trash2, Repeat } from 'lucide-react'

export default function EventDetailsPopup({ event, onClose, onEdit, onDelete }) {
  if (!event) return null
  const blockColor = event.color || 'var(--accent)'

  return (
    <AnimatePresence>
      {event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="relative w-80 p-5 rounded-xl z-10 mx-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: blockColor }} />

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: blockColor, boxShadow: `0 0 10px ${blockColor}40` }} />
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{event.title}</h3>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} aria-label="Close event details"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X size={14} />
              </motion.button>
            </div>

            <div className="space-y-3 text-sm">
              {event.is_all_day ? (
                <div className="flex items-center gap-2.5" style={{ color: 'var(--text-muted)' }}>
                  <Calendar size={14} style={{ color: blockColor }} /> All-day event
                </div>
              ) : (
                <div className="flex items-center gap-2.5" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={14} style={{ color: blockColor }} /> {event.start_time} – {event.end_time}
                </div>
              )}
              {event.date && (
                <div className="flex items-center gap-2.5" style={{ color: 'var(--text-muted)' }}>
                  <Calendar size={14} style={{ color: blockColor }} /> {event.date}
                </div>
              )}
              {event.subtitle && (
                <div className="flex items-center gap-2.5" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={14} style={{ color: blockColor }} /> {event.subtitle}
                </div>
              )}
              {event.description && (
                <div className="flex items-start gap-2.5" style={{ color: 'var(--text-muted)' }}>
                  <AlignLeft size={14} className="mt-0.5 flex-shrink-0" style={{ color: blockColor }} />
                  <span className="text-sm">{event.description}</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {event.block_type && (
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                    style={{ background: `${blockColor}15`, color: blockColor }}>
                    {event.block_type}
                  </span>
                )}
                {event.is_google && (
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--success)', color: 'white' }}>
                    Google Calendar
                  </span>
                )}
                {event.recurrence && (
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <Repeat size={9} />Repeats {event.recurrence}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => onEdit(event)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                <Edit3 size={13} /> Edit
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => onDelete(event)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--danger)' }}>
                <Trash2 size={13} /> Delete
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
