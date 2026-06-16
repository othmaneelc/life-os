import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Mail, MapPin, Trash2, Calendar, AlertCircle } from 'lucide-react'
import { prospectStatuses } from '../utils/formatters'

const PIPELINE_COLUMNS = [
  { key: 'new_lead', label: 'Prospect', color: '#8E8E93' },
  { key: 'called_no_answer', label: 'Contacted', color: '#FF9F0A' },
  { key: 'conversation_started', label: 'Engaged', color: '#5B5BD6' },
  { key: 'meeting_booked', label: 'Call Booked', color: '#AF52DE' },
  { key: 'proposal_sent', label: 'Proposal', color: '#FF3B30' },
  { key: 'closed_won', label: 'Client', color: '#34C759' },
  { key: 'closed_lost', label: 'Lost', color: '#636366' },
]

function isOverdue(prospect) {
  if (!prospect.next_action || !prospect.updated_at) return false
  const updated = new Date(prospect.updated_at)
  const daysSince = Math.floor((Date.now() - updated.getTime()) / 86400000)
  if (prospect.status === 'new_lead' && daysSince > 3) return true
  if (prospect.status === 'called_no_answer' && daysSince > 2) return true
  if (prospect.status === 'conversation_started' && daysSince > 3) return true
  if (prospect.status === 'meeting_booked' && daysSince > 5) return true
  if (prospect.status === 'proposal_sent' && daysSince > 5) return true
  return false
}

function daysSinceUpdate(prospect) {
  if (!prospect.updated_at) return null
  return Math.floor((Date.now() - new Date(prospect.updated_at).getTime()) / 86400000)
}

function ProspectCard({ prospect, onDelete, onStatusChange, isDark }) {
  const overdue = isOverdue(prospect)
  const days = daysSinceUpdate(prospect)
  const statusConfig = prospectStatuses.find(s => s.value === prospect.status) || prospectStatuses[0]
  const colIndex = PIPELINE_COLUMNS.findIndex(c => c.key === prospect.status)
  const canAdvance = colIndex < PIPELINE_COLUMNS.length - 2
  const canRegress = colIndex > 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`card p-3 mb-2 cursor-default ${overdue ? 'ring-2 ring-apple-red/40' : ''}`}
      style={{ background: isDark ? '#2C2C2E' : 'var(--bg-surface)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-small font-semibold truncate">{prospect.company_name || 'Unknown'}</div>
          {prospect.contact_name && (
            <div className="text-micro text-apple-muted truncate">{prospect.contact_name}</div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canRegress && (
            <button onClick={() => onStatusChange(prospect.id, PIPELINE_COLUMNS[colIndex - 1].key)}
              className="text-apple-tertiary hover:text-apple-text transition-colors p-0.5" aria-label="Move left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}
          {canAdvance && (
            <button onClick={() => onStatusChange(prospect.id, PIPELINE_COLUMNS[colIndex + 1].key)}
              className="text-apple-tertiary hover:text-apple-text transition-colors p-0.5" aria-label="Move right">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
          <button onClick={() => onDelete(prospect.id)}
            className="text-apple-tertiary hover:text-apple-red transition-colors p-0.5" aria-label="Delete prospect">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {prospect.phone && (
        <div className="flex items-center gap-1 text-micro text-apple-muted mb-1">
          <Phone size={10} /> {prospect.phone}
        </div>
      )}

      {prospect.next_action && (
        <div className="flex items-start gap-1 text-micro mt-1.5 p-1.5 rounded"
          style={{ background: isDark ? '#3A3A3C' : '#F5F5F7' }}>
          <Calendar size={10} className="mt-0.5 flex-shrink-0 text-apple-blue" />
          <span className="text-apple-text">{prospect.next_action}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-apple-border/30">
        <div className="flex items-center gap-1">
          {overdue && <AlertCircle size={10} className="text-apple-red" />}
          {days !== null && (
            <span className={`text-micro ${overdue ? 'text-apple-red font-medium' : 'text-apple-tertiary'}`}>
              {days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`}
            </span>
          )}
        </div>
        <span className={`text-micro px-1.5 py-0.5 rounded ${statusConfig.color}`}>{statusConfig.label}</span>
      </div>
    </motion.div>
  )
}

export default function PipelineKanban({ prospects, onDelete, onStatusChange, isDark }) {
  return (
    <div className="grid grid-cols-7 gap-2 overflow-x-auto pb-2" style={{ minHeight: 300 }}>
      {PIPELINE_COLUMNS.map(col => {
        const items = prospects.filter(p => p.status === col.key)
        return (
          <div key={col.key} className="min-w-[160px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-micro font-semibold" style={{ color: col.color }}>{col.label}</span>
              <span className="text-micro text-apple-tertiary">{items.length}</span>
            </div>
            <div className="space-y-1 min-h-[100px] rounded-lg p-1"
              style={{ background: isDark ? '#1C1C1E' : '#F5F5F7' }}>
              {items.length === 0 ? (
                <div className="text-micro text-apple-tertiary text-center py-4">—</div>
              ) : (
                items.map(p => (
                  <ProspectCard key={p.id} prospect={p} onDelete={onDelete} onStatusChange={onStatusChange} isDark={isDark} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
