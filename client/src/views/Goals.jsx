import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Check, Trash2, Target, Link, Edit3, X, Sparkles } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { staggerContainer, staggerItem } from '../utils/animations'
import PageHeader from '../components/PageHeader'
import { useGoals, useAddGoal, useUpdateGoal, useDeleteGoal, useAddStep, useToggleStep, useDeleteStep, useLinkHabit, useUnlinkHabit } from '../store/goalStore'
import { useHabits } from '../store/habitStore'
import Modal from '../components/Modal'
import toast from 'react-hot-toast'

const TIMEFRAMES = ['monthly', 'quarterly', 'yearly']
const COLORS = ['#5B5BD6', '#34C759', '#FF9F0A', '#AF52DE', '#FF3B30', '#5AC8FA', '#FF2D55']

export default function Goals() {
  const { data: goals = [], isLoading } = useGoals()
  const addGoal = useAddGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const addStep = useAddStep()
  const toggleStep = useToggleStep()
  const deleteStep = useDeleteStep()
  const linkHabit = useLinkHabit()
  const unlinkHabit = useUnlinkHabit()
  const { data: habits = [] } = useHabits()
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', timeframe: 'monthly', category: '', color: COLORS[0] })
  const [stepInputs, setStepInputs] = useState({})
  const [linkingGoal, setLinkingGoal] = useState(null)
  const [coaching, setCoaching] = useState(null)
  const [coachingLoading, setCoachingLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, updates: form })
    } else {
      addGoal.mutate(form)
    }
    setShowModal(false)
    setEditingGoal(null)
    setForm({ title: '', description: '', timeframe: 'monthly', category: '', color: COLORS[0] })
  }

  async function getCoaching(goalId) {
    setCoachingLoading(true)
    setCoaching(null)
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error || 'Coaching failed'); return }
      setCoaching(data.coaching)
    } catch { toast.error('Failed to get coaching') }
    finally { setCoachingLoading(false) }
  }

  if (isLoading && !goals.length) {
    return <div className="p-8 max-w-6xl mx-auto space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-32 animate-shimmer" />)}</div>
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-6xl mx-auto space-y-6 ">
      {/* Header */}
      <PageHeader icon={Target} title="Goals" actions={
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingGoal(null); setForm({ title: '', description: '', timeframe: 'monthly', category: '', color: COLORS[0] }); setShowModal(true) }} className="btn-primary flex items-center gap-1">
          <Plus size={15} /> New Goal
        </motion.button>
      } />

      {/* Stats */}
      {goals.length > 0 && (
        <motion.div {...staggerContainer} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: goals.length, color: 'text-apple-blue' },
            { label: 'Active', value: goals.filter(g => g.progress < 100).length, color: 'text-apple-green' },
            { label: 'Completed', value: goals.filter(g => g.progress >= 100).length, color: 'text-apple-purple' },
            { label: 'Avg Progress', value: goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) + '%' : '0%', color: 'text-apple-amber' },
          ].map((s, i) => (
            <motion.div key={s.label} variants={staggerItem} className="card">
              <div className={`text-small text-apple-muted mb-1`}>{s.label}</div>
              <div className={`text-heading font-semibold ${s.color}`}>{s.value}</div>
            </motion.div>
            ))}
        </motion.div>
      )}

      {/* AI Coach Modal */}
        {coaching && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setCoaching(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-apple-card border border-apple-border rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-apple-purple" />
                <span className="text-body font-semibold text-apple-text">AI Coach</span>
              </div>
              <p className="text-body text-apple-text leading-relaxed whitespace-pre-wrap">{coaching}</p>
              <button onClick={() => setCoaching(null)}
                className="mt-4 px-4 py-2 text-small font-medium rounded-lg bg-apple-surface text-apple-text hover:bg-apple-elevated transition-colors">
                Close
              </button>
            </motion.div>
          </div>
        )}

        {/* Goals Grid */}
        <motion.div {...staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.filter(g => g.progress < 100).concat(goals.filter(g => g.progress >= 100)).map((goal, i) => (
          <motion.div key={goal.id} variants={staggerItem}
            className={`card ${goal.progress >= 100 ? 'opacity-70' : ''}`}>
            {/* Goal Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: goal.color }} />
                <div className="min-w-0">
                  <h3 className="text-body font-semibold truncate">{goal.title}</h3>
                  {goal.category && <span className="badge-gray text-micro mt-0.5">{goal.category}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => { setEditingGoal(goal); setForm({ title: goal.title, description: goal.description || '', timeframe: goal.timeframe, category: goal.category || '', color: goal.color }); setShowModal(true) }} aria-label="Edit goal" className="p-1 hover:bg-apple-surface rounded"><Edit3 size={13} className="text-apple-muted" /></button>
                <button onClick={() => deleteGoal.mutate(goal.id)} aria-label="Delete goal" className="p-1 hover:bg-apple-red/10 rounded"><Trash2 size={13} className="text-apple-red" /></button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-apple-surface rounded-full overflow-hidden mb-3">
              <motion.div initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 0.5 }}
                className="h-full rounded-full" style={{ backgroundColor: goal.progress >= 100 ? '#34C759' : goal.color }} />
            </div>
            <div className="flex items-center justify-between text-micro text-apple-muted mb-3">
              <span>{goal.progress}% complete ({goal.done_steps || 0}/{goal.total_steps || 0} steps)</span>
              <div className="flex items-center gap-1">
                <button onClick={() => getCoaching(goal.id)} disabled={coachingLoading}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-apple-purple/10 text-apple-purple hover:bg-apple-purple/20 transition-colors text-micro">
                  <Sparkles size={10} /> {coachingLoading ? '...' : 'AI Coach'}
                </button>
                {goal.timeframe && <span className="badge-gray">{goal.timeframe}</span>}
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1 mb-3">
              {(goal.steps || []).slice(0, 5).map(step => (
                <div key={step.id} className="flex items-center gap-2 py-1 group">
                  <button onClick={() => toggleStep.mutate({ goalId: goal.id, stepId: step.id })} aria-label="Toggle step completion"
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${step.done ? 'border-apple-green bg-apple-green' : 'border-apple-border hover:border-apple-blue'}`}>
                    {step.done && <Check size={10} className="text-white" />}
                  </button>
                  <span className={`text-small flex-1 ${step.done ? 'text-apple-muted line-through' : 'text-apple-text '}`}>
                    {step.title}
                  </span>
                  <button onClick={() => deleteStep.mutate({ goalId: goal.id, stepId: step.id })} aria-label="Remove step" className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-apple-surface rounded"><X size={11} className="text-apple-muted" /></button>
                </div>
              ))}
            </div>

            {/* Add Step */}
            <form onSubmit={e => { e.preventDefault(); const val = (stepInputs[goal.id] || '').trim(); if (val) { addStep.mutate({ goalId: goal.id, title: val }); setStepInputs(prev => ({...prev, [goal.id]: ''})) } }} className="flex gap-1 mb-3">
              <input type="text" value={stepInputs[goal.id] || ''} onChange={e => setStepInputs(prev => ({...prev, [goal.id]: e.target.value}))} placeholder="Add step..." className="input-field text-small flex-1" />
              <button type="submit" aria-label="Add step" className="btn-primary text-small px-3 py-1"><Plus size={13} /></button>
            </form>

            {/* Linked Habits */}
            <div className="flex items-center gap-1 flex-wrap">
              {(goal.habit_ids || []).map(hid => {
                const h = habits.find(h => h.id === hid)
                return h ? (
                  <span key={hid} className="badge-gray text-micro flex items-center gap-1">
                    <Link size={10} /> {h.name}
                    <button onClick={() => unlinkHabit.mutate({ goalId: goal.id, habitId: hid })} aria-label="Unlink habit" className="hover:text-apple-red"><X size={10} /></button>
                  </span>
                ) : null
              })}
              <button onClick={() => setLinkingGoal(goal.id)} className="badge-gray text-micro hover:bg-apple-blue/10 hover:text-apple-blue transition-colors flex items-center gap-1">
                <Plus size={10} /> Link Habit
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {!goals.length && (
        <EmptyState
          icon="goals"
          title="No goals yet"
          description="Set your first goal to start tracking progress"
          actionLabel="New Goal"
          onAction={() => { setEditingGoal(null); setShowModal(true) }}
        />
      )}

      {/* Goal Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingGoal ? 'Edit Goal' : 'New Goal'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="section-label block mb-1">Title</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="section-label block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" rows={2} />
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Timeframe</label>
              <select value={form.timeframe} onChange={e => setForm(f => ({ ...f, timeframe: e.target.value }))} className="input-field">
                {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1">Category</label>
              <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field" placeholder="e.g. Career" />
            </div>
          </div>
          <div>
            <label className="section-label block mb-1">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-6 h-6 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-apple-blue' : 'opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">{editingGoal ? 'Update' : 'Create'}</motion.button>
          </div>
        </form>
      </Modal>

      {/* Link Habit Modal */}
      <Modal open={!!linkingGoal} onClose={() => setLinkingGoal(null)} title="Link Habit" maxWidth="sm">
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {habits.filter(h => !goals.find(g => g.id === linkingGoal)?.habit_ids?.includes(h.id)).map(h => (
            <button key={h.id} onClick={() => { linkHabit.mutate({ goalId: linkingGoal, habit_id: h.id }); setLinkingGoal(null) }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-apple-surface transition-colors text-body">
              {h.name}
            </button>
          ))}
          {!habits.length && <p className="text-small text-apple-muted text-center py-4">No habits available</p>}
        </div>
      </Modal>
    </motion.div>
  )
}
