import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Save, User, Settings as SettingsIcon, Link2, BarChart3, Bell, X, Check, RefreshCw, Calendar, BookOpen, Zap, Palette, TrendingUp, Target, Trash2, Download, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from './Modal'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Palette },
  { id: 'connections', label: 'Connections', icon: Link2 },
  { id: 'data', label: 'Data', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const ORBIT_PARTICLES = 8

function OrbitRing({ photo }) {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <motion.div className="absolute inset-0 rounded-full" style={{ border: '1.5px solid var(--accent)', opacity: 0.3 }}
        animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="absolute inset-2 rounded-full" style={{ border: '1px solid var(--accent)', opacity: 0.15 }}
        animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} />
      {Array.from({ length: ORBIT_PARTICLES }).map((_, i) => (
        <motion.div key={i} className="absolute w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', opacity: 0.6 }}
          animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: i * 0.1 }}>
          <motion.div className="absolute w-1 h-1 rounded-full" style={{ background: 'var(--accent)', opacity: 0.3, top: -8, left: -2 }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }} />
        </motion.div>
      ))}
      <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2" style={{ ringColor: 'var(--accent)' }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center text-white font-semibold text-heading" style={{ background: 'var(--gradient-accent)' }}>OE</div>
        )}
      </div>
    </div>
  )
}

function ThemePreviewCard({ theme, current, onSelect }) {
  const isActive = theme === current
  const themes = { light: { bg: '#FFFFFF', text: '#1D1D1F', accent: '#0071E3', label: 'Light' }, dark: { bg: '#000000', text: '#F5F5F7', accent: '#40A9FF', label: 'Dark' }, night: { bg: '#0A0A0F', text: '#E8D5B7', accent: '#FFB347', label: 'Night' }, monk: { bg: '#000000', text: '#E8E8E8', accent: '#00D4AA', label: 'Monk' } }
  const t = themes[theme]
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={() => onSelect(theme)}
      className={`relative w-full p-3 rounded-xl border-2 transition-all ${isActive ? 'border-apple-accent' : 'border-apple-border hover:border-apple-text/20'}`} style={{ background: t.bg }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: t.accent, color: '#fff' }}>A</div>
        <div className="flex-1 h-1.5 rounded-full" style={{ background: t.accent, opacity: 0.3 }} />
      </div>
      <div className="space-y-1 mb-2">
        <div className="h-2 rounded-full w-3/4" style={{ background: t.text, opacity: 0.2 }} />
        <div className="h-2 rounded-full w-1/2" style={{ background: t.text, opacity: 0.12 }} />
      </div>
      <div className="text-[11px] font-medium text-center" style={{ color: t.text, opacity: 0.7 }}>{t.label}</div>
      {isActive && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}><Check size={11} className="text-white" /></div>}
    </motion.button>
  )
}

function ConnectionRow({ icon: Icon, label, description, status, onAction, actionLabel, actionLoading }) {
  const statusColors = { connected: '#34C759', disconnected: '#FF3B30', loading: '#FF9F0A' }
  const statusLabels = { connected: 'Connected', disconnected: 'Not connected', loading: 'Loading...' }
  const s = status === true || status === 'connected' ? 'connected' : status === 'loading' ? 'loading' : 'disconnected'
  return (
    <div className="flex items-center gap-3 px-3 py-3 bg-apple-surface rounded-lg">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-apple-card border border-apple-border"><Icon size={17} className="text-apple-text" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-body font-medium text-apple-text">{label}</div>
        <div className="text-micro text-apple-muted">{description}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: statusColors[s] || '#8E8E93' }} /><span className="text-micro text-apple-muted hidden sm:inline">{statusLabels[s]}</span></div>
        {onAction && <button onClick={onAction} disabled={actionLoading} className="px-2.5 py-1 text-micro font-medium rounded-lg transition-all disabled:opacity-50" style={{ background: s === 'connected' ? 'var(--bg-card)' : 'var(--accent)', color: s === 'connected' ? 'var(--text-muted)' : '#fff', border: s === 'connected' ? '1px solid var(--border-color)' : 'none' }}>{actionLoading ? '...' : actionLabel}</button>}
      </div>
    </div>
  )
}

