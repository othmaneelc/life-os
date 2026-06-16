import { useState, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Plus, Check, Trash2, Edit3, Palette, Sun, Moon, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useIdentities, useCreateIdentity, useUpdateIdentity, useDeleteIdentity, useSwitchIdentity } from '../store/identityStore'
import { useConfirm } from '../hooks/useConfirm'
import PageHeader from '../components/PageHeader'

const THEMES = ['dark', 'light', 'monk']
const FOCUS_PRESETS = ['Business', 'Faith', 'Health', 'Learning', 'Family', 'Creative', 'Finance', 'Social']

const PersonaCard = memo(function PersonaCard({ identity, isActive, onActivate, onEdit, onDelete, activating }) {
  const focus = JSON.parse(identity.focus_areas || '[]')
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0 } }}
      className={`card p-4 relative ${isActive ? '' : ''}`} style={isActive ? { borderColor: identity.accent_color || 'var(--accent)', borderWidth: '2px' } : {}}>
      {isActive && (
        <div className="absolute top-2 right-2 bg-apple-green text-white text-micro px-1.5 py-0.5 rounded-full">Active</div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-apple-surface flex items-center justify-center overflow-hidden">
          {identity.avatar_url ? <img src={identity.avatar_url} alt={identity.name} className="w-full h-full object-cover" /> : <User size={20} className="text-apple-muted" />}
        </div>
        <div>
          <div className="text-small font-semibold">{identity.name}</div>
          <div className="text-micro text-apple-muted capitalize">{identity.theme} · {identity.accent_color}</div>
        </div>
      </div>
      {focus.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {focus.map(f => <span key={f} className="px-2 py-0.5 rounded-md bg-apple-surface text-micro text-apple-muted">{f}</span>)}
        </div>
      )}
      <div className="flex gap-1 mt-auto">
        {!isActive && (
          <button onClick={() => onActivate(identity.id)} disabled={activating}
            className="btn-ghost text-micro flex items-center gap-1 flex-1 justify-center">
            <Check size={12} /> Activate
          </button>
        )}
        <button onClick={() => onEdit(identity)} className="btn-ghost text-micro flex items-center gap-1 flex-1 justify-center">
          <Edit3 size={12} /> Edit
        </button>
        <button onClick={() => onDelete(identity.id, identity.name)}
          className="btn-ghost text-micro flex items-center gap-1 flex-1 justify-center text-apple-red">
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </motion.div>
  )
})

