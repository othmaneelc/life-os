import { useState, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Plane, Plus, Trash2, Calendar, MapPin, DollarSign, ArrowLeft } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { useTrips, useTrip, useAddTrip, useUpdateTrip, useDeleteTrip, useAddTripExpense, useDeleteTripExpense } from '../store/tripStore'
import { staggerContainer, staggerItem } from '../utils/animations'
import PageHeader from '../components/PageHeader'

const container = staggerContainer
const itemAnim = staggerItem
const STATUS_COLORS = { planned: '#5B5BD6', ongoing: '#30D158', completed: '#8E8E93', cancelled: '#FF453A' }
const STATUS_LABELS = { planned: 'Planned', ongoing: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled' }

const TripCard = memo(function TripCard({ trip, onSelect }) {
  return (
    <motion.div
      key={trip.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: 0, type: 'spring', stiffness: 300, damping: 25 }}
      className="card cursor-pointer hover:shadow-glow transition-all group"
      onClick={() => onSelect(trip.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <span className="text-body font-semibold text-apple-text">{trip.title}</span>
          {trip.destination && (
            <div className="flex items-center gap-1 text-small text-apple-muted mt-0.5">
              <MapPin size={11} /> {trip.destination}
            </div>
          )}
        </div>
        <span className="text-micro px-2 py-0.5 rounded-full text-white font-medium flex-shrink-0 ml-2" style={{ backgroundColor: STATUS_COLORS[trip.status] || '#8E8E93' }}>
          {STATUS_LABELS[trip.status] || trip.status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-small text-apple-muted mb-2">
        {trip.start_date && <span className="flex items-center gap-1"><Calendar size={11} />{trip.start_date}{trip.end_date ? ` - ${trip.end_date}` : ''}</span>}
      </div>
      <div className="flex items-center justify-between text-small">
        {trip.budget > 0 && <span className="text-apple-muted">Budget: {Math.round(trip.budget).toLocaleString()} MAD</span>}
        <span className="text-apple-muted">{Math.round(trip.total_spent || 0).toLocaleString()} MAD spent</span>
      </div>
    </motion.div>
  )
})

const ExpenseItem = memo(function ExpenseItem({ expense, tripId, onDelete }) {
  return (
    <motion.div
      key={expense.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0 }}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-apple-surface transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-apple-blue" />
        <div>
          <span className="text-body text-apple-text text-small font-medium">{expense.category}</span>
          {expense.description && <span className="text-small text-apple-muted ml-2">{expense.description}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-body text-apple-text font-semibold text-small">{Math.round(expense.amount).toLocaleString()} MAD</span>
        <button onClick={() => onDelete(expense.id)} className="p-1 hover:bg-apple-red/10 rounded opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete expense"><Trash2 size={12} className="text-apple-red" /></button>
      </div>
    </motion.div>
  )
})

export default function Trips() {
  const { data: trips = [], isLoading } = useTrips()
  const addMutation = useAddTrip()
  const deleteMutation = useDeleteTrip()
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', destination: '', start_date: '', end_date: '', budget: '', status: 'planned', notes: '' })

  if (selectedId) {
    return <TripDetail tripId={selectedId} onBack={() => setSelectedId(null)} />
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title) return toast.error('Title is required')
    addMutation.mutate({ ...form, budget: form.budget ? parseFloat(form.budget) : 0 }, {
      onSuccess: () => { setShowForm(false); setForm({ title: '', destination: '', start_date: '', end_date: '', budget: '', status: 'planned', notes: '' }) },
    })
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={Plane} title="Travel" actions={
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-1">
          <Plus size={15} /> {showForm ? 'Cancel' : 'New Trip'}
        </motion.button>
      } />

      <AnimatePresence>
        {showForm && (
          <motion.div variants={itemAnim} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card">
            <span className="section-label mb-4">New Trip</span>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-1">Title</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder="e.g., Morocco Trip" required />
                </div>
                <div>
                  <label className="section-label block mb-1">Destination</label>
                  <input type="text" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} className="input-field" placeholder="e.g., Marrakech" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="section-label block mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-1">Budget (MAD)</label>
                  <input type="number" min="0" step="0.01" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="input-field" placeholder="0" />
                </div>
                <div>
                  <label className="section-label block mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="section-label block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} placeholder="Optional" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">Save Trip</motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemAnim}>
        {trips.length === 0 ? (
          <EmptyState icon="default" title="No trips planned" description="Plan your next adventure" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {trips.map(t => (
                <TripCard key={t.id} trip={t} onSelect={setSelectedId} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function TripDetail({ tripId, onBack }) {
  const { data: trip, isLoading } = useTrip(tripId)
  const updateMutation = useUpdateTrip()
  const addExpenseMutation = useAddTripExpense()
  const deleteExpenseMutation = useDeleteTripExpense()
  const [expForm, setExpForm] = useState({ category: 'Food', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
  const [showExpForm, setShowExpForm] = useState(false)

  const handleAddExpense = (e) => {
    e.preventDefault()
    if (!expForm.amount) return toast.error('Amount is required')
    addExpenseMutation.mutate({ tripId, data: { ...expForm, amount: parseFloat(expForm.amount), date: expForm.date || null } }, {
      onSuccess: () => { setExpForm({ category: 'Food', amount: '', description: '', date: new Date().toISOString().split('T')[0] }); setShowExpForm(false) },
    })
  }

  const handleDeleteExpense = useCallback((expenseId) => {
    deleteExpenseMutation.mutate({ tripId, expenseId })
  }, [tripId, deleteExpenseMutation])

  if (isLoading || !trip) return <div className="p-8"><div className="animate-pulse h-32 bg-apple-surface rounded-xl" /></div>

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-8 max-w-4xl mx-auto space-y-6">
      <motion.div variants={itemAnim}>
        <button onClick={onBack} className="btn-ghost flex items-center gap-1 text-small mb-4"><ArrowLeft size={14} /> Back</button>
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-heading font-semibold mb-1">{trip.title}</h1>
              {trip.destination && <p className="text-small text-apple-muted flex items-center gap-1"><MapPin size={12} />{trip.destination}</p>}
            </div>
            <span className="text-micro px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: STATUS_COLORS[trip.status] || '#8E8E93' }}>
              {STATUS_LABELS[trip.status] || trip.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            {trip.start_date && <div className="text-small"><span className="text-apple-muted">Dates</span><p className="text-apple-text">{trip.start_date}{trip.end_date ? ` - ${trip.end_date}` : ''}</p></div>}
            {trip.budget > 0 && <div className="text-small"><span className="text-apple-muted">Budget</span><p className="text-apple-text">{Math.round(trip.budget).toLocaleString()} MAD</p></div>}
            <div className="text-small"><span className="text-apple-muted">Spent</span><p className="text-apple-text">{Math.round(trip.total_spent || 0).toLocaleString()} MAD</p></div>
          </div>
          {trip.notes && <p className="text-small text-apple-muted">{trip.notes}</p>}
        </div>
      </motion.div>

      <motion.div variants={itemAnim}>
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">Expenses</span>
          <button onClick={() => setShowExpForm(s => !s)} className="btn-ghost flex items-center gap-1 text-small"><Plus size={13} /> Add Expense</button>
        </div>

        <AnimatePresence>
          {showExpForm && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card mb-3">
              <form onSubmit={handleAddExpense} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="section-label block mb-1 text-micro">Category</label>
                  <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))} className="input-field text-small">
                    {['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <label className="section-label block mb-1 text-micro">Amount</label>
                  <input type="number" min="0" step="0.01" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} className="input-field text-small" placeholder="0" required />
                </div>
                <div className="flex-1">
                  <label className="section-label block mb-1 text-micro">Description</label>
                  <input type="text" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} className="input-field text-small" placeholder="Optional" />
                </div>
                <button type="submit" className="btn-primary text-small">Add</button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {(!trip.expenses || trip.expenses.length === 0) ? (
          <div className="card text-center py-6">
            <DollarSign size={24} className="mx-auto mb-2 opacity-30 text-apple-muted" />
            <p className="text-body text-apple-muted text-small">No expenses yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {trip.expenses.map(ex => (
              <ExpenseItem key={ex.id} expense={ex} tripId={tripId} onDelete={handleDeleteExpense} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