export default function ProfileModal({ open, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const [name, setName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [bio, setBio] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [theme, setTheme] = useState('light')
  const [defaultView, setDefaultView] = useState('dashboard')
  const [fontSize, setFontSize] = useState('medium')

  const [gcalStatus, setGcalStatus] = useState('disconnected')
  const [gcalSyncing, setGcalSyncing] = useState(false)
  const [obsidianStatus, setObsidianStatus] = useState('disconnected')
  const [tasksSyncStatus, setTasksSyncStatus] = useState('disconnected')

  const [dataStats, setDataStats] = useState({ events: '—', entries: '—', tasks: '—', habits: '—' })
  const [clearConfirm, setClearConfirm] = useState('')

  const [notifications, setNotifications] = useState({ prayer_reminder: true, task_due: true, habit_reminder: true, daily_review: true, motivational: false })

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/calendar/status').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/tasks').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/journal').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/habits').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([s, gcal, tasks, entries, habits]) => {
      setName(s.user_name || 'Othmane Elcaidi')
      setAgencyName(s.agency_name || 'MIX AGENCI')
      setBio(s.user_bio || 'Founder · HVAC Marketing')
      if (s.profile_image) setPhotoPreview(s.profile_image)
      setTheme(s.theme || 'light')
      setDefaultView(s.default_view || 'dashboard')
      setFontSize(s.font_size || 'medium')
      if (s.notifications) { try { setNotifications(JSON.parse(s.notifications)) } catch {} }
      setGcalStatus(gcal?.connected === true || gcal?.status === 'connected' ? 'connected' : 'disconnected')
      setObsidianStatus(s.obsidian_vault ? 'connected' : 'disconnected')
      setTasksSyncStatus(s.google_tasks_connected === 'true' ? 'connected' : 'disconnected')
      setDataStats({
        events: gcal?.syncedCount || '—',
        entries: Array.isArray(entries) ? entries.length : '—',
        tasks: Array.isArray(tasks) ? tasks.filter(t => t.status === 'done').length : '—',
        habits: Array.isArray(habits) ? habits.length : '—',
      })
      setLoading(false)
    })
  }, [open])

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setPhoto(ev.target.result); setPhotoPreview(ev.target.result) }
    reader.readAsDataURL(file)
  }

  async function apiPut(body) {
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) throw new Error('Server error')
    return res.json()
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const body = { user_name: name, agency_name: agencyName, user_bio: bio }
      if (photo) body.profile_image = photo
      await apiPut(body)
      toast.success('Profile updated')
      if (onSave) onSave({ name, agencyName, bio, photo: photoPreview })
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  function applyTheme(t) {
    document.documentElement.classList.remove('dark')
    document.documentElement.removeAttribute('data-theme')
    if (t === 'dark') document.documentElement.classList.add('dark')
    else if (t !== 'light') document.documentElement.setAttribute('data-theme', t)
  }

  async function handleSavePreferences() {
    setSaving(true)
    try {
      await apiPut({ theme, default_view: defaultView, font_size: fontSize })
      applyTheme(theme)
      toast.success('Preferences saved')
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  async function handleSaveNotifications() {
    setSaving(true)
    try {
      await apiPut({ notifications: JSON.stringify(notifications) })
      toast.success('Notification settings saved')
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  async function handleGcalSync() {
    setGcalSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      toast.success(`Synced! ${data.result?.synced || 0} events`)
      if (data.connected === true) setGcalStatus('connected')
    } catch { toast.error('Calendar sync failed') }
    setGcalSyncing(false)
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/settings/export')
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `life-os-export-${new Date().toISOString().split('T')[0]}.json`
      a.click(); URL.revokeObjectURL(url)
      toast.success('Data exported')
    } catch { toast.error('Export failed') }
  }

  async function handleClearData() {
    if (clearConfirm !== 'DELETE') return
    try {
      const res = await fetch('/api/settings/clear', { method: 'POST' })
      if (!res.ok) throw new Error('Clear failed')
      toast.success('All data cleared')
      setClearConfirm('')
    } catch { toast.error('Clear failed') }
  }

  if (loading) return null

  return (
    <Modal open={open} onClose={onClose} maxWidth="xl" showClose={false} alignTop className="!p-0 overflow-hidden">
      <div className="flex flex-col max-h-[85vh]">
        <div className="relative overflow-hidden" style={{ background: 'var(--gradient-hero)', borderBottom: '1px solid var(--border-color)' }}>
          <motion.div className="absolute inset-0 opacity-20" style={{ background: 'var(--gradient-accent)' }} animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
          <div className="relative flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-4">
              <OrbitRing photo={photoPreview} />
              <div>
                <h2 className="text-subheading font-bold text-apple-text">{name || 'Your Name'}</h2>
                <p className="text-body text-apple-muted">{agencyName || 'Your Agency'}</p>
                <p className="text-micro text-apple-muted mt-0.5">{bio || 'No bio yet'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-apple-surface/50 text-apple-muted transition-colors"><X size={18} /></button>
          </div>
          <div className="flex gap-1 px-5 pb-0">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 text-small font-medium rounded-t-lg transition-all border-b-2 ${activeTab === tab.id ? 'border-apple-accent text-apple-text bg-apple-card/80' : 'border-transparent text-apple-muted hover:text-apple-text hover:bg-apple-surface/50'}`}>
                <tab.icon size={14} /><span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <div><label className="text-small font-medium text-apple-muted block mb-1.5">Full Name</label><input value={name} onChange={e => setName(e.target.value)} className="input-field" /></div>
                <div><label className="text-small font-medium text-apple-muted block mb-1.5">Agency Name</label><input value={agencyName} onChange={e => setAgencyName(e.target.value)} className="input-field" /></div>
                <div><label className="text-small font-medium text-apple-muted block mb-1.5">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} className="input-field min-h-[70px] resize-none" /></div>
                <div className="flex justify-end pt-2"><motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveProfile} className="btn-primary flex items-center gap-2">{saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Profile</motion.button></div>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div key="preferences" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                <div><label className="text-small font-medium text-apple-muted block mb-2">Theme</label><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{['light', 'dark', 'night', 'monk'].map(t => <ThemePreviewCard key={t} theme={t} current={theme} onSelect={setTheme} />)}</div></div>
                <div><label className="text-small font-medium text-apple-muted block mb-1.5">Default View</label><select value={defaultView} onChange={e => setDefaultView(e.target.value)} className="input-field"><option value="dashboard">Dashboard</option><option value="schedule">Schedule</option><option value="tasks">Tasks</option><option value="journal">Journal</option></select></div>
                <div><label className="text-small font-medium text-apple-muted block mb-1.5">Font Size</label><div className="flex gap-2">{[{ value: 'small', label: 'S' }, { value: 'medium', label: 'M' }, { value: 'large', label: 'L' }].map(opt => (<button key={opt.value} onClick={() => setFontSize(opt.value)} className={`flex-1 px-3 py-2 rounded-lg text-body font-medium border transition-all ${fontSize === opt.value ? 'border-apple-accent bg-apple-accent/5 text-apple-accent' : 'border-apple-border text-apple-muted hover:border-apple-text/20'}`}>{opt.label}</button>))}</div></div>
                <div className="flex justify-end pt-2"><motion.button whileTap={{ scale: 0.97 }} onClick={handleSavePreferences} className="btn-primary flex items-center gap-2">{saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Preferences</motion.button></div>
              </motion.div>
            )}

            {activeTab === 'connections' && (
              <motion.div key="connections" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                <ConnectionRow icon={Calendar} label="Google Calendar" description="Sync events and schedule" status={gcalStatus} onAction={gcalStatus === 'connected' ? handleGcalSync : null} actionLabel={gcalStatus === 'connected' ? 'Sync' : 'Connect'} actionLoading={gcalSyncing} />
                <ConnectionRow icon={Check} label="Google Tasks" description="Sync tasks across devices" status={tasksSyncStatus} actionLabel="Configure" />
                <ConnectionRow icon={BookOpen} label="Obsidian Vault" description="Journal auto-sync to vault" status={obsidianStatus} actionLabel="Configure" />
                <p className="text-small text-apple-muted pt-2 text-center">Configure API keys in Settings → Integrations</p>
              </motion.div>
            )}

            {activeTab === 'data' && (
              <motion.div key="data" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[{ icon: Calendar, color: '#0071E3', value: dataStats.events, label: 'Events synced' }, { icon: BookOpen, color: '#AF52DE', value: dataStats.entries, label: 'Journal entries' }, { icon: Target, color: '#34C759', value: dataStats.tasks, label: 'Tasks completed' }, { icon: Zap, color: '#FF9F0A', value: dataStats.habits, label: 'Habits tracked' }].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-apple-surface rounded-lg"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}><item.icon size={15} style={{ color: item.color }} /></div><div><div className="text-small font-medium text-apple-text">{item.value}</div><div className="text-micro text-apple-muted">{item.label}</div></div></div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2"><button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-body font-medium rounded-lg border border-apple-border text-apple-text hover:bg-apple-surface transition-colors"><Download size={15} /> Export Data</button></div>
                <div className="border-t border-apple-border pt-4"><p className="text-small font-medium text-apple-red mb-2">Danger Zone</p><div className="flex items-center gap-2"><input value={clearConfirm} onChange={e => setClearConfirm(e.target.value)} placeholder="Type DELETE to confirm" className="input-field flex-1 font-mono text-small" /><button onClick={handleClearData} disabled={clearConfirm !== 'DELETE'} className="px-4 py-2 text-body font-medium text-white rounded-lg disabled:opacity-50 transition-all" style={{ background: clearConfirm === 'DELETE' ? '#FF3B30' : 'var(--bg-surface)', color: clearConfirm === 'DELETE' ? '#fff' : 'var(--text-tertiary)' }}><Trash2 size={15} /></button></div></div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-1">
                {[{ key: 'prayer_reminder', label: 'Prayer Reminders', desc: 'Get notified before each prayer time' }, { key: 'task_due', label: 'Task Due Alerts', desc: 'Remind me when tasks are due' }, { key: 'habit_reminder', label: 'Habit Reminders', desc: 'Daily check-in for pending habits' }, { key: 'daily_review', label: 'Daily Review Prompt', desc: 'End-of-day review reminder' }, { key: 'motivational', label: 'Motivational Quotes', desc: 'Daily inspiration notifications' }].map(item => (
                  <div key={item.key} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-apple-surface transition-colors">
                    <div><div className="text-body font-medium text-apple-text">{item.label}</div><div className="text-micro text-apple-muted">{item.desc}</div></div>
                    <button onClick={() => setNotifications(p => ({ ...p, [item.key]: !p[item.key] }))} className={`relative w-10 h-5 rounded-full transition-colors ${notifications[item.key] ? 'bg-apple-green' : 'bg-apple-elevated'}`}>
                      <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ left: notifications[item.key] ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end pt-3"><motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveNotifications} className="btn-primary flex items-center gap-2">{saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Notifications</motion.button></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  )
}
