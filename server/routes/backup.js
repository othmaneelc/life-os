const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { query, run, get, getDatabase } = require('../db/database')
const logger = require('../services/logger')

const router = express.Router()
const BACKUP_DIR = path.join(__dirname, '../data/backups')

run(`CREATE TABLE IF NOT EXISTS backup_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT DEFAULT 'local',
  settings TEXT DEFAULT '{}',
  last_backup DATETIME,
  next_backup DATETIME,
  enabled INTEGER DEFAULT 0,
  interval_hours INTEGER DEFAULT 24,
  encryption_key TEXT
)`)

run(`CREATE TABLE IF NOT EXISTS backup_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  size INTEGER,
  provider TEXT,
  status TEXT DEFAULT 'completed',
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`)

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })

function getTables() {
  return query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'kb_fts%' AND name NOT IN ('backup_config', 'backup_history') ORDER BY name").map(r => r.name)
}

function exportAllData() {
  const tables = getTables()
  const data = {}
  for (const table of tables) {
    data[table] = query(`SELECT * FROM "${table}"`)
  }
  return data
}

function generateFilename() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `lifeos-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function encryptData(data, encryptionKey) {
  const key = crypto.scryptSync(encryptionKey, 'lifeos-backup-salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(JSON.stringify(data), 'utf-8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decryptData(encryptedData, encryptionKey) {
  const key = crypto.scryptSync(encryptionKey, 'lifeos-backup-salt', 32)
  const parts = encryptedData.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')
  return JSON.parse(decrypted)
}

function createBackup() {
  const config = get('SELECT * FROM backup_config WHERE id = 1')
  const provider = config ? config.provider : 'local'
  const encryptionKey = config ? config.encryption_key : null

  const data = exportAllData()
  const filename = generateFilename()
  const isEncrypted = !!(encryptionKey && encryptionKey.length > 0)
  const ext = isEncrypted ? '.enc' : '.json'
  const fullFilename = filename + ext
  const filePath = path.join(BACKUP_DIR, fullFilename)

  let fileContent
  if (isEncrypted) {
    fileContent = encryptData(data, encryptionKey)
  } else {
    fileContent = JSON.stringify(data, null, 2)
  }

  fs.writeFileSync(filePath, fileContent, 'utf-8')
  const size = fs.statSync(filePath).size

  run(`INSERT INTO backup_history (filename, size, provider, status) VALUES (?, ?, ?, 'completed')`,
    [fullFilename, size, provider])

  const now = new Date().toISOString()
  const next = new Date(Date.now() + (config ? config.interval_hours : 24) * 3600000).toISOString()
  if (config) {
    run(`UPDATE backup_config SET last_backup = ?, next_backup = ? WHERE id = 1`, [now, next])
  }

  return { success: true, filename: fullFilename, size, path: filePath }
}

router.post('/create', (req, res) => {
  try {
    const result = createBackup()
    res.json(result)
  } catch (err) {
    logger.error({ err }, 'Backup creation failed')
    handleError(res, err)
  }
})

router.get('/list', (req, res) => {
  try {
    const backups = query('SELECT * FROM backup_history ORDER BY created_at DESC')
    res.json(backups)
  } catch (err) { handleError(res, err) }
})

router.post('/restore/:id', (req, res) => {
  try {
    const backup = get('SELECT * FROM backup_history WHERE id = ?', [req.params.id])
    if (!backup) return res.status(404).json({ success: false, error: 'Backup not found' })

    const filePath = path.join(BACKUP_DIR, backup.filename)
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Backup file not found' })

    const config = get('SELECT * FROM backup_config WHERE id = 1')
    const encryptionKey = config ? config.encryption_key : null

    let data
    if (backup.filename.endsWith('.enc')) {
      if (!encryptionKey) return res.status(400).json({ success: false, error: 'Encryption key not configured' })
      const encrypted = fs.readFileSync(filePath, 'utf-8')
      data = decryptData(encrypted, encryptionKey)
    } else {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }

    const db = getDatabase()
    const tables = Object.keys(data)
    const restoredTables = []

    try {
      const restoreTransaction = db.transaction(() => {
        for (const table of tables) {
          const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table)
          if (!exists) continue
          db.prepare(`DELETE FROM "${table.replace(/"/g, '""')}"`).run()
          const rows = data[table]
          if (!rows || !rows.length) continue
          const columns = Object.keys(rows[0])
          const safeColumns = columns.map(c => `"${c.replace(/"/g, '""')}"`).join(', ')
          const placeholders = columns.map(() => '?').join(', ')
          const insertStmt = db.prepare(`INSERT INTO "${table.replace(/"/g, '""')}" (${safeColumns}) VALUES (${placeholders})`)
          for (const row of rows) {
            try {
              insertStmt.run(columns.map(c => row[c] ?? null))
            } catch (e) {
              logger.warn({ table, err: e.message }, 'Skipping row during restore')
            }
          }
          restoredTables.push(table)
        }
      })
      restoreTransaction()
    } finally {
      // db intentionally NOT closed — it is the shared singleton
    }

    res.json({ success: true, tables_restored: restoredTables })
  } catch (err) { handleError(res, err) }
})

