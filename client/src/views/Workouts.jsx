import { useState, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Dumbbell, Plus, Trash2, Clock, Calendar, List, GripVertical, RefreshCw } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import DataError from '../components/DataError'
import { useWorkouts, useAddWorkout, useUpdateWorkout, useDeleteWorkout } from '../store/workoutStore'
import { staggerContainer, staggerItem } from '../utils/animations'
import { useConfirm } from '../hooks/useConfirm'
import PageHeader from '../components/PageHeader'

const container = staggerContainer
const itemAnim = staggerItem

const formatMin = (m) => {
  if (!m) return ''
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`
}

const ExerciseRow = memo(function ExerciseRow({ exercise, index, onUpdate, onRemove }) {
  return (
    <div key={exercise._key} className="flex items-center gap-2 p-2 rounded-lg bg-apple-surface">
      <GripVertical size={14} className="text-apple-muted flex-shrink-0" />
      <input type="text" value={exercise.exercise_name} onChange={e => onUpdate(index, 'exercise_name', e.target.value)} className="input-field flex-1 min-w-0" placeholder="Exercise name" />
      <input type="number" min="0" value={exercise.sets} onChange={e => onUpdate(index, 'sets', e.target.value)} className="input-field w-16 text-center" placeholder="Sets" />
      <input type="number" min="0" value={exercise.reps} onChange={e => onUpdate(index, 'reps', e.target.value)} className="input-field w-16 text-center" placeholder="Reps" />
      <div className="flex items-center gap-1 flex-shrink-0">
        <input type="number" min="0" step="0.5" value={exercise.weight_kg} onChange={e => onUpdate(index, 'weight_kg', e.target.value)} className="input-field w-20 text-center" placeholder="Weight" />
        <span className="text-small text-apple-muted">kg</span>
      </div>
      <button type="button" onClick={() => onRemove(index)} className="p-1 hover:bg-apple-red/10 rounded flex-shrink-0" aria-label="Remove exercise"><Trash2 size={13} className="text-apple-red" /></button>
    </div>
  )
})

const WorkoutCard = memo(function WorkoutCard({ workout, index, onEdit, onDelete }) {
  return (
    <motion.div
      key={workout.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
      className="card relative group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-body font-semibold text-apple-text">{workout.name}</span>
          <div className="flex items-center gap-2 text-small text-apple-muted mt-1">
            <Calendar size={12} /> {workout.date}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(workout.id)} className="p-1 hover:bg-apple-surface rounded">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-apple-muted"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          </button>
          <button onClick={() => onDelete(workout.id)} className="p-1 hover:bg-apple-red/10 rounded" aria-label="Delete workout"><Trash2 size={13} className="text-apple-red" /></button>
        </div>
      </div>
      <div className="flex items-center gap-4 text-small">
        {workout.duration_min && (
          <div className="flex items-center gap-1 text-apple-muted">
            <Clock size={13} /> {formatMin(workout.duration_min)}
          </div>
        )}
        <div className="flex items-center gap-1 text-apple-muted">
          <List size={13} /> {workout.exercise_count || 0} exercises
        </div>
      </div>
    </motion.div>
  )
})

export default function Workouts() {
  const { data: workouts = [], isLoading, isError, refetch } = useWorkouts()
  const addMutation = useAddWorkout()
  const updateMutation = useUpdateWorkout()
  const deleteMutation = useDeleteWorkout()
  const { confirm, ConfirmModal } = useConfirm()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], name: '', duration_min: '', notes: '', exercises: [] })
  const exerciseKey = useRef(0)

  const addExerciseRow = () => {
    exerciseKey.current += 1
    setForm(f => ({ ...f, exercises: [...f.exercises, { _key: exerciseKey.current, exercise_name: '', sets: '', reps: '', weight_kg: '' }] }))
  }

  const updateExercise = useCallback((i, field, value) => {
    setForm(f => {
      const ex = [...f.exercises]
      ex[i] = { ...ex[i], [field]: value }
      return { ...f, exercises: ex }
    })
  }, [])

  const removeExercise = useCallback((i) => {
    setForm(f => ({ ...f, exercises: f.exercises.filter((_, idx) => idx !== i) }))
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.date) return toast.error('Name and date are required')
    const payload = {
      date: form.date,
      name: form.name,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      notes: form.notes || null,
      exercises: form.exercises.filter(ex => ex.exercise_name).map(ex => ({
        exercise_name: ex.exercise_name,
        sets: ex.sets ? parseInt(ex.sets) : 0,
        reps: ex.reps ? parseInt(ex.reps) : 0,
        weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : 0,
      })),
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { setShowForm(false); setEditingId(null); resetForm() },
      })
    } else {
      addMutation.mutate(payload, {
        onSuccess: () => { setShowForm(false); resetForm() },
      })
    }
  }

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], name: '', duration_min: '', notes: '', exercises: [{ exercise_name: '', sets: '', reps: '', weight_kg: '' }] })
  }

  const handleEditWorkout = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/workouts/${id}`)
      if (!res.ok) throw new Error('Failed to load workout')
      const full = await res.json()
      const exs = (full.exercises || []).map(ex => ({ exercise_name: ex.exercise_name, sets: String(ex.sets || ''), reps: String(ex.reps || ''), weight_kg: String(ex.weight_kg || '') }))
      setForm({ date: full.date, name: full.name, duration_min: full.duration_min || '', notes: full.notes || '', exercises: exs.length ? exs : [{ exercise_name: '', sets: '', reps: '', weight_kg: '' }] })
      setEditingId(id); setShowForm(true)
    } catch { toast.error('Failed to load workout') }
  }, [])

  const handleDeleteWorkout = useCallback(async (id) => {
    if (await confirm('Delete this workout?')) deleteMutation.mutate(id)
  }, [confirm, deleteMutation])

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={Dumbbell} title="Workouts" actions={
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowForm(s => !s); if (showForm) setEditingId(null) }} className="btn-primary flex items-center gap-1">
          <Plus size={15} /> {showForm ? 'Cancel' : 'Log Workout'}
        </motion.button>
      } />

      <AnimatePresence>
        {showForm && (
          <motion.div variants={itemAnim} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card">
            <span className="section-label mb-4">{editingId ? 'Edit Workout' : 'New Workout'}</span>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-1">Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g., Push Day" required />
                </div>
                <div>
                  <label className="section-label block mb-1">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-1">Duration (min)</label>
                  <input type="number" min="0" value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} className="input-field" placeholder="Optional" />
                </div>
                <div>
                  <label className="section-label block mb-1">Notes</label>
                  <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" placeholder="Optional" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="section-label">Exercises</span>
                  <button type="button" onClick={addExerciseRow} className="btn-ghost flex items-center gap-1 text-small"><Plus size={13} /> Add Exercise</button>
                </div>
                <div className="space-y-2">
                  {form.exercises.map((ex, i) => (
                    <ExerciseRow key={ex._key} exercise={ex} index={i} onUpdate={updateExercise} onRemove={removeExercise} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-ghost">Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">{editingId ? 'Update Workout' : 'Save Workout'}</motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-apple-card animate-pulse rounded-xl" />)}
        </div>
      ) : isError ? (
        <DataError message="Failed to load workouts" onRetry={() => refetch()} />
      ) : (
      <motion.div variants={itemAnim}>
        {workouts.length === 0 ? (
          <EmptyState icon="workouts" title="No workouts yet" description="Log your first workout to start tracking your fitness journey" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {workouts.map((w, i) => (
                <WorkoutCard key={w.id} workout={w} index={i} onEdit={handleEditWorkout} onDelete={handleDeleteWorkout} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
      )}
      <ConfirmModal />
    </motion.div>
  )
}
