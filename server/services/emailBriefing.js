const nodemailer = require('nodemailer')
const { query, run, get } = require('../db/database')
const { getAIConfig, aiCall } = require('./aiCall')
const { gatherFullContext } = require('../routes/ai-shared')
const logger = require('./logger')

function getEmailConfig() {
  const s = {}
  const rows = query('SELECT key, value FROM settings WHERE key LIKE ?', ['briefing_%'])
  rows.forEach(r => { s[r.key] = r.value })
  return s
}

async function generateBriefingText() {
  const config = getAIConfig()
  if (!config) return null

  const context = gatherFullContext('/dashboard')

  const briefing = await aiCall(config, [
    { role: 'system', content: `You are JARVIS. Generate a concise daily briefing in plain text (no markdown). Structure:

Good [time], [user]

WEATHER: (one line)
TODAY'S PRIORITIES:
- (2-3 tasks)
HABITS: (streak status)
PRAYERS: (today's progress)
INSIGHT: (one cross-domain observation)

Keep under 120 words. Be motivational.

Context:\n${context}` },
    { role: 'user', content: 'Brief me.' },
  ], 1024, 0.5)

  return briefing || null
}

async function sendBriefing() {
  const cfg = getEmailConfig()
  const host = cfg.briefing_smtp_host
  const port = parseInt(cfg.briefing_smtp_port || '587')
  const user = cfg.briefing_smtp_user
  const pass = cfg.briefing_smtp_pass
  const recipient = cfg.briefing_email
  const time = cfg.briefing_time || '07:00'

  if (!host || !user || !pass || !recipient) {
    logger.warn('Email briefing not configured — missing SMTP settings')
    return
  }

  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (currentTime !== time) return

  const lastSent = get('SELECT value FROM settings WHERE key = ?', ['briefing_last_sent'])
  const today = now.toISOString().split('T')[0]
  if (lastSent?.value === today) return

  try {
    const text = await generateBriefingText()
    if (!text) {
      logger.warn('Email briefing skipped — no AI config or empty response')
      return
    }

    const transporter = nodemailer.createTransport({
      host, port,
      secure: port === 465,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: `"Life OS Briefing" <${user}>`,
      to: recipient,
      subject: `☀️ Life OS Briefing — ${today}`,
      text,
    })

    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['briefing_last_sent', today])
    logger.info({ recipient }, 'Daily briefing email sent')
  } catch (err) {
    logger.error({ err }, 'Failed to send briefing email')
  }
}

let intervalHandle = null

function startBriefingScheduler() {
  if (intervalHandle) return
  sendBriefing()
  intervalHandle = setInterval(sendBriefing, 60000)
  logger.info('Email briefing scheduler started (checks every 60s)')
}

function stopBriefingScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

module.exports = { sendBriefing, startBriefingScheduler, stopBriefingScheduler }
