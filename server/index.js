require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const rateLimit = require('express-rate-limit')
const { getDatabase } = require('./db/database')
const { runMigrations } = require('./db/migrations')
const { seed } = require('./db/seed')
const { startWatcher } = require('./services/obsidianSync')
const logger = require('./services/logger')
const { errorMiddleware, handleError } = require('./middleware/errorHandler')
const { requireAuth } = require('./middleware/auth')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Request logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (req.path.startsWith('/api')) {
      logger.info({ method: req.method, path: req.path, status: res.statusCode, duration: duration + 'ms' }, 'API request')
    }
  })
  next()
})

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, slow down' },
})
app.use('/api/', apiLimiter)

// Stricter rate limit for AI and OCR endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI rate limit exceeded' },
})
app.use('/api/ai', aiLimiter)
app.use('/api/ocr', aiLimiter)

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'))
app.use('/api/health/db', requireAuth, require('./routes/healthDb'))
app.use('/api/webhooks', require('./routes/webhooks'))
app.use('/api/bots/whatsapp', require('./routes/botWhatsapp'))

// Protected routes
app.use('/api/tasks', requireAuth, require('./routes/tasks'))
app.use('/api/journal', requireAuth, require('./routes/journal'))
app.use('/api/prayers', requireAuth, require('./routes/prayers'))
app.use('/api/habits', requireAuth, require('./routes/habits'))
app.use('/api/agency', requireAuth, require('./routes/agency'))
app.use('/api/schedule', requireAuth, require('./routes/schedule'))
app.use('/api/settings', requireAuth, require('./routes/settings'))
app.use('/api/cdz', requireAuth, require('./routes/cdz'))
app.use('/api/calendar', requireAuth, require('./routes/calendar'))
app.use('/api/tasksync', requireAuth, require('./routes/tasksync'))
app.use('/api/reviews', requireAuth, require('./routes/reviews'))
app.use('/api/pomodoro', requireAuth, require('./routes/pomodoro'))
app.use('/api/knowledge', requireAuth, require('./routes/knowledge'))
app.use('/api/reports', requireAuth, require('./routes/reports'))
app.use('/api/finance', requireAuth, require('./routes/finance'))
app.use('/api/backup', requireAuth, require('./routes/backup'))
app.use('/api/goals', requireAuth, require('./routes/goals'))
app.use('/api/books', requireAuth, require('./routes/books'))
app.use('/api/ai', requireAuth, require('./routes/ai'))
app.use('/api/ai', requireAuth, require('./routes/ai-chat'))
app.use('/api/ai', requireAuth, require('./routes/ai-insights'))
app.use('/api/insights', requireAuth, require('./routes/insights'))
app.use('/api/ocr', requireAuth, require('./routes/ocr'))
app.use('/api/export', requireAuth, require('./routes/export'))
app.use('/api/chores', requireAuth, require('./routes/chores'))
app.use('/api/search', requireAuth, require('./routes/search'))
app.use('/api/gamification', requireAuth, require('./routes/gamification'))
app.use('/api/agents', requireAuth, require('./routes/agents'))
app.use('/api/weekly', requireAuth, require('./routes/weekly'))
app.use('/api/patterns', requireAuth, require('./routes/patterns'))
app.use('/api/vault', requireAuth, require('./routes/vault'))
app.use('/api/identities', requireAuth, require('./routes/identities'))
app.use('/api/push', requireAuth, require('./routes/push'))
app.use('/api/sleep', requireAuth, require('./routes/sleep'))
app.use('/api/workouts', requireAuth, require('./routes/workouts'))
app.use('/api/trips', requireAuth, require('./routes/trips'))
app.use('/api/relationships', requireAuth, require('./routes/relationships'))
app.use('/api/voice', requireAuth, require('./routes/voiceInbox'))
app.use('/api/bots', requireAuth, require('./routes/botSettings'))

// Handle Google OAuth callback at the path registered in Google Cloud Console
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { handleCallback } = require('./services/googleAuth')
    const { code, state } = req.query
    if (!code) return res.status(400).json({ error: 'No authorization code provided' })
    await handleCallback(code, state)
    res.redirect((process.env.CLIENT_URL || 'http://localhost:5173') + '/settings?google=connected')
  } catch (err) {
    handleError(res, err)
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Catch-all for unknown API routes (return JSON, not HTML)
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' })
})

// Serve receipt uploads
const dataDir = path.join(__dirname, '../data')
app.use('/data', express.static(dataDir))

// Serve static client build in production
const clientDist = path.join(__dirname, '../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Global error handler
app.use(errorMiddleware)

async function start() {
  getDatabase()
  await runMigrations()
  seed()

  // Restore Google credentials from database as fallback for .env
  try {
    const { get } = require("./db/database")
    const idRow = get("SELECT value FROM settings WHERE key = ?", ["google_client_id"])
    const secretRow = get("SELECT value FROM settings WHERE key = ?", ["google_client_secret"])
    if (idRow && !process.env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = idRow.value
    if (secretRow && !process.env.GOOGLE_CLIENT_SECRET) process.env.GOOGLE_CLIENT_SECRET = secretRow.value
  } catch (e) { logger.error({ err: e }, 'Failed to restore Google creds from DB') }

  const server = app.listen(PORT)
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.fatal({ port: PORT }, `Port ${PORT} already in use — use a different port or kill the existing process`)
    } else {
      logger.fatal({ err }, 'Server listen error')
    }
    process.exit(1)
  })
  server.on('listening', () => {
    logger.info({ port: PORT }, 'Life OS server running')
    try { startWatcher() } catch (e) { logger.error({ err: e }, 'Obsidian watcher') }
    try { require('./services/pushNotifications').startSchedulers() } catch (e) { logger.error({ err: e }, 'Push schedulers') }
    try { require('./services/syncJobs').startSyncSchedulers() } catch (e) { logger.error({ err: e }, 'Sync schedulers') }
    try { require('./services/emailBriefing').startBriefingScheduler() } catch (e) { logger.error({ err: e }, 'Email briefing scheduler') }
    try { require('./services/telegramBot').startBot() } catch (e) { logger.error({ err: e }, 'Telegram bot') }
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
        logger.info({ filename }, 'Auto-backup saved')
      } catch (e) { logger.error({ err: e }, 'Auto-backup failed') }
    }, 86400000)
    // Auto-sync Google Calendar on startup if connected
    try {
      const { getGoogleAuth } = require('./services/googleAuth')
      const auth = getGoogleAuth()
      if (auth) {
        const { syncEvents } = require('./services/googleCalendarSync')
        syncEvents(auth).then(r => logger.info({ synced: r.synced, removed: r.removed }, 'Google Calendar auto-sync')).catch(e => logger.error({ err: e }, 'Google Calendar auto-sync'))
      }
    } catch (e) { logger.error({ err: e }, 'Google Calendar auto-sync init') }
  })
}

start().catch(err => {
  logger.fatal({ err }, 'Failed to start server')
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — server continuing')
})
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection — server continuing')
})

