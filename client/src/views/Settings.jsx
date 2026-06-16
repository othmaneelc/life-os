import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Save, Trash2, Download, Upload, ExternalLink, Check, Key, Bell, RefreshCw, Sparkles, Globe, Send, MessageCircle, Smartphone } from 'lucide-react'
import { useLocale } from '../i18n/LocaleContext'
import ThemeToggle from '../components/ThemeToggle'
import BackupPanel from '../components/BackupPanel'
import { useImportData } from '../store/backupStore'
import { usePWAInstall } from '../hooks/usePWAInstall'

export default function Settings() {
  const { locale, setLocale } = useLocale()
  const { installable, promptInstall } = usePWAInstall()
  const [settings, setSettings] = useState({})
  const [newSettings, setNewSettings] = useState({})
  const [obsidianStatus, setObsidianStatus] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [gcalSyncing, setGcalSyncing] = useState(false)
  const [gcalStatus, setGcalStatus] = useState(null)
  const [clearConfirm, setClearConfirm] = useState('')
  const [importPreview, setImportPreview] = useState(null)
  const [importFile, setImportFile] = useState(null)
  const [telegramRunning, setTelegramRunning] = useState(false)
  const [telegramRestarting, setTelegramRestarting] = useState(false)
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)
  const importMutation = useImportData()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchSettings()
    fetchGcalStatus()
    fetchBotStatus()
    return () => { mountedRef.current = false }
  }, [])

  async function fetchBotStatus() {
    try {
      const [tg, wa] = await Promise.all([
        fetch('/api/bots/telegram/status').then(r => r.ok ? r.json() : ({ running: false })).catch(() => ({ running: false })),
        fetch('/api/bots/whatsapp/status').then(r => r.ok ? r.json() : ({ configured: false })).catch(() => ({ configured: false })),
      ])
      if (!mountedRef.current) return
      setTelegramRunning(tg.running)
      setWhatsappConfigured(wa.configured)
    } catch {}
  }

  async function handleTelegramRestart() {
    setTelegramRestarting(true)
    try {
      const res = await fetch('/api/bots/telegram/restart', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTelegramRunning(data.running)
      toast.success(data.running ? 'Bot restarted' : 'Failed to start bot (check token)')
    } catch { toast.error('Failed to restart bot') }
    finally { setTelegramRestarting(false) }
  }

  async function fetchGcalStatus() {
    try {
      const res = await fetch('/api/calendar/status')
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (mountedRef.current && data.status) setGcalStatus(data.status)
    } catch { if (mountedRef.current) console.error('fetchGcalStatus failed') }
  }

  async function handleGcalSync() {
    setGcalSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      if (!res.ok) throw new Error()
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
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (!mountedRef.current) return
      setSettings(data)
      setNewSettings(data)
    } catch (err) {
      toast.error('Failed to load settings')
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
      const res = await fetch('/api/export/json')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error('Failed to export data')
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) { setImportPreview(null); setImportFile(null); return }
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const preview = Object.entries(data)
          .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
          .map(([table, rows]) => ({ table, count: rows.length }))
        setImportPreview(preview)
      } catch { toast.error('Invalid JSON file'); setImportPreview(null) }
    }
    reader.readAsText(file)
  }

  function handleImport() {
    if (!importPreview || !importFile) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        importMutation.mutate(data, {
          onSuccess: () => { setImportPreview(null); setImportFile(null) },
        })
      } catch { toast.error('Failed to read file') }
    }
    reader.readAsText(importFile)
  }

  async function handleClear() {
    if (clearConfirm !== 'DELETE') return
    try {
      await fetch('/api/settings/clear', { method: 'POST' })
      setClearConfirm('')
      setSyncStatus('All data cleared')
      setTimeout(() => setSyncStatus(null), 3000)
    } catch (err) {
      toast.error('Failed to clear data')
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

      {/* Language */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.035 }} className="card">
        <div className="section-label mb-3 flex items-center gap-2"><Globe size={14} className="text-apple-blue" /> Language</div>
        <div className="flex items-center gap-4">
          <label className={`flex items-center gap-2 text-small cursor-pointer ${locale === 'en' ? 'text-apple-text font-medium' : 'text-apple-muted'}`}>
            <input type="radio" name="lang" checked={locale === 'en'} onChange={() => setLocale('en')} className="text-apple-accent" /> English
          </label>
          <label className={`flex items-center gap-2 text-small cursor-pointer ${locale === 'ar' ? 'text-apple-text font-medium' : 'text-apple-muted'}`}>
            <input type="radio" name="lang" checked={locale === 'ar'} onChange={() => setLocale('ar')} className="text-apple-accent" /> العربية
          </label>
        </div>
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
        <div className="mt-3">
          <label className="text-micro text-apple-muted block mb-1">Voice Input Language</label>
          <select value={newSettings.voice_lang || 'en-US'} onChange={e => handleChange('voice_lang', e.target.value)}
            className="input-field">
            <option value="en-US">English (US)</option>
            <option value="ar-SA">Arabic (Saudi Arabia)</option>
            <option value="fr-FR">French (France)</option>
            <option value="es-ES">Spanish (Spain)</option>
          </select>
        </div>
      </motion.div>

      {/* Email Briefing */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.035 }} className="card">
        <div className="section-label mb-2 flex items-center gap-2"><Send size={14} className="text-apple-blue" /> Daily Email Briefing</div>
        <p className="text-small text-apple-muted mb-3">Sends the AI briefing to your inbox at a scheduled time each day.</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">SMTP Host</label>
            <input type="text" value={newSettings.briefing_smtp_host || ''} onChange={e => handleChange('briefing_smtp_host', e.target.value)} placeholder="smtp.gmail.com" className="input-field" />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">SMTP Port</label>
            <input type="number" value={newSettings.briefing_smtp_port || '587'} onChange={e => handleChange('briefing_smtp_port', e.target.value)} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">SMTP User</label>
            <input type="text" value={newSettings.briefing_smtp_user || ''} onChange={e => handleChange('briefing_smtp_user', e.target.value)} placeholder="your@email.com" className="input-field" />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">SMTP Password</label>
            <input type="password" value={newSettings.briefing_smtp_pass || ''} onChange={e => handleChange('briefing_smtp_pass', e.target.value)} placeholder="App password" className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">Recipient Email</label>
            <input type="email" value={newSettings.briefing_email || ''} onChange={e => handleChange('briefing_email', e.target.value)} placeholder="you@example.com" className="input-field" />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Send Time (24h)</label>
            <input type="time" value={newSettings.briefing_time || '07:00'} onChange={e => handleChange('briefing_time', e.target.value)} className="input-field" />
          </div>
        </div>
      </motion.div>

      {/* Google OAuth Writer */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="card">
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.045 }} className="card">
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.055 }} className="card">
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
        <div className="section-label mb-4 flex items-center gap-2">🕌 Prayer Settings</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">City</label>
            <input
              type="text"
              value={newSettings.city || 'Casablanca'}
              onChange={e => handleChange('city', e.target.value)}
              className="input-field"
              placeholder="e.g. Casablanca"
            />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Country</label>
            <input
              type="text"
              value={newSettings.country || 'Morocco'}
              onChange={e => handleChange('country', e.target.value)}
              className="input-field"
              placeholder="e.g. Morocco"
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
            <option value="0">Shia Ithna Ashari (Jafari)</option>
            <option value="1">University of Islamic Sciences, Karachi (Hanafi)</option>
            <option value="2">Islamic Society of North America (ISNA)</option>
            <option value="3">Muslim World League (MWL)</option>
            <option value="4">Umm Al-Qura University, Makkah</option>
            <option value="5">Egyptian General Authority of Survey</option>
            <option value="7">Institute of Geophysics, University of Tehran</option>
            <option value="8">Gulf Region</option>
            <option value="9">Kuwait</option>
            <option value="10">Qatar</option>
            <option value="11">Majlis Ugama Islam Singapura, Singapore</option>
            <option value="12">Union Organization islamic de France (UOIF)</option>
            <option value="13">Diyanet İşleri Başkanlığı, Turkey (Diyanet)</option>
            <option value="14">Spiritual Administration of Muslims of Russia</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-body font-medium text-apple-text">Adhan Audio</div>
            <div className="text-small text-apple-muted">Play the call to prayer at each prayer time</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={newSettings.notify_adhan !== '0'} onChange={e => handleChange('notify_adhan', e.target.checked ? '1' : '0')}
              className="sr-only peer" />
            <div className="w-9 h-5 bg-apple-border rounded-full peer peer-checked:bg-apple-green after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[var(--toggle-knob)] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
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

      {/* Push Notifications */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.095 }} className="card">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-apple-muted" />
          <div className="section-label">Push Notifications</div>
        </div>
        <div className="space-y-3">
          {[
            { key: 'push_prayer', label: 'Prayer Reminders', desc: 'Push before each prayer time' },
            { key: 'push_summary', label: 'Daily Briefing', desc: 'Morning summary every day' },
            { key: 'push_review', label: 'Evening Review', desc: 'Daily review push at 9 PM' },
            { key: 'push_weekly', label: 'Weekly Report', desc: 'Weekly summary push on Sunday' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-1">
              <div>
                <div className="text-body font-medium text-apple-text ">{n.label}</div>
                <div className="text-small text-apple-muted">{n.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={newSettings[n.key] !== '0'} onChange={e => handleChange(n.key, e.target.checked ? '1' : '0')}
                  className="sr-only peer" />
                <div className="w-9 h-5 bg-apple-border rounded-full peer peer-checked:bg-apple-green after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[var(--toggle-knob)] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Keyboard Shortcuts */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.095 }} className="card">
        <div className="section-label mb-4">Keyboard Shortcuts</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { key: 'shortcut_dashboard', label: 'Dashboard', default: 'Ctrl+1' },
            { key: 'shortcut_schedule', label: 'Schedule', default: 'Ctrl+2' },
            { key: 'shortcut_tasks', label: 'Tasks', default: 'Ctrl+3' },
            { key: 'shortcut_journal', label: 'Journal', default: 'Ctrl+4' },
            { key: 'shortcut_prayers', label: 'Prayer Tracker', default: 'Ctrl+5' },
            { key: 'shortcut_habits', label: 'Habits', default: 'Ctrl+6' },
            { key: 'shortcut_agency', label: 'Agency', default: 'Ctrl+7' },
            { key: 'shortcut_command', label: 'Command Palette', default: 'Ctrl+K' },
            { key: 'shortcut_goals', label: 'Goals', default: 'Ctrl+8' },
            { key: 'shortcut_finance', label: 'Finance', default: 'Ctrl+9' },
            { key: 'shortcut_settings', label: 'Settings', default: 'Ctrl+0' },
            { key: 'shortcut_search', label: 'Universal Search', default: 'Ctrl+Shift+F' },
          ].map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-apple-surface transition-colors">
              <span className="text-small text-apple-text">{s.label}</span>
              <kbd className="px-2 py-0.5 text-micro font-mono rounded bg-apple-surface border border-apple-border text-apple-muted">
                {newSettings[s.key] || s.default}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-micro text-apple-muted mt-3">Customize in settings file or edit shortcuts above</p>
      </motion.div>

      {/* Telegram Bot */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }} className="card">
        <div className="section-label mb-3 flex items-center gap-2"><MessageCircle size={14} className="text-blue-400" /> Telegram Bot</div>
        <p className="text-small text-apple-muted mb-3">Connect your Telegram bot to send and process messages. Create a bot via @BotFather on Telegram.</p>
        <div className="space-y-3 mb-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">Bot Token</label>
            <input type="password" value={newSettings.telegram_bot_token || ''} onChange={e => handleChange('telegram_bot_token', e.target.value)} placeholder="123456:ABC-DEF..." className="input-field" />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Allowed Chat IDs (comma-separated, leave empty for all)</label>
            <input type="text" value={newSettings.telegram_chat_id || ''} onChange={e => handleChange('telegram_chat_id', e.target.value)} placeholder="123456789, 987654321" className="input-field" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-small text-apple-muted">Status: <span className={`font-medium ${telegramRunning ? 'text-green-400' : 'text-red-400'}`}>{telegramRunning ? 'Running' : 'Stopped'}</span></span>
            <button onClick={handleTelegramRestart} className="btn-ghost flex items-center gap-1.5 border border-apple-border rounded-input px-3 py-1.5 text-small">
              <RefreshCw size={12} className={telegramRestarting ? 'animate-spin' : ''} /> Restart
            </button>
          </div>
        </div>
      </motion.div>

      {/* WhatsApp Bot */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.105 }} className="card">
        <div className="section-label mb-3 flex items-center gap-2"><Smartphone size={14} className="text-green-400" /> WhatsApp Bot</div>
        <p className="text-small text-apple-muted mb-3">Powered by Twilio. Set up a WhatsApp Sandbox in your Twilio console and point the webhook to your server.</p>
        <div className="space-y-3 mb-3">
          <div>
            <label className="text-micro text-apple-muted block mb-1">Account SID</label>
            <input type="text" value={newSettings.whatsapp_account_sid || ''} onChange={e => handleChange('whatsapp_account_sid', e.target.value)} placeholder="ACxxxxxxxxxxxx" className="input-field" />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Auth Token</label>
            <input type="password" value={newSettings.whatsapp_auth_token || ''} onChange={e => handleChange('whatsapp_auth_token', e.target.value)} placeholder="Auth Token" className="input-field" />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Twilio WhatsApp Number</label>
            <input type="text" value={newSettings.whatsapp_phone_number || ''} onChange={e => handleChange('whatsapp_phone_number', e.target.value)} placeholder="+14155238886" className="input-field" />
          </div>
          <div>
            <label className="text-micro text-apple-muted block mb-1">Webhook URL (set in Twilio Console)</label>
            <code className="text-micro text-apple-blue block p-2 rounded bg-apple-surface break-all">{window.location.origin}/api/webhooks/whatsapp</code>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-small text-apple-muted">Status: <span className={`font-medium ${whatsappConfigured ? 'text-green-400' : 'text-yellow-400'}`}>{whatsappConfigured ? 'Configured' : 'Not configured'}</span></span>
          </div>
        </div>
      </motion.div>

      {/* Data Management */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }} className="card">
        <div className="section-label mb-4">Data</div>
        <div className="space-y-4">
          <button onClick={handleExport} className="btn-ghost flex items-center gap-2 border border-apple-border rounded-input px-4 py-2 w-full justify-center">
            <Download size={16} /> Export All Data (JSON)
          </button>
          <div className="grid grid-cols-2 gap-2">
            {['tasks', 'habits', 'journal_entries', 'finance_transactions'].map(t => (
              <a key={t} href={`/api/export/csv/${t}`} download
                className="btn-ghost flex items-center gap-1.5 border border-apple-border rounded-input px-3 py-1.5 text-small justify-center"
              >
                <Download size={12} /> {t.replace('_', ' ').replace('entries', 'journal')}
              </a>
            ))}
          </div>

          <button onClick={async () => {
            try {
              await fetch('/api/search/reindex', { method: 'POST' })
              toast.success('Search index rebuilt')
            } catch { toast.error('Failed to rebuild search index') }
          }} className="btn-ghost flex items-center gap-2 border border-apple-border rounded-input px-4 py-2 w-full justify-center">
            <RefreshCw size={16} /> Rebuild Search Index
          </button>

          {/* Import */}
          <div className="pt-3 border-t border-apple-border">
            <label className="section-label block mb-2">Import Data</label>
            <p className="text-small text-apple-red mb-2">This will replace all existing data. Backup first!</p>
            <input type="file" accept=".json" onChange={handleFileSelect} className="input-field text-small mb-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-small file:bg-apple-surface file:text-apple-text" />
            {importPreview && (
              <div className="mb-3 p-3 rounded-lg bg-apple-surface">
                <p className="text-small font-medium text-apple-text mb-2">Tables to import:</p>
                {importPreview.map(({ table, count }) => (
                  <div key={table} className="flex justify-between text-small text-apple-muted">
                    <span>{table}</span>
                    <span>{count} rows</span>
                  </div>
                ))}
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleImport} disabled={importMutation.isPending}
                  className="btn-primary flex items-center gap-2 w-full justify-center mt-3"
                >
                  <Upload size={14} /> {importMutation.isPending ? 'Importing...' : 'Import'}
                </motion.button>
              </div>
            )}
          </div>

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

      {/* Backup & Restore */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
        <BackupPanel />
      </motion.div>

      {installable && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.115 }} className="card">
          <div className="section-label mb-2 flex items-center gap-2"><Smartphone size={14} className="text-apple-blue" /> App Install</div>
          <p className="text-small text-apple-muted mb-3">Install Life OS on your device for offline access and a native-like experience.</p>
          <motion.button whileTap={{ scale: 0.97 }} onClick={promptInstall} className="btn-primary flex items-center gap-2 text-small">
            <Download size={14} /> Install App
          </motion.button>
        </motion.div>
      )}

      {/* App Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card text-center">
        <p className="text-subheading font-semibold">Life OS v1.0</p>
        <p className="text-body text-apple-muted mt-1">Life OS</p>
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


