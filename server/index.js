require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { getDatabase } = require('./db/database')
const { runMigrations } = require('./db/migrations')
const { seed } = require('./db/seed')
const { startWatcher } = require('./services/obsidianSync')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Routes
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/journal', require('./routes/journal'))
app.use('/api/prayers', require('./routes/prayers'))
app.use('/api/habits', require('./routes/habits'))
app.use('/api/agency', require('./routes/agency'))
app.use('/api/schedule', require('./routes/schedule'))
app.use('/api/settings', require('./routes/settings'))
app.use('/api/calendar', require('./routes/calendar'))
app.use('/api/tasksync', require('./routes/tasksync'))
app.use('/api/reviews', require('./routes/reviews'))
app.use('/api/pomodoro', require('./routes/pomodoro'))
app.use('/api/knowledge', require('./routes/knowledge'))
app.use('/api/reports', require('./routes/reports'))
app.use('/api/finance', require('./routes/finance'))
app.use('/api/auth', require('./routes/auth'))
app.use('/api/backup', require('./routes/backup'))
app.use('/api/goals', require('./routes/goals'))
app.use('/api/books', require('./routes/books'))
app.use('/api/ai', require('./routes/ai'))

// Handle Google OAuth callback at the path registered in Google Cloud Console
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { handleCallback } = require('./services/googleAuth')
    const { code } = req.query
    if (!code) return res.status(400).json({ error: 'No authorization code provided' })
    await handleCallback(code)
    res.redirect('http://localhost:5173/settings?google=connected')
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

async function start() {
  getDatabase()
  await runMigrations()
  seed()

  // Restore Google credentials from database as fallback for .env
  try {
    const { query } = require("./db/database")
    const idRow = query("SELECT value FROM settings WHERE key = ?", ["google_client_id"])
    const secretRow = query("SELECT value FROM settings WHERE key = ?", ["google_client_secret"])
    if (idRow.length && !process.env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = idRow[0].value
    if (secretRow.length && !process.env.GOOGLE_CLIENT_SECRET) process.env.GOOGLE_CLIENT_SECRET = secretRow[0].value
  } catch (e) { console.error("Failed to restore Google creds from DB:", e.message) }

  app.listen(PORT, () => {
    console.log(`Life OS server running on http://localhost:${PORT}`)
    try { startWatcher() } catch (e) { console.error('Obsidian watcher:', e.message) }
    // Auto-backup every 24 hours
    const BACKUP_DIR = path.join(__dirname, '../data/backups')
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
    setInterval(() => {
      try {
        const { query } = require('./db/database')
        const tables = query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'kb_fts%' ORDER BY name")
        const data = {}
        tables.forEach(t => { data[t.name] = query(`SELECT * FROM "${t.name}"`) })
        const filename = `auto-lifeos-${new Date().toISOString().split('T')[0]}.json`
        fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(data, null, 2))
        console.log(`Auto-backup saved: ${filename}`)
      } catch (e) { console.error('Auto-backup failed:', e.message) }
    }, 86400000)
    // Auto-sync Google Calendar on startup if connected
    try {
      const { getGoogleAuth } = require('./services/googleAuth')
      const auth = getGoogleAuth()
      if (auth) {
        const { syncEvents } = require('./services/googleCalendarSync')
        syncEvents(auth).then(r => console.log(`Google Calendar auto-sync: ${r.synced} synced, ${r.removed} removed`)).catch(e => console.error('Google Calendar auto-sync:', e.message))
      }
    } catch (e) { console.error('Google Calendar auto-sync init:', e.message) }
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

