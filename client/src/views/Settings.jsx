import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Save, Trash2, Download, Upload, ExternalLink, Check, Key, Bell, FileText, RefreshCw, Sparkles } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import { useBackupStore } from '../store/backupStore'

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [newSettings, setNewSettings] = useState({})
  const [obsidianStatus, setObsidianStatus] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [gcalSyncing, setGcalSyncing] = useState(false)
  const [gcalStatus, setGcalStatus] = useState(null)
  const [clearConfirm, setClearConfirm] = useState('')

  useEffect(() => {
    fetchSettings()
    fetchGcalStatus()
  }, [])

  async function fetchGcalStatus() {
    try {
      const res = await fetch('/api/calendar/status')
      const data = await res.json()
      if (data.status) setGcalStatus(data.status)
    } catch {}
  }

  async function handleGcalSync() {
    setGcalSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      toast.success(`Synced! ${data.result.synced} events`)
      if (data.status) setGcalStatus(data.status)
    } catch { toast.error('Calendar sync failed') }
    finally { setGcalSyncing(false) }
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettings(data)
      setNewSettings(data)
    } catch (err) {
      console.error(err)
    }
  }

  async function saveSettings() {
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings) })
      if (!res.ok) throw new Error('Failed to save')
      setSyncStatus('Settings saved')
      setTimeout(() => setSyncStatus(null), 2000)
    } catch (err) {
      toast.error('Failed to save settings')
    }
  }

  function handleChange(key, value) {
    setNewSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/settings/export', { method: 'POST' })
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleClear() {
    if (clearConfirm !== 'DELETE') return
    try {
      await fetch('/api/settings/clear', { method: 'POST' })
      setClearConfirm('')
      setSyncStatus('All data cleared')
      setTimeout(() => setSyncStatus(null), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleGoogleConnect() {
    try {
      const res = await fetch('/api/auth/google')
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else if (data.error) toast.error(data.error)
    } catch (err) {
      toast.error('Server offline. Start with: npm run dev')
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="p-8 max-w-6xl mx-auto space-y-6 ">
      <div className="flex items-center justify-between">
        <h1 className="text-heading font-semibold ">Settings</h1>
        {syncStatus && (
          <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="badge-green flex items-center gap-1">
            <Check size={12} /> {syncStatus}
          </motion.span>
        )}
      </div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }} className="card">
        <div className="section-label mb-4">Profile</div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Name</label>
              <input
                type="text"
                value={newSettings.user_name || ''}
                onChange={e => handleChange('user_name', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Agency</label>
              <input
                type="text"
                value={newSettings.agency_name || ''}
                onChange={e => handleChange('agency_name', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Location</label>
              <input
                type="text"
                value={newSettings.city || ''}
                onChange={e => handleChange('city', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Country</label>
              <input
                type="text"
                value={newSettings.country || ''}
                onChange={e => handleChange('country', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Theme */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="card">
        <div className="section-label mb-3">Theme</div>
        <ThemeToggle />
      </motion.div>

      {/* AI API Key */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.033 }} className="card">
        <div className="section-label mb-2 flex items-center gap-2"><Sparkles size={14} className="text-apple-blue" /> AI Assistant</div>
        <p className="text-small text-apple-muted mb-3">Use a <strong className="text-apple-text">free</strong> Groq API key. No credit card needed. Sign up at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-apple-blue underline">groq.com/keys</a></p>
        <div className="space-y-2">
          <input id="groq-key" type="password" placeholder="gsk_... (Groq API key)" className="input-field" />
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={async () => {
              const key = document.getElementById('groq-key').value.trim()
              if (!key) { toast.error('Enter your Groq API key'); return }
              try {
                const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groq_key: key }) })
                if (!res.ok) throw new Error()
                toast.success('Groq key saved! AI is now active.')
              } catch { toast.error('Failed to save key') }
            }}
            className="btn-primary flex items-center gap-2 text-small">
            <Key size={14} /> Save AI Key
          </motion.button>
        </div>
      </motion.div>

      {/* Google OAuth Writer */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.035 }} className="card">
        <div className="section-label mb-3">Google OAuth Credentials</div>
        <div className="space-y-2">
          <input id="google-client-id" type="text" placeholder="Google Client ID" className="input-field" />
          <input id="google-client-secret" type="password" placeholder="Google Client Secret" className="input-field" />
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={async () => {
              const id = document.getElementById('google-client-id').value.trim()
              const secret = document.getElementById('google-client-secret').value.trim()
              if (!id || !secret) { toast.error('Enter both Client ID and Secret'); return }
              try {
                const res = await fetch('/api/settings/google-oauth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: secret }) })
                if (!res.ok) throw new Error()
                toast.success('Credentials saved! Restart server with: npm run dev')
              } catch { toast.error('Failed to save credentials') }
            }}
            className="btn-primary flex items-center gap-2 text-small">
            <Key size={14} /> Save Credentials
          </motion.button>
        </div>
      </motion.div>

      {/* Google Integration */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-label">Google Account</div>
          <span className="badge-gray text-micro">OAuth2</span>
        </div>
        <p className="text-body text-apple-muted mb-3">
          Connect your Google account to sync Calendar events and Tasks.
        </p>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleGoogleConnect} className="btn-primary flex items-center gap-2">
          <ExternalLink size={14} />           Connect Google Account
        </motion.button>
        <p className="text-micro text-apple-tertiary mt-2">
          Scopes: Calendar (read/write), Tasks (read/write)
        </p>
      </motion.div>

      {/* Google Calendar Sync */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="section-label">Google Calendar Sync</div>
          <span className="badge-gray text-micro">{gcalStatus?.eventCount || 0} events</span>
        </div>
        <p className="text-body text-apple-muted mb-3">
          Sync Google Calendar events into your Schedule view. Events are cached locally for fast access.
        </p>
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleGcalSync} disabled={gcalSyncing}
            className="btn-primary flex items-center gap-2">
            <RefreshCw size={14} className={gcalSyncing ? 'animate-spin' : ''} />
            {gcalSyncing ? 'Syncing...' : 'Sync Now'}
          </motion.button>
          {gcalStatus?.lastSync && (
            <span className="text-micro text-apple-muted">
              Last sync: {new Date(gcalStatus.lastSync).toLocaleString()}
            </span>
          )}
        </div>
      </motion.div>

      {/* Obsidian Integration */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="card">
        <div className="section-label mb-4">Obsidian Vault</div>
        <div className="space-y-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">Vault Path</label>
            <input
              type="text"
              value={newSettings.obsidian_path || ''}
              onChange={e => handleChange('obsidian_path', e.target.value)}
              placeholder="~/Documents/ObsidianVault/"
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-micro text-apple-muted block mb-1">Journal sub-folder</label>
              <input type="text" value="/Journal/" className="input-field text-apple-tertiary" disabled />
            </div>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Tasks sub-folder</label>
              <input type="text" value="/Tasks/" className="input-field text-apple-tertiary" disabled />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Prayer Settings */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card">
        <div className="section-label mb-4">Prayer Settings</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">City</label>
            <input
              type="text"
              value={newSettings.city || 'Casablanca'}
              onChange={e => handleChange('city', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Country</label>
            <input
              type="text"
              value={newSettings.country || 'Morocco'}
              onChange={e => handleChange('country', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-micro text-apple-muted block mb-1">Calculation Method</label>
          <select
            value={newSettings.prayer_method || '2'}
            onChange={e => handleChange('prayer_method', e.target.value)}
            className="input-field"
          >
            <option value="2">Muslim World League (Method 2)</option>
            <option value="1">University of Islamic Sciences, Karachi</option>
            <option value="3">Egyptian General Authority of Survey</option>
            <option value="4">Umm Al-Qura, Makkah</option>
            <option value="5">Dubai</option>
            <option value="12">Algeria</option>
            <option value="13">Kuwait</option>
            <option value="14">Qatar</option>
          </select>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="card">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-apple-muted" />
          <div className="section-label">Notifications</div>
        </div>
        <div className="space-y-3">
          {[
            { key: 'notify_prayer', label: 'Prayer Times', desc: 'Notify 10 minutes before each prayer' },
            { key: 'notify_schedule', label: 'Schedule Blocks', desc: 'Notify at block start time' },
            { key: 'notify_review', label: 'Daily Review Reminder', desc: 'Remind at 9:30 PM' },
            { key: 'notify_weekly', label: 'Weekly Summary', desc: 'Every Sunday at 8 PM' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-1">
              <div>
                <div className="text-body font-medium text-apple-text ">{n.label}</div>
                <div className="text-small text-apple-muted">{n.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={newSettings[n.key] !== '0'} onChange={e => handleChange(n.key, e.target.checked ? '1' : '0')}
                  className="sr-only peer" />
                <div className="w-9 h-5 bg-apple-border rounded-full peer peer-checked:bg-apple-blue after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[var(--toggle-knob)] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Backup & Restore */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.095 }} className="card">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-apple-muted" />
          <div className="section-label">Backup & Restore</div>
        </div>
        <div className="space-y-3">
          <button onClick={async () => { const b = useBackupStore.getState(); await b.createBackup(); b.fetchBackups() }} className="btn-ghost flex items-center gap-2 border border-apple-border rounded-input px-4 py-2 w-full justify-center">
            <Download size={16} /> Create Backup
          </button>
          <div className="flex gap-2">
            <input type="file" accept=".json" id="import-file" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const text = await file.text()
                const data = JSON.parse(text)
                await useBackupStore.getState().importData(data)
              } catch { toast.error('Invalid backup file') }
              e.target.value = ''
            }} />
            <button onClick={() => document.getElementById('import-file').click()} className="btn-ghost flex items-center gap-2 border border-apple-border rounded-input px-4 py-2 w-full justify-center">
              <Upload size={16} /> Import from JSON
            </button>
          </div>
          <AutoBackupList />
        </div>
      </motion.div>

      {/* Data Management */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }} className="card">
        <div className="section-label mb-4">Data</div>
        <div className="space-y-4">
          <button onClick={handleExport} className="btn-ghost flex items-center gap-2 border border-apple-border rounded-input px-4 py-2 w-full justify-center">
            <Download size={16} /> Export All Data (JSON)
          </button>
          <div className="pt-3 border-t border-apple-border">
            <label className="section-label block mb-2 text-apple-red">Danger Zone</label>
            <p className="text-small text-apple-muted mb-2">Type DELETE to confirm clearing all data</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={clearConfirm}
                onChange={e => setClearConfirm(e.target.value)}
                placeholder="Type DELETE"
                className="input-field flex-1"
              />
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={handleClear}
                disabled={clearConfirm !== 'DELETE'}
                className="btn-primary !bg-apple-red hover:!bg-red-600 disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 size={14} /> Clear
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* App Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card text-center">
        <p className="text-subheading font-semibold">Life OS v1.0</p>
        <p className="text-body text-apple-muted mt-1">Built for: Othmane Elcaidi</p>
        <p className="text-small text-apple-muted">Built with: React + Vite + SQLite + Express</p>
        <p className="text-small text-apple-tertiary italic mt-2">
          "Built in public. Rooted in faith. No shortcuts."
        </p>
      </motion.div>

      {/* Save Button */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={saveSettings} className="btn-primary w-full flex items-center justify-center gap-2">
        <Save size={16} /> Save Settings
      </motion.button>
    </motion.div>
  )
}

function AutoBackupList() {
  const { backups, loading, fetchBackups, restoreBackup } = useBackupStore()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { fetchBackups() }, [])

  return (
    <div className="pt-2 border-t border-apple-border">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-small text-apple-muted hover:text-apple-text transition-colors w-full text-left">
        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        {backups.length} backups available
        <span className="ml-auto">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {backups.length === 0 && <p className="text-small text-apple-muted text-center py-2">No backups yet</p>}
          {backups.map(b => (
            <div key={b.name} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-apple-surface transition-colors">
              <div className="min-w-0 flex-1">
                <div className="text-small truncate text-apple-text ">{b.name}</div>
                <div className="text-micro text-apple-muted">{(b.size / 1024).toFixed(1)} KB · {new Date(b.created).toLocaleString()}</div>
              </div>
              <button onClick={() => restoreBackup(b.name)} className="btn-ghost text-small px-2 py-1">Restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
