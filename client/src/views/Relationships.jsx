import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Heart, Plus, Trash2, Edit3, Star, Phone, Mail, Calendar, Filter } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import DataError from '../components/DataError'
import { useRelationships, useAddRelationship, useUpdateRelationship, useDeleteRelationship } from '../store/relationshipStore'
import { staggerContainer, staggerItem } from '../utils/animations'
import Modal from '../components/Modal'

import PageHeader from '../components/PageHeader'

const container = staggerContainer
const itemAnim = staggerItem

const TYPE_COLORS = { family: '#FF9F0A', friend: '#30D158', colleague: '#5B5BD6', mentor: '#AF52DE', other: '#8E8E93' }
const TYPE_LABELS = { family: 'Family', friend: 'Friend', colleague: 'Colleague', mentor: 'Mentor', other: 'Other' }

export default function Relationships() {
  const [filterType, setFilterType] = useState('all')
  const { data: relationships = [], isLoading, isError, refetch } = useRelationships(filterType)
  const addMutation = useAddRelationship()
  const updateMutation = useUpdateRelationship()
  const deleteMutation = useDeleteRelationship()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', relationship_type: 'friend', birthday: '', phone: '', email: '', notes: '', last_contact: '', importance: 3 })

  const grouped = useMemo(() => {
    const map = {}
    relationships.forEach(r => {
      const type = r.relationship_type || 'other'
      if (!map[type]) map[type] = []
      map[type].push(r)
    })
    return map
  }, [relationships])

  const openEdit = (rel) => {
    setEditing(rel)
    setForm({ name: rel.name, relationship_type: rel.relationship_type || 'other', birthday: rel.birthday || '', phone: rel.phone || '', email: rel.email || '', notes: rel.notes || '', last_contact: rel.last_contact || '', importance: rel.importance || 3 })
    setShowModal(true)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', relationship_type: 'friend', birthday: '', phone: '', email: '', notes: '', last_contact: '', importance: 3 })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name) return toast.error('Name is required')
    const payload = { ...form, birthday: form.birthday || null, phone: form.phone || null, email: form.email || null, notes: form.notes || null, last_contact: form.last_contact || null, importance: parseInt(form.importance) }
    if (editing) {
      updateMutation.mutate({ id: editing.id, updates: payload }, { onSuccess: () => setShowModal(false) })
    } else {
      addMutation.mutate(payload, { onSuccess: () => setShowModal(false) })
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader icon={Heart} title="Relationships" actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-apple-surface">
            <Filter size={13} className="text-apple-muted ml-1" />
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-transparent text-small text-apple-text outline-none pr-2">
              <option value="all">All</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={openAdd} className="btn-primary flex items-center gap-1">
            <Plus size={15} /> Add
          </motion.button>
        </div>
      } />

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-apple-card animate-pulse rounded-xl" />)}
        </div>
      ) : isError ? (
        <DataError message="Failed to load relationships" onRetry={() => refetch()} />
      ) : (
      <motion.div variants={itemAnim}>
        {relationships.length === 0 ? (
          <EmptyState icon="default" title="No relationships yet" description="Start building your relationship CRM" />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, rels]) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || '#8E8E93' }} />
                  <span className="section-label capitalize">{TYPE_LABELS[type] || type}</span>
                  <span className="text-micro text-apple-muted">({rels.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {rels.map((r, i) => (
                      <motion.div
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
                        className="card group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-body font-semibold text-apple-text">{r.name}</span>
                            <span className="text-micro px-1.5 py-0.5 rounded-full text-white ml-2 font-medium" style={{ backgroundColor: TYPE_COLORS[r.relationship_type] || '#8E8E93' }}>
                              {TYPE_LABELS[r.relationship_type] || r.relationship_type}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(r)} className="p-1 hover:bg-apple-surface rounded" aria-label="Edit relationship"><Edit3 size={13} className="text-apple-muted" /></button>
                            <button onClick={() => deleteMutation.mutate(r.id)} className="p-1 hover:bg-apple-red/10 rounded" aria-label="Delete relationship"><Trash2 size={13} className="text-apple-red" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 mb-2">
                          {Array.from({ length: 5 }, (_, j) => (
                            <Star key={j} size={11} fill={j < r.importance ? '#FF9F0A' : 'transparent'} color={j < r.importance ? '#FF9F0A' : 'var(--text-tertiary)'} strokeWidth={j < r.importance ? 0 : 1.5} />
                          ))}
                        </div>
                        <div className="space-y-1 text-small text-apple-muted">
                          {r.birthday && <span className="flex items-center gap-1"><Calendar size={11} /> {r.birthday}</span>}
                          {r.last_contact && <span className="flex items-center gap-1"><Phone size={11} /> Last: {r.last_contact}</span>}
                          {r.phone && <span className="flex items-center gap-1"><Phone size={11} /> {r.phone}</span>}
                          {r.email && <span className="flex items-center gap-1"><Mail size={11} /> {r.email}</span>}
                        </div>
                        {r.notes && <p className="text-small text-apple-muted mt-1 truncate">{r.notes}</p>}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Relationship' : 'Add Relationship'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Name" required />
            </div>
            <div>
              <label className="section-label block mb-1">Type</label>
              <select value={form.relationship_type} onChange={e => setForm(f => ({ ...f, relationship_type: e.target.value }))} className="input-field">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Birthday</label>
              <input type="date" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="section-label block mb-1">Last Contact</label>
              <input type="date" value={form.last_contact} onChange={e => setForm(f => ({ ...f, last_contact: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" placeholder="Optional" />
            </div>
            <div>
              <label className="section-label block mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="section-label block mb-1">Importance</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} type="button" onClick={() => setForm(f => ({ ...f, importance: i }))} className="transition-all duration-150 hover:scale-110">
                  <Star size={20} fill={i <= form.importance ? '#FF9F0A' : 'transparent'} color={i <= form.importance ? '#FF9F0A' : 'var(--text-tertiary)'} strokeWidth={i <= form.importance ? 0 : 1.5} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="section-label block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">{editing ? 'Update' : 'Add'}</motion.button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