router.post('/config', (req, res) => {
  try {
    const { provider, settings, interval_hours, encryption_key, enabled } = req.body
    const existing = get('SELECT * FROM backup_config WHERE id = 1')

    if (existing) {
      run(`UPDATE backup_config SET
        provider = ?,
        settings = ?,
        interval_hours = ?,
        encryption_key = ?,
        enabled = ?
        WHERE id = 1`,
        provider ?? existing.provider,
        settings ? JSON.stringify(settings) : existing.settings,
        interval_hours ?? existing.interval_hours,
        encryption_key !== undefined ? encryption_key : existing.encryption_key,
        enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled)
    } else {
      run(`INSERT INTO backup_config (provider, settings, interval_hours, encryption_key, enabled) VALUES (?, ?, ?, ?, ?)`,
        provider || 'local',
        settings ? JSON.stringify(settings) : '{}',
        interval_hours || 24,
        encryption_key !== undefined ? encryption_key : null,
        enabled ? 1 : 0)
    }

    setupAutoBackup()

    const config = get('SELECT id, provider, settings, last_backup, next_backup, enabled, interval_hours FROM backup_config WHERE id = 1')
    res.json({ success: true, config })
  } catch (err) { handleError(res, err) }
})

router.get('/config', (req, res) => {
  try {
    const config = get('SELECT id, provider, settings, last_backup, next_backup, enabled, interval_hours FROM backup_config WHERE id = 1')
    if (!config) return res.json({ provider: 'local', settings: '{}', enabled: 0, interval_hours: 24 })
    res.json(config)
  } catch (err) { handleError(res, err) }
})

router.post('/schedule', (req, res) => {
  try {
    const config = get('SELECT * FROM backup_config WHERE id = 1')
    if (!config || !config.enabled) {
      return res.json({ success: false, message: 'Auto-backup is not enabled' })
    }
    setupAutoBackup()
    res.json({ success: true, message: `Auto-backup scheduled every ${config.interval_hours} hours` })
  } catch (err) { handleError(res, err) }
})

let autoBackupTimer = null

function setupAutoBackup() {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer)
    autoBackupTimer = null
  }

  const config = get('SELECT * FROM backup_config WHERE id = 1')
  if (!config || !config.enabled) return

  const intervalMs = (config.interval_hours || 24) * 3600000

  autoBackupTimer = setInterval(() => {
    try {
      const result = createBackup()
      logger.info({ filename: result.filename, size: result.size }, 'Auto-backup completed')
    } catch (e) {
      logger.error({ err: e }, 'Auto-backup failed')
    }
  }, intervalMs)

  logger.info({ interval_hours: config.interval_hours }, 'Auto-backup scheduled')
}

const initialConfig = get('SELECT * FROM backup_config WHERE id = 1')
if (initialConfig && initialConfig.enabled) {
  setupAutoBackup()
}

module.exports = router
