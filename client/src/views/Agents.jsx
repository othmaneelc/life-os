import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Plus, Play, Trash2, ToggleLeft, ToggleRight, Clock, List, Save, Eye } from 'lucide-react'
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent, useRunAgent, useToggleAgent, useAgentLogs } from '../store/agentStore'
import toast from 'react-hot-toast'
import { staggerItemFast } from '../utils/animations'
import { staggerContainer } from '../utils/animations'
import { useConfirm } from '../hooks/useConfirm'
import Modal from '../components/Modal'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const INTERVAL_OPTIONS = [
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '48 hours' },
]

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Never'
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now - date
  const abs = Math.abs(diffMs)
  const mins = Math.floor(abs / 60000)
  if (diffMs < 0) {
    if (mins < 60) return `in ${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `in ${hours}h`
    return `in ${Math.floor(hours / 24)}d`
  }
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatSchedule(agent) {
  const { schedule_type, schedule_value } = agent
  if (!schedule_type || !schedule_value) return 'Manual'
  if (schedule_type === 'interval') {
    const h = schedule_value.replace('h', '')
    return `Every ${h} hour${h !== '1' ? 's' : ''}`
  }
  if (schedule_type === 'daily') return `Daily at ${schedule_value}`
  if (schedule_type === 'weekly') {
    const days = schedule_value.split(',').map(Number).filter(n => !isNaN(n)).map(d => DAY_NAMES[d]).filter(Boolean)
    return `Weekly ${days.join('/')}`
  }
  return schedule_value || 'Manual'
}

const defaultForm = {
  name: '',
  description: '',
  prompt_template: '',
  action_type: 'custom',
  action_params: '',
  enabled: true,
  schedule_type: 'interval',
  schedule_value: '24h',
}

export default function Agents() {
  const [showModal, setShowModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [form, setForm] = useState({ ...defaultForm })
  const [errors, setErrors] = useState({})
  const [expandedLogs, setExpandedLogs] = useState(null)
  const [agentLogs, setAgentLogs] = useState({})
  const [logsLoading, setLogsLoading] = useState(null)
  const { confirm, ConfirmModal } = useConfirm()

  const { data: agents = [], isLoading } = useAgents()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const deleteAgent = useDeleteAgent()
  const runAgent = useRunAgent()
  const toggleAgent = useToggleAgent()
  const { data: logs = [], refetch: refetchLogs } = useAgentLogs(expandedLogs)

  function handleOpenCreate() {
    setEditingAgent(null)
    setForm({ ...defaultForm })
    setErrors({})
    setShowModal(true)
  }

  function handleOpenEdit(agent) {
    setEditingAgent(agent)
    setForm({
      name: agent.name || '',
      description: agent.description || '',
      prompt_template: agent.prompt_template || '',
      action_type: agent.action_type || 'custom',
      action_params: agent.action_params || '',
      enabled: agent.enabled !== false,
      schedule_type: agent.schedule_type || 'interval',
      schedule_value: agent.schedule_value || '24h',
    })
    setErrors({})
    setShowModal(true)
  }

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  function handleScheduleTypeChange(type) {
    const defaults = { interval: '24h', daily: '09:00', weekly: '1,3,5' }
    setForm(f => ({ ...f, schedule_type: type, schedule_value: defaults[type] }))
  }

  function toggleDay(day) {
    const current = form.schedule_value ? form.schedule_value.split(',').map(Number) : []
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
    setForm(f => ({ ...f, schedule_value: next.sort().join(',') }))
  }

  function isDaySelected(day) {
    const current = form.schedule_value ? form.schedule_value.split(',').map(Number) : []
    return current.includes(day)
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.prompt_template.trim()) errs.prompt_template = 'Prompt template is required'
    if (form.schedule_type === 'daily' && !form.schedule_value) errs.schedule_value = 'Time is required'
    if (form.schedule_type === 'weekly' && !form.schedule_value) errs.schedule_value = 'Select at least one day'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    const payload = { ...form }
    try {
      if (editingAgent) {
        const res = await updateAgent.mutateAsync({ id: editingAgent.id, updates: payload })
        if (res?.success !== false) toast.success('Agent updated')
        else { toast.error('Failed to update agent'); return }
      } else {
        const res = await createAgent.mutateAsync(payload)
        if (res?.success !== false) toast.success('Agent created')
        else { toast.error('Failed to create agent'); return }
      }
      setShowModal(false)
    } catch {
      toast.error('Failed to save agent')
    }
  }

  async function handleDelete(agent) {
    const ok = await confirm(`Delete agent "${agent.name}"?`, { confirmText: 'Delete', variant: 'danger' })
    if (!ok) return
    deleteAgent.mutate(agent.id)
    toast.success('Agent deleted')
  }

  async function handleRun(agent) {
    const res = await runAgent.mutateAsync(agent.id)
    if (res?.success !== false) toast.success(`"${agent.name}" started`)
    else toast.error('Failed to run agent')
  }

  function handleToggle(agent) {
    toggleAgent.mutate(agent.id)
  }

  async function handleToggleLogs(agentId) {
    if (expandedLogs === agentId) {
      setExpandedLogs(null)
      return
    }
    setExpandedLogs(agentId)
    if (!agentLogs[agentId]) {
      setLogsLoading(agentId)
      try {
        const { data } = await refetchLogs()
        setAgentLogs(l => ({ ...l, [agentId]: data || [] }))
      } catch {} finally {
        setLogsLoading(null)
      }
    }
  }

  if (isLoading && agents.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-apple-surface animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-5 bg-apple-surface rounded animate-pulse" />
            <div className="w-48 h-3 bg-apple-surface rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card h-40">
              <div className="space-y-3 p-4">
                <div className="w-3/4 h-4 bg-apple-surface rounded animate-pulse" />
                <div className="w-full h-3 bg-apple-surface rounded animate-pulse" />
                <div className="w-1/2 h-3 bg-apple-surface rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 max-w-7xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Agents</h1>
            <p className="text-small text-apple-muted">Automated AI assistants for your Life OS</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={14} />
          New Agent
        </motion.button>
      </div>

      {agents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-12 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-surface)' }}>
            <Bot size={32} className="text-apple-muted" />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No AI Agents Yet</h3>
          <p className="text-body text-apple-muted max-w-md mb-6">
            Create your first AI agent to automate tasks, generate content, or analyze data on a schedule.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={14} />
            Create Your First Agent
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          {...staggerContainer}
        >
          <AnimatePresence>
            {agents.map(agent => (
              <motion.div
                key={agent.id}
                variants={staggerItemFast}
                layout
                className="card overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${agent.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <h3 className="text-body font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{agent.name}</h3>
                    </div>
                  </div>
                  {agent.description && (
                    <p className="text-small text-apple-muted line-clamp-2 mb-2">{agent.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-small text-apple-muted mb-1">
                    <Clock size={12} />
                    <span>{formatSchedule(agent)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-micro text-apple-muted mt-2">
                    <span>Last run: {formatRelativeTime(agent.last_run)}</span>
                    <span>Next run: {agent.next_run ? formatRelativeTime(agent.next_run) : 'Not scheduled'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-4 pb-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRun(agent)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-small font-medium transition-colors hover:bg-[var(--bg-surface)]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Run Now"
                  >
                    <Play size={12} />
                    Run
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleToggle(agent)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-surface)]"
                    style={{ color: 'var(--text-muted)' }}
                    title={agent.enabled ? 'Disable' : 'Enable'}
                  >
                    {agent.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleOpenEdit(agent)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-surface)]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Edit"
                  >
                    <Eye size={14} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(agent)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-surface)] group"
                    style={{ color: 'var(--text-muted)' }}
                    title="Delete"
                  >
                    <Trash2 size={14} className="group-hover:text-red-400 transition-colors" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleToggleLogs(agent.id)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-surface)] ml-auto"
                    style={{ color: expandedLogs === agent.id ? 'var(--accent)' : 'var(--text-muted)' }}
                    title="Logs"
                  >
                    <List size={14} />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {expandedLogs === agent.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[var(--border-color)] px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={12} className="text-apple-muted" />
                          <span className="text-micro font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Runs</span>
                        </div>
                        {logsLoading === agent.id ? (
                          <div className="flex items-center gap-2 text-micro text-apple-muted">
                            <div className="w-3 h-3 rounded-full border-2 border-apple-muted border-t-transparent animate-spin" />
                            Loading logs...
                          </div>
                        ) : agentLogs[agent.id]?.length > 0 ? (
                          agentLogs[agent.id].map((log, idx) => (
                            <div key={log.id || idx} className="flex items-start gap-2 py-1.5 px-2 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-micro font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {log.status === 'success' ? 'Success' : 'Failed'}
                                  </span>
                                  <span className="text-micro text-apple-muted">{formatRelativeTime(log.created_at)}</span>
                                </div>
                                {log.result && <p className="text-micro text-apple-muted truncate">{log.result}</p>}
                                {log.error && <p className="text-micro text-apple-red">{log.error}</p>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-micro text-apple-muted">No runs yet</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingAgent ? 'Edit Agent' : 'New Agent'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="section-label">Name <span className="text-apple-red">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="e.g., Morning Newsletter"
              className={`input-field w-full ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-micro text-apple-red mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="section-label">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="What does this agent do?"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="section-label">Prompt Template <span className="text-apple-red">*</span></label>
            <textarea
              value={form.prompt_template}
              onChange={e => handleChange('prompt_template', e.target.value)}
              placeholder="Instructions for the AI agent..."
              rows={4}
              className={`input-field w-full resize-none ${errors.prompt_template ? 'border-red-500' : ''}`}
            />
            {errors.prompt_template && <p className="text-micro text-apple-red mt-1">{errors.prompt_template}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label">Action Type</label>
              <select
                value={form.action_type}
                onChange={e => handleChange('action_type', e.target.value)}
                className="input-field w-full"
              >
                <option value="custom">Custom</option>
                <option value="email">Email</option>
                <option value="webhook">Webhook</option>
                <option value="analysis">Analysis</option>
                <option value="content">Content</option>
              </select>
            </div>
            <div>
              <label className="section-label">Action Params</label>
              <input
                type="text"
                value={form.action_params}
                onChange={e => handleChange('action_params', e.target.value)}
                placeholder="JSON or endpoint"
                className="input-field w-full"
              />
            </div>
          </div>

          <div>
            <label className="section-label">Schedule</label>
            <div className="flex gap-2 mb-3">
              {['interval', 'daily', 'weekly'].map(type => (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleScheduleTypeChange(type)}
                  className={`px-3 py-1.5 rounded-lg text-small font-medium transition-all capitalize ${
                    form.schedule_type === type
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-apple-muted hover:text-apple-text'
                  }`}
                  style={form.schedule_type !== type ? { background: 'var(--bg-surface)' } : {}}
                  type="button"
                >
                  {type}
                </motion.button>
              ))}
            </div>

            {form.schedule_type === 'interval' && (
              <select
                value={form.schedule_value}
                onChange={e => handleChange('schedule_value', e.target.value)}
                className="input-field w-full"
              >
                {INTERVAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            {form.schedule_type === 'daily' && (
              <input
                type="time"
                value={form.schedule_value}
                onChange={e => handleChange('schedule_value', e.target.value)}
                className={`input-field w-full ${errors.schedule_value ? 'border-red-500' : ''}`}
              />
            )}
            {form.schedule_type === 'weekly' && (
              <>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_NAMES.map((day, idx) => (
                    <motion.button
                      key={idx}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleDay(idx)}
                      type="button"
                      className={`w-9 h-9 rounded-lg text-micro font-medium transition-all ${
                        isDaySelected(idx)
                          ? 'bg-[var(--accent)] text-white'
                          : 'text-apple-muted'
                      }`}
                      style={!isDaySelected(idx) ? { background: 'var(--bg-surface)' } : {}}
                    >
                      {day}
                    </motion.button>
                  ))}
                </div>
                {errors.schedule_value && <p className="text-micro text-apple-red mt-1">{errors.schedule_value}</p>}
              </>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChange('enabled', !form.enabled)}
              type="button"
              className={`relative w-10 h-5 rounded-full transition-colors ${form.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
            >
              <motion.div
                animate={{ x: form.enabled ? 20 : 2 }}
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
              />
            </motion.button>
            <span className="text-small" style={{ color: 'var(--text-primary)' }}>
              {form.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--border-color)]">
          <button onClick={() => setShowModal(false)} className="btn-ghost text-small">Cancel</button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="btn-primary text-small flex items-center gap-1"
          >
            <Save size={13} />
            {editingAgent ? 'Update' : 'Create'}
          </motion.button>
        </div>
      </Modal>
      <ConfirmModal />
    </motion.div>
  )
}
