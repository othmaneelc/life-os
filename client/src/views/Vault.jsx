import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, Unlock, Key, Plus, Trash2, Pin, PinOff, Edit3, Eye, EyeOff, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVaultStatus, useVaultEntries, useVaultEntry, useSetupVault, useUnlockVault, useLockVault, useResetVault, useCreateEntry, useUpdateEntry, useDeleteEntry } from '../store/vaultStore'
import { useConfirm } from '../hooks/useConfirm'
import PageHeader from '../components/PageHeader'

export default function Vault() {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { confirm, ConfirmModal } = useConfirm()

  const { data: status, isLoading: statusLoading } = useVaultStatus()
  const { data: entries, isLoading: entriesLoading } = useVaultEntries()
  const { data: entry, isLoading: entryLoading } = useVaultEntry(selectedId)

  const setupMutation = useSetupVault()
  const unlockMutation = useUnlockVault()
  const resetMutation = useResetVault()
  const lockMutation = useLockVault()
  const createMutation = useCreateEntry()
  const updateMutation = useUpdateEntry()
  const deleteMutation = useDeleteEntry()

  const lastActivity = useRef(Date.now())
  const AUTO_LOCK_MS = 5 * 60 * 1000

  useEffect(() => {
    if (!unlocked) return
    const update = () => { lastActivity.current = Date.now() }
    window.addEventListener('mousemove', update, { passive: true })
    window.addEventListener('keydown', update, { passive: true })
    window.addEventListener('click', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true })
    const id = setInterval(() => {
      if (Date.now() - lastActivity.current > AUTO_LOCK_MS) {
        lockMutation.mutate()
        setUnlocked(false)
        setSelectedId(null)
        setEditing(false)
      }
    }, 10000)
    return () => {
      window.removeEventListener('mousemove', update)
      window.removeEventListener('keydown', update)
      window.removeEventListener('click', update)
      window.removeEventListener('scroll', update)
      clearInterval(id)
    }
  }, [unlocked])

  const needsSetup = status && !status.locked

  const handleUnlockOrSetup = async () => {
    if (!password) return toast.error('Enter a password')
    try {
      if (needsSetup) {
        await setupMutation.mutateAsync(password)
        toast.success('Vault created')
      } else {
        await unlockMutation.mutateAsync(password)
        toast.success('Vault unlocked')
      }
      setUnlocked(true)
      setPassword('')
    } catch (e) { toast.error(e.message) }
  }

  const handleLock = () => {
    lockMutation.mutate()
    setUnlocked(false)
    setSelectedId(null)
    setEditing(false)
  }

  const handleCreate = () => {
    setSelectedId(null)
    setEditing(true)
    setEditTitle('')
    setEditBody('')
  }

  const handleSave = async () => {
    if (!editTitle.trim()) return toast.error('Title required')
    try {
      if (selectedId) {
        await updateMutation.mutateAsync({ id: selectedId, title: editTitle, body: editBody })
        setEditing(false)
        toast.success('Saved')
      } else {
        const data = await createMutation.mutateAsync({ title: editTitle, body: editBody })
        setSelectedId(data.id)
        setEditing(false)
        toast.success('Created')
      }
    } catch (e) { toast.error(e.message) }
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this entry?')
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(id)
      if (selectedId === id) { setSelectedId(null); setEditing(false) }
      toast.success('Deleted')
    } catch (e) { toast.error(e.message) }
  }

  const handleTogglePin = (id, current) => {
    updateMutation.mutate({ id, pinned: !current })
  }

  const handleSelect = (id) => {
    setSelectedId(id)
    setEditing(false)
  }

  const handleEdit = () => {
    if (entry) {
      setEditTitle(entry.title)
      setEditBody(entry.body || '')
      setEditing(true)
    }
  }

  if (statusLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="w-48 h-8 bg-apple-surface rounded animate-pulse" />
      </div>
    )
  }

  // Lock screen
  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card p-8 w-full text-center">
          <Lock size={40} className="mx-auto mb-4 text-apple-muted opacity-50" />
          <h2 className="text-heading font-semibold mb-1">{needsSetup ? 'Create Vault' : 'Vault Locked'}</h2>
          <p className="text-small text-apple-muted mb-6">
            {needsSetup ? 'Set a password for your encrypted notes' : 'Enter your password to access the vault'}
          </p>
          <div className="relative mb-4">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlockOrSetup()}
              placeholder="Password" className="w-full input pr-10" autoFocus />
            <button onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-muted">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button onClick={handleUnlockOrSetup} disabled={setupMutation.isPending || unlockMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <Key size={16} /> {needsSetup ? 'Create Vault' : 'Unlock'}
          </button>
          {!needsSetup && (
            <button onClick={() => {
              if (!window.confirm('Reset vault? This will delete all encrypted notes.')) return
              resetMutation.mutate(undefined, { onSuccess: () => { setUnlocked(false); toast.success('Vault reset. Set a new password.') } })
            }} disabled={resetMutation.isPending}
              className="text-micro text-apple-muted hover:text-apple-red mt-4 transition-colors">
              Forgot password?
            </button>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto p-8">
      <PageHeader icon={Unlock} title="Vault" actions={
        <div className="flex items-center gap-2">
          <button onClick={handleCreate} className="btn-ghost text-small flex items-center gap-1"><Plus size={14} /> New Note</button>
          <button onClick={handleLock} className="btn-ghost text-small flex items-center gap-1 text-apple-muted"><Lock size={14} /> Lock</button>
        </div>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar */}
        <div className="card p-0 overflow-hidden">
          <div className="p-3 text-micro text-apple-muted font-medium border-b border-apple-border">Notes ({entries?.length || 0})</div>
          {entriesLoading ? (
            <div className="p-3 space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-apple-surface rounded animate-pulse" />)}</div>
          ) : entries?.length === 0 ? (
            <div className="p-4 text-center text-small text-apple-muted">No notes yet</div>
          ) : (
            <div className="divide-y divide-apple-border max-h-[70vh] overflow-y-auto">
              {entries.map(e => (
                <div key={e.id}
                  onClick={() => handleSelect(e.id)}
                  className={`group flex items-center gap-2 p-3 cursor-pointer transition-colors text-small ${selectedId === e.id ? 'bg-apple-tab' : 'hover:bg-apple-surface'}`}>
                  <button onClick={(ev) => { ev.stopPropagation(); handleTogglePin(e.id, e.pinned) }} className="shrink-0">
                    {e.pinned ? <PinOff size={12} className="text-apple-amber" /> : <Pin size={12} className="text-apple-muted opacity-40" />}
                  </button>
                  <span className="flex-1 truncate">{e.title}</span>
                  <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }} className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-apple-red" aria-label="Delete entry">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="card p-4 min-h-[50vh]">
          {editing ? (
            <div className="space-y-4">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Note title"
                className="w-full text-heading font-semibold bg-transparent border-none outline-none placeholder:text-apple-muted/50" autoFocus />
              <textarea value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Write your encrypted note..."
                className="w-full min-h-[30vh] bg-apple-surface rounded-md p-3 text-small resize-none outline-none" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setEditing(false); if (!selectedId) setSelectedId(null) }} className="btn-ghost text-small">Cancel</button>
                <button onClick={handleSave} className="btn-primary text-small flex items-center gap-1"><Sparkles size={14} /> Save</button>
              </div>
            </div>
          ) : entryLoading ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-4 bg-apple-surface rounded animate-pulse" />)}</div>
          ) : entry ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-small font-semibold">{entry.title}</h2>
                <button onClick={handleEdit} className="btn-ghost text-micro flex items-center gap-1"><Edit3 size={12} /> Edit</button>
              </div>
              <div className="text-small text-apple-text whitespace-pre-wrap leading-relaxed">{entry.body}</div>
              <div className="mt-4 text-micro text-apple-muted flex items-center gap-4">
                <span>Created: {entry.created_at?.slice(0, 10)}</span>
                <span>Updated: {entry.updated_at?.slice(0, 10)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-apple-muted">
              <Lock size={32} className="opacity-20 mb-2" />
              <p className="text-small">Select a note or create a new one</p>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal />
    </motion.div>
  )
}
