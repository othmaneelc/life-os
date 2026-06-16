import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  MessageSquare, Phone, Video, Mail, CheckCircle2, Circle,
  Trash2, Filter, Plus, MessageCircle, AlertCircle, Clock, CheckSquare
} from 'lucide-react'
import toast from 'react-hot-toast'

const COLORS = {
  cyan: '#00C2FF',
  gold: '#C9A84C',
  card: '#0D0D0D',
  border: '#1A1A1A',
  surface: '#111111',
  muted: '#666',
}

const TYPE_COLORS = {
  WhatsApp: '#25D366',
  Meeting: '#00C2FF',
  Call: '#FFB800',
  Email: '#818CF8',
}

const COMM_TYPES = ['WhatsApp', 'Meeting', 'Call', 'Email']
const STATUS_OPTS = ['Pending', 'Done', 'Not Needed']

export default function CDZComms({ comms = [] }) {
  const queryClient = useQueryClient()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(todayStr)
  const [type, setType] = useState('WhatsApp')
  const [summary, setSummary] = useState('')
  const [actionItem, setActionItem] = useState('')
  const [actionStatus, setActionStatus] = useState('Pending')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/cdz/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdz-comms'] })
      setDate(todayStr)
      setType('WhatsApp')
      setSummary('')
      setActionItem('')
      setActionStatus('Pending')
      toast.success('Logged')
    },
    onError: () => toast.error('Failed to log'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`/api/cdz/comms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdz-comms'] })
      toast.success('Updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/cdz/comms/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdz-comms'] })
      setConfirmDeleteId(null)
      toast.success('Deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const pendingItems = useMemo(
    () => comms.filter((c) => c.action_status === 'Pending'),
    [comms]
  )

  const filteredComms = useMemo(() => {
    let result = [...comms]
    if (typeFilter !== 'All') result = result.filter((c) => c.type === typeFilter)
    if (statusFilter !== 'All') result = result.filter((c) => c.action_status === statusFilter)
    return result
  }, [comms, typeFilter, statusFilter])

  const getId = (item) => item._id || item.id

  const handleSubmit = () => {
    if (!summary.trim()) {
      toast.error('Enter a summary')
      return
    }
    createMutation.mutate({
      date,
      type,
      summary: summary.trim(),
      action_item: actionItem.trim() || undefined,
      action_status: actionStatus,
    })
  }

  const handleMarkDone = (id) => {
    updateMutation.mutate({ id, data: { action_status: 'Done' } })
  }

  const handleToggleStatus = (item) => {
    const id = getId(item)
    const next = item.action_status === 'Done' ? 'Pending' : 'Done'
    updateMutation.mutate({ id, data: { action_status: next } })
  }

  const handleDelete = (id) => {
    deleteMutation.mutate(id)
    setConfirmDeleteId(null)
  }

  function TypeIcon({ type, size = 12, style }) {
    const icons = { WhatsApp: MessageCircle, Meeting: Video, Call: Phone, Email: Mail }
    const Icon = icons[type] || MessageSquare
    return <Icon size={size} style={style} />
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="space-y-6">
      {/* Add new log entry form */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
      >
        <h3 className="text-white text-base font-semibold mb-4 flex items-center gap-2">
          <Plus size={18} style={{ color: COLORS.cyan }} /> Log Communication
        </h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[160px]">
            <label style={s.label}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={s.input} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label style={s.label}>Type</label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {COMM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer"
                  style={{
                    background: type === t ? COLORS.cyan : COLORS.surface,
                    color: type === t ? '#000' : COLORS.muted,
                  }}
                >
                  <TypeIcon type={t} size={12} />
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mb-3">
          <label style={s.label}>What was discussed?</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{ ...s.input, minHeight: 70, resize: 'vertical' }}
            placeholder="What was discussed?"
          />
        </div>
        <div className="mb-4">
          <label style={s.label}>Any follow-up needed?</label>
          <textarea
            value={actionItem}
            onChange={(e) => setActionItem(e.target.value)}
            style={{ ...s.input, minHeight: 60, resize: 'vertical' }}
            placeholder="Any follow-up needed?"
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label style={s.label}>Action Status</label>
            <div className="flex gap-1.5 mt-1">
              {STATUS_OPTS.map((st) => (
                <button
                  key={st}
                  onClick={() => setActionStatus(st)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border-none cursor-pointer"
                  style={{
                    background: actionStatus === st ? COLORS.cyan : COLORS.surface,
                    color: actionStatus === st ? '#000' : COLORS.muted,
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer"
            style={{ background: COLORS.cyan, color: '#000' }}
          >
            <MessageSquare size={15} />
            {createMutation.isPending ? 'Logging…' : 'Log Communication'}
          </button>
        </div>
      </motion.div>

      {/* Pending Actions banner */}
      {pendingItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5"
          style={{ background: '#1A0D00', border: '1px solid #C9A84C40' }}
        >
          <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3" style={{ color: COLORS.gold }}>
            <AlertCircle size={15} /> Pending Actions ({pendingItems.length})
          </h4>
          <div className="space-y-2">
            {pendingItems.map((item) => (
                <div
                  key={getId(item)}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TypeIcon type={item.type} size={14} style={{ color: TYPE_COLORS[item.type] || COLORS.muted, flexShrink: 0 }} />
                    <span className="text-sm truncate" style={{ color: '#ccc' }}>{item.summary}</span>
                  </div>
                  <button
                    onClick={() => handleMarkDone(getId(item))}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border-none cursor-pointer whitespace-nowrap flex-shrink-0"
                    style={{ background: '#00FF8720', color: '#00FF87' }}
                  >
                    <CheckCircle2 size={12} /> Mark Done
                  </button>
                </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} style={{ color: COLORS.muted }} />
        {['All', ...COMM_TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className="px-2.5 py-1 rounded-full text-xs font-medium border-none cursor-pointer"
            style={{
              background: typeFilter === t ? COLORS.cyan : COLORS.surface,
              color: typeFilter === t ? '#000' : COLORS.muted,
            }}
          >
            {t}
          </button>
        ))}
        <span style={{ color: COLORS.muted, fontSize: 11 }}>|</span>
        {['All', ...STATUS_OPTS].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className="px-2.5 py-1 rounded-full text-xs font-medium border-none cursor-pointer"
            style={{
              background: statusFilter === st ? COLORS.gold : COLORS.surface,
              color: statusFilter === st ? '#000' : COLORS.muted,
            }}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Log feed / empty state */}
      {filteredComms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <MessageSquare size={36} style={{ color: COLORS.muted }} className="mb-3" />
          <p className="text-white text-base font-medium mb-1">No communications logged yet</p>
          <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
            Start logging your client conversations above.
          </p>
          <button
            onClick={() => setDate(todayStr)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer"
            style={{ background: COLORS.cyan, color: '#000' }}
          >
            <Plus size={16} /> Log Communication
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredComms.map((item) => {
            const id = getId(item)
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium" style={{ color: COLORS.muted }}>
                      {item.date ? format(new Date(item.date), 'MMM d, yyyy') : ''}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: `${(TYPE_COLORS[item.type] || '#666')}20`,
                        color: TYPE_COLORS[item.type] || '#666',
                      }}
                    >
                      <TypeIcon type={item.type} size={11} />
                      {item.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {confirmDeleteId === id ? (
                      <>
                        <button
                          onClick={() => handleDelete(id)}
                          disabled={deleteMutation.isPending}
                          className="px-2 py-1 rounded text-[10px] font-semibold border-none cursor-pointer"
                          style={{ background: '#ff4444', color: '#fff' }}
                        >
                          {deleteMutation.isPending ? '…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded text-[10px] border cursor-pointer"
                          style={{ border: '1px solid #333', background: 'transparent', color: COLORS.muted }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(id)}
                        className="p-1 rounded border-none cursor-pointer"
                        style={{ background: 'transparent', color: '#555' }} aria-label="Delete communication"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm mb-3" style={{ color: '#ccc' }}>{item.summary}</p>
                {item.action_item && (
                  <div
                    className="flex items-center justify-between gap-3 p-3 rounded-xl"
                    style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.action_status === 'Done' ? (
                        <CheckSquare size={15} style={{ color: '#00FF87', flexShrink: 0 }} />
                      ) : (
                        <Clock size={15} style={{ color: COLORS.gold, flexShrink: 0 }} />
                      )}
                      <span className="text-xs truncate" style={{ color: '#aaa' }}>{item.action_item}</span>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(item)}
                      disabled={updateMutation.isPending}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold border-none cursor-pointer whitespace-nowrap flex-shrink-0"
                      style={{
                        background: item.action_status === 'Done' ? '#00FF8720' : '#C9A84C20',
                        color: item.action_status === 'Done' ? '#00FF87' : COLORS.gold,
                      }}
                    >
                      {item.action_status === 'Done' ? 'Done' : 'Pending'}
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  label: {
    display: 'block',
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #1A1A1A',
    background: '#0D0D0D',
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
}