export default function IdentityStack() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', avatar_url: '', accent_color: '#5B5BD6', theme: 'dark', focus_areas: [] })
  const { confirm, ConfirmModal } = useConfirm()

  const { data: identities, isLoading } = useIdentities()
  const createMutation = useCreateIdentity()
  const updateMutation = useUpdateIdentity()
  const deleteMutation = useDeleteIdentity()
  const switchMutation = useSwitchIdentity()

  const activeIdentity = identities?.find(i => i.active)

  const resetForm = () => {
    setForm({ name: '', avatar_url: '', accent_color: '#5B5BD6', theme: 'dark', focus_areas: [] })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = useCallback((identity) => {
    setEditingId(identity.id)
    setForm({
      name: identity.name,
      avatar_url: identity.avatar_url || '',
      accent_color: identity.accent_color || '#5B5BD6',
      theme: identity.theme || 'dark',
      focus_areas: JSON.parse(identity.focus_areas || '[]'),
    })
    setShowForm(true)
  }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name required')
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form })
        toast.success('Updated')
      } else {
        await createMutation.mutateAsync(form)
        toast.success('Created')
      }
      resetForm()
    } catch (e) { toast.error(e.message) }
  }

  const handleActivate = useCallback((id) => {
    switchMutation.mutate(id)
  }, [switchMutation])

  const handleDelete = useCallback(async (id, name) => {
    const ok = await confirm(`Delete "${name}"?`)
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(id)
      if (editingId === id) {
        setForm({ name: '', avatar_url: '', accent_color: '#5B5BD6', theme: 'dark', focus_areas: [] })
        setEditingId(null)
        setShowForm(false)
      }
      toast.success('Deleted')
    } catch (e) { toast.error(e.message) }
  }, [confirm, deleteMutation, editingId])

  const toggleFocus = (area) => {
    setForm(f => ({
      ...f,
      focus_areas: f.focus_areas.includes(area) ? f.focus_areas.filter(a => a !== area) : [...f.focus_areas, area],
    }))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-8 space-y-6">
      <PageHeader title="Identity Stack" actions={
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary text-small flex items-center gap-1">
          <Plus size={14} /> New Persona
        </button>
      } />

      {activeIdentity && (
        <div className="card p-4 flex items-center gap-3 border-l-4" style={{ borderLeftColor: activeIdentity.accent_color || 'var(--accent)' }}>
          <div className="w-10 h-10 rounded-full bg-apple-surface flex items-center justify-center overflow-hidden">
            {activeIdentity.avatar_url ? <img src={activeIdentity.avatar_url} alt={activeIdentity.name} className="w-full h-full object-cover" /> : <User size={20} className="text-apple-muted" />}
          </div>
          <div>
            <div className="text-small font-semibold">{activeIdentity.name}</div>
            <div className="text-micro text-apple-muted">Active persona · {JSON.parse(activeIdentity.focus_areas || '[]').join(', ') || 'No focus areas'}</div>
          </div>
          <div className="ml-auto text-micro text-apple-muted flex items-center gap-2">
            <Palette size={12} /> {activeIdentity.theme} · {activeIdentity.accent_color}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-small font-semibold">{editingId ? 'Edit Persona' : 'New Persona'}</span>
              <button onClick={resetForm} className="text-apple-muted" aria-label="Reset form"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-micro text-apple-muted block mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input w-full" placeholder="Persona name" />
              </div>
              <div>
                <label className="text-micro text-apple-muted block mb-1">Avatar URL (optional)</label>
                <input value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))} className="input w-full" placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-micro text-apple-muted block mb-1">Theme</label>
                <div className="flex gap-1 p-1 rounded-lg bg-apple-surface/50">
                  {THEMES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, theme: t }))}
                      className={`flex-1 px-3 py-1.5 rounded-md text-small capitalize ${form.theme === t ? 'bg-apple-tab shadow-sm text-apple-text' : 'text-apple-muted'}`}>
                      {t === 'dark' ? <Moon size={14} className="inline" /> : <Sun size={14} className="inline" />} {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-micro text-apple-muted block mb-1">Accent Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <span className="text-small text-apple-muted">{form.accent_color}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-2">Focus Areas</label>
              <div className="flex flex-wrap gap-1.5">
                {FOCUS_PRESETS.map(area => (
                  <button key={area} onClick={() => toggleFocus(area)}
                    className={`px-2.5 py-1 rounded-md text-micro transition-all ${form.focus_areas.includes(area) ? 'bg-apple-tab text-apple-text font-medium' : 'bg-apple-surface text-apple-muted'}`}>
                    {area}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={resetForm} className="btn-ghost text-small">Cancel</button>
              <button onClick={handleSave} className="btn-primary text-small"><Sparkles size={14} className="inline mr-1" /> Save</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persona Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card p-4 h-32"><div className="w-full h-full bg-apple-surface rounded animate-pulse" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {identities?.map(identity => (
            <PersonaCard key={identity.id} identity={identity} isActive={identity.active} onActivate={handleActivate} onEdit={handleEdit} onDelete={handleDelete} activating={switchMutation.isPending} />
          ))}
        </div>
      )}

      {!isLoading && identities?.length === 0 && (
        <div className="text-center py-12">
          <User size={48} className="mx-auto mb-3 text-apple-muted opacity-30" />
          <p className="text-body text-apple-muted mb-1">No personas yet</p>
          <p className="text-small text-apple-muted">Create different personas for work, faith, family, and more</p>
        </div>
      )}
      <ConfirmModal />
    </motion.div>
  )
}
