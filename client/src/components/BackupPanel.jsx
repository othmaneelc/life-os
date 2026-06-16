import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Download, RefreshCw, Clock, Shield, Database } from 'lucide-react'
import { extractArray } from '../utils/api'

export default function BackupPanel() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [restoringId, setRestoringId] = useState(null)
  const [showConfirm, setShowConfirm] = useState(null)
  const [expandedList, setExpandedList] = useState(false)
  const [config, setConfig] = useState({ enabled: false, interval_hours: 24, encryption_key: '' })
  const [configDirty, setConfigDirty] = useState({ enabled: false, interval_hours: 24, encryption_key: '' })
  const [configSaving, setConfigSaving] = useState(false)

  useEffect(() => {
    fetchBackups()
    fetchConfig()
  }, [])

  async function fetchBackups() {
    setLoading(true)
    try {
      const res = await fetch('/api/backup/list')
      if (!res.ok) throw new Error()
      setBackups(extractArray(await res.json()))
    } catch { toast.error('Failed to load backups') }
    finally { setLoading(false) }
  }

  async function fetchConfig() {
    try {
      const res = await fetch('/api/backup/config')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConfig(data)
      setConfigDirty({ enabled: !!data.enabled, interval_hours: data.interval_hours || 24, encryption_key: data.encryption_key || '' })
    } catch {}
  }

  async function handleCreateBackup() {
    setCreating(true)
    try {
      const res = await fetch('/api/backup/create', { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Backup created successfully')
      await fetchBackups()
    } catch { toast.error('Failed to create backup') }
    finally { setCreating(false) }
  }

  async function confirmRestore(id) {
    setRestoringId(id)
    setShowConfirm(null)
    try {
      const res = await fetch(`/api/backup/restore/${encodeURIComponent(id)}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Backup restored successfully')
    } catch { toast.error('Failed to restore backup') }
    finally { setRestoringId(null) }
  }

  async function handleSaveConfig() {
    setConfigSaving(true)
    try {
      const body = { ...configDirty, interval_hours: configDirty.interval_hours }
      delete body.interval
      const res = await fetch('/api/backup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg
        try { const j = JSON.parse(text); msg = j.error } catch { msg = text || `Server error ${res.status}` }
        throw new Error(msg)
      }
      setConfig(configDirty)
      toast.success('Auto-backup config saved')
    } catch (err) { toast.error(err.message || 'Failed to save config') }
    finally { setConfigSaving(false) }
  }

  const lastBackup = backups.length > 0
    ? new Date(Math.max(...backups.map(b => new Date(b.created || b.date).getTime()))).toLocaleString()
    : 'Never'

  let nextBackup = 'Auto-backup disabled'
  if (config.enabled && backups.length > 0) {
    const hours = config.interval_hours || 24
    const lastTime = Math.max(...backups.map(b => new Date(b.created || b.date).getTime()))
    nextBackup = new Date(lastTime + hours * 3600000).toLocaleString()
  } else if (config.enabled) {
    nextBackup = 'After first backup'
  }

  return (
    <div className="card-glass space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Database size={16} className="text-apple-blue" />
        <div className="section-label">Backup & Restore</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg-surface)] rounded-lg p-3 text-center">
          <div className="text-micro text-apple-muted">Last Backup</div>
          <div className="text-small font-medium text-apple-text mt-0.5 truncate" title={lastBackup}>{lastBackup}</div>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-lg p-3 text-center">
          <div className="text-micro text-apple-muted">Next Schedule</div>
          <div className="text-small font-medium text-apple-text mt-0.5 truncate" title={nextBackup}>{nextBackup}</div>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-lg p-3 text-center">
          <div className="text-micro text-apple-muted">Backups</div>
          <div className="text-small font-medium text-apple-text mt-0.5">{backups.length}</div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleCreateBackup}
        disabled={creating}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {creating ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        {creating ? 'Creating Backup...' : 'Create Backup'}
      </motion.button>

      <div className="pt-2 border-t border-[var(--border-glass)]">
        <button
          onClick={() => setExpandedList(!expandedList)}
          className="flex items-center gap-2 text-small text-apple-muted hover:text-apple-text transition-colors w-full text-left"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {backups.length} backup{backups.length !== 1 ? 's' : ''} available
          <span className="ml-auto">{expandedList ? '▲' : '▼'}</span>
        </button>

        {expandedList && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {backups.length === 0 && (
              <p className="text-small text-apple-muted text-center py-2">No backups yet</p>
            )}
            {backups.map(b => {
              const id = b.id || b.name || b.filename
              const size = b.size || 0
              const created = b.created || b.date
              const status = b.status || 'completed'
              return (
                <div key={id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[var(--bg-surface)] transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-small truncate text-apple-text">{b.filename || b.name}</div>
                    <div className="text-micro text-apple-muted">
                      {(size / 1024).toFixed(1)} KB · {new Date(created).toLocaleString()}
                      {status !== 'completed' && (
                        <span className={`ml-1 ${status === 'failed' ? 'text-apple-red' : 'text-apple-amber'}`}>
                          · {status}
                        </span>
                      )}
                    </div>
                  </div>
                  {showConfirm === id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => confirmRestore(id)}
                        className="text-micro px-2 py-1 rounded-md bg-apple-red text-white font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowConfirm(null)}
                        className="text-micro px-2 py-1 rounded-md bg-[var(--bg-surface)] text-apple-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : restoringId === id ? (
                    <RefreshCw size={14} className="animate-spin text-apple-muted shrink-0" />
                  ) : (
                    <button
                      onClick={() => setShowConfirm(id)}
                      className="btn-ghost text-small px-2 py-1 shrink-0"
                    >
                      Restore
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[var(--border-glass)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-apple-muted" />
            <span className="text-body font-medium text-apple-text">Auto-backup</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={configDirty.enabled}
              onChange={e => setConfigDirty(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--border-color)] rounded-full peer peer-checked:bg-apple-blue after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[var(--toggle-knob)] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>

        {configDirty.enabled && (
          <>
            <div>
              <label className="text-micro text-apple-muted block mb-1">Backup Interval</label>
              <select
                value={configDirty.interval_hours}
                onChange={e => setConfigDirty(prev => ({ ...prev, interval_hours: Number(e.target.value) }))}
                className="input-field"
              >
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
                <option value={48}>Every 48 hours</option>
                <option value={168}>Weekly</option>
              </select>
            </div>

            <div>
              <label className="text-micro text-apple-muted block mb-1">Encryption Key (optional)</label>
              <input
                type="password"
                value={configDirty.encryption_key}
                onChange={e => setConfigDirty(prev => ({ ...prev, encryption_key: e.target.value }))}
                placeholder="Enter encryption key"
                className="input-field"
              />
            </div>
          </>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSaveConfig}
          disabled={configSaving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {configSaving ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Shield size={14} />
          )}
          {configSaving ? 'Saving...' : 'Save Config'}
        </motion.button>
      </div>
    </div>
  )
}
