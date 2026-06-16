const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, run } = require('../db/database')
const { validate } = require('../middleware/validate')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const rows = query('SELECT * FROM settings')
    const settings = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }
    res.json(settings)
  } catch (err) { handleError(res, err) }
})

const NOTIF_MAP = {
  push_prayer: 'prayer_reminder',
  push_summary: 'daily_briefing',
  push_review: 'daily_review',
  push_weekly: 'weekly_report',
}

router.put('/', validate({
  groq_key: [{ pattern: /^(gsk_|$)/ }],
  user_name: [{ maxLength: 100 }],
}), (req, res) => {
  try {
    const entries = req.body
    for (const [key, value] of Object.entries(entries)) {
      if (/^(google_|session_|db_)/.test(key)) continue
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)])
      const notifType = NOTIF_MAP[key]
      if (notifType) {
        run('INSERT OR REPLACE INTO notification_settings (id, type, enabled, time_offset_minutes) VALUES (?, ?, ?, 0)',
          [require('uuid').v4(), notifType, value !== '0' ? 1 : 0])
      }
    }
    const rows = query('SELECT * FROM settings')
    const settings = {}
    for (const row of rows) {
      settings[row.key] = row.value
    }
    res.json(settings)
  } catch (err) { handleError(res, err) }
})

router.post('/export', (req, res) => {
  try {
    const tables = ['tasks', 'journal_entries', 'prayers', 'prayer_times_cache', 'habits',
      'habit_logs', 'clients', 'prospects', 'revenue', 'outreach_log', 'schedule_blocks', 'settings']
    const data = {}
    for (const table of tables) {
      data[table] = query(`SELECT * FROM "${table}"`)
    }
    res.json(data)
  } catch (err) { handleError(res, err) }
})

router.post('/google-oauth', (req, res) => {
  try {
    const { client_id, client_secret } = req.body
    if (!client_id || !client_secret) return res.status(400).json({ error: 'Client ID and Secret required' })
    const fs = require('fs')
    const path = require('path')
    const envPath = path.join(__dirname, '../../.env')
    let existing = ''
    try { existing = fs.readFileSync(envPath, 'utf-8') } catch (e) {}
    const lines = existing.split('\n').filter(l => l.trim() && !l.startsWith('GOOGLE_'))
    lines.push(`GOOGLE_CLIENT_ID=${client_id}`)
    lines.push(`GOOGLE_CLIENT_SECRET=${client_secret}`)
    lines.push(`GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback`)
    fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8')
    process.env.GOOGLE_CLIENT_ID = client_id
    process.env.GOOGLE_CLIENT_SECRET = client_secret
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback'
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['google_client_id', client_id])
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['google_client_secret', client_secret])
    try {
      const { disconnectGoogle } = require('../services/googleAuth')
      disconnectGoogle()
    } catch (e) {}
    res.json({ success: true, message: 'Google OAuth configured and applied.' })
  } catch (err) { handleError(res, err) }
})

router.post('/clear', (req, res) => {
  try {
    const tableList = ['tasks', 'journal_entries', 'prayers', 'prayer_times_cache', 'habits',
      'habit_logs', 'clients', 'prospects', 'revenue', 'outreach_log', 'schedule_blocks',
      'daily_reviews', 'pomodoro_sessions', 'kb_documents', 'kb_fts', 'content_log', 'gbp_metrics']
    const existing = query("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name)
    for (const table of tableList) {
      if (existing.includes(table)) run(`DELETE FROM "${table}"`)
    }
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router

