import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Check, Trash2, Target, Link, Edit3, X } from 'lucide-react'
import { useGoalStore } from '../store/goalStore'
import { useHabitStore } from '../store/habitStore'
import Modal from '../components/Modal'

const TIMEFRAMES = ['monthly', 'quarterly', 'yearly']
const COLORS = ['#0071E3', '#34C759', '#FF9F0A', '#AF52DE', '#FF3B30', '#5AC8FA', '#FF2D55']

export default function Goals() {
  const { goals, loading, fetchGoals, addGoal, updateGoal, deleteGoal, addStep, toggleStep, deleteStep, linkHabit, unlinkHabit } = useGoalStore()
  const { habits, fetchHabits } = useHabitStore()
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', timeframe: 'monthly', category: '', color: COLORS[0] })
  const [newStep, setNewStep] = useState('')
  const [linkingGoal, setLinkingGoal] = useState(null)

  useEffect(() => { fetchGoals().catch(() => {}); fetchHabits().catch(() => {}) }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (editingGoal) {
      updateGoal(editingGoal.id, form)
    } else {
      addGoal(form)
    }
    setShowModal(false)
    setEditingGoal(null)
    setForm({ title: '', description: '', timeframe: 'monthly', category: '', color: COLORS[0] })
  }

  if (loading && !goals.length) {
    return <div className="p-8 max-w-6xl mx-auto space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-32 animate-shimmer" />)}</div>
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-6xl mx-auto space-y-6 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={22} className="text-apple-muted" />
          <h1 className="text-heading font-semibold">Goals</h1>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingGoal(null); setForm({ title: '', description: '', timeframe: 'monthly', category: '', color: COLORS[0] }); setShowModal(true) }} className="btn-primary flex items-center gap-1">
          <Plus size={15} /> New Goal
        </motion.button>
      </div>

      {/* Stats */}
      {goals.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: goals.length, color: 'text-apple-blue' },
            { label: 'Active', value: goals.filter(g => g.progress < 100).length, color: 'text-apple-green' },
            { label: 'Completed', value: goals.filter(g => g.progress >= 100).length, color: 'text-apple-purple' },
            { label: 'Avg Progress', value: goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) + '%' : '0%', color: 'text-apple-amber' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} className="card">
              <div className={`text-small text-apple-muted mb-1`}>{s.label}</div>
              <div className={`text-heading font-semibold ${s.color}`}>{s.value}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-2 gap-4">
        {goals.filter(g => g.progress < 100).concat(goals.filter(g => g.progress >= 100)).map((goal, i) => (
          <motion.div key={goal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
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
                <button onClick={() => { setEditingGoal(goal); setForm({ title: goal.title, description: goal.description || '', timeframe: goal.timeframe, category: goal.category || '', color: goal.color }); setShowModal(true) }} className="p-1 hover:bg-apple-surface rounded"><Edit3 size={13} className="text-apple-muted" /></button>
                <button onClick={() => deleteGoal(goal.id)} className="p-1 hover:bg-apple-red/10 rounded"><Trash2 size={13} className="text-apple-red" /></button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-apple-surface rounded-full overflow-hidden mb-3">
              <motion.div initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 0.5 }}
                className="h-full rounded-full" style={{ backgroundColor: goal.progress >= 100 ? '#34C759' : goal.color }} />
            </div>
            <div className="flex items-center justify-between text-micro text-apple-muted mb-3">
              <span>{goal.progress}% complete ({goal.done_steps || 0}/{goal.total_steps || 0} steps)</span>
              {goal.timeframe && <span className="badge-gray">{goal.timeframe}</span>}
            </div>

            {/* Steps */}
            <div className="space-y-1 mb-3">
              {(goal.steps || []).slice(0, 5).map(step => (
                <div key={step.id} className="flex items-center gap-2 py-1 group">
                  <button onClick={() => toggleStep(goal.id, step.id)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${step.done ? 'border-apple-green bg-apple-green' : 'border-apple-border hover:border-apple-blue'}`}>
                    {step.done && <Check size={10} className="text-white" />}
                  </button>
                  <span className={`text-small flex-1 ${step.done ? 'text-apple-muted line-through' : 'text-apple-text '}`}>
                    {step.title}
                  </span>
                  <button onClick={() => deleteStep(goal.id, step.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-apple-surface rounded"><X size={11} className="text-apple-muted" /></button>
                </div>
              ))}
            </div>

            {/* Add Step */}
            <form onSubmit={e => { e.preventDefault(); if (newStep.trim()) { addStep(goal.id, newStep.trim()); setNewStep('') } }} className="flex gap-1 mb-3">
              <input type="text" value={newStep} onChange={e => setNewStep(e.target.value)} placeholder="Add step..." className="input-field text-small flex-1" />
              <button type="submit" className="btn-primary text-small px-3 py-1"><Plus size={13} /></button>
            </form>

            {/* Linked Habits */}
            <div className="flex items-center gap-1 flex-wrap">
              {(goal.habit_ids || []).map(hid => {
                const h = habits.find(h => h.id === hid)
                return h ? (
                  <span key={hid} className="badge-gray text-micro flex items-center gap-1">
                    <Link size={10} /> {h.name}
                    <button onClick={() => unlinkHabit(goal.id, hid)} className="hover:text-apple-red"><X size={10} /></button>
                  </span>
                ) : null
              })}
              <button onClick={() => setLinkingGoal(goal.id)} className="badge-gray text-micro hover:bg-apple-blue/10 hover:text-apple-blue transition-colors flex items-center gap-1">
                <Plus size={10} /> Link Habit
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {!goals.length && (
        <div className="card text-center py-12">
          <Target size={32} className="mx-auto mb-3 opacity-30 text-apple-muted" />
          <p className="text-body text-apple-muted">No goals yet</p>
          <p className="text-small text-apple-muted mt-1">Set your first goal to start tracking progress</p>
        </div>
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
          <div className="grid grid-cols-2 gap-3">
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
            <button key={h.id} onClick={() => { linkHabit(linkingGoal, h.id); setLinkingGoal(null) }}
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
