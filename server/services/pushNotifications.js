const { query, run, get } = require('../db/database')
const logger = require('../services/logger')
const webpush = require('web-push')

const PUBLIC_KEY_KEY = 'vapid_public_key'
const PRIVATE_KEY_KEY = 'vapid_private_key'

// Generate or retrieve stored VAPID keys
function ensureVapidKeys() {
  let pub = get('SELECT value FROM settings WHERE key = ?', [PUBLIC_KEY_KEY])
  if (!pub) {
    const keys = webpush.generateVAPIDKeys()
    run("INSERT INTO settings (key, value) VALUES (?, ?)", [PUBLIC_KEY_KEY, keys.publicKey])
    run("INSERT INTO settings (key, value) VALUES (?, ?)", [PRIVATE_KEY_KEY, keys.privateKey])
    pub = { value: keys.publicKey }
    logger.info('Generated new VAPID keys')
  }
  const priv = get('SELECT value FROM settings WHERE key = ?', [PRIVATE_KEY_KEY])
  const contact = process.env.VAPID_CONTACT || 'mailto:othmane@mixagenci.com'
  webpush.setVapidDetails(contact, pub.value, priv.value)
  return pub.value
}

function getPublicKey() {
  const row = get('SELECT value FROM settings WHERE key = ?', [PUBLIC_KEY_KEY])
  return row ? row.value : null
}

// Get all subscriptions as push subscription objects
function getAllSubscriptions() {
  const rows = query('SELECT endpoint, p256dh, auth FROM push_subscriptions')
  return rows.map(r => ({
    endpoint: r.endpoint,
    keys: { p256dh: r.p256dh, auth: r.auth },
  }))
}

function sendPush(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 86400 })
}

async function sendPushToAll(payload) {
  const subs = getAllSubscriptions()
  let sent = 0
  for (const sub of subs) {
    try {
      await sendPush(sub, payload)
      sent++
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired or unsubscribed — remove it
        run('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint])
      }
    }
  }
  if (sent > 0) logger.info({ sent, type: payload.type }, 'Push notifications sent')
}

// Check if a notification type is enabled
function isEnabled(type) {
  const row = get('SELECT enabled FROM notification_settings WHERE type = ?', [type])
  return row ? row.enabled === 1 : true
}

// --- Schedulers ---

const lastSentPrayers = {}

async function checkPrayerReminders() {
  if (!isEnabled('prayer_reminder')) return
  try {
    const today = new Date().toISOString().split('T')[0]
    const times = query('SELECT * FROM prayer_times_cache WHERE date = ?', [today])
    if (!times || !times[0]) return

    const now = new Date()
    const currentMin = now.getHours() * 60 + now.getMinutes()
    const prayers = [
      { name: 'fajr', label: 'Fajr' },
      { name: 'dhuhr', label: 'Dhuhr' },
      { name: 'asr', label: 'Asr' },
      { name: 'maghrib', label: 'Maghrib' },
      { name: 'isha', label: 'Isha' },
    ]

    for (const p of prayers) {
      const time = times[0][p.name]
      if (!time) continue
      const [h, m] = time.split(':').map(Number)
      const prayerMin = h * 60 + m
      const diff = prayerMin - currentMin
      // Remind 10 minutes before, only once per prayer per day
      if (diff >= 9 && diff <= 11 && lastSentPrayers[p.name] !== today) {
        lastSentPrayers[p.name] = today
        await sendPushToAll({ type: 'prayer', title: `🕌 ${p.label} time`, body: `${p.label} is in 10 minutes.`, tag: `prayer-${p.name}` })
      }
    }
  } catch (err) {
    logger.error({ err }, 'Prayer push check failed')
  }
}

async function checkHabitReminders() {
  if (!isEnabled('habit_reminder')) return
  try {
    const today = new Date().toISOString().split('T')[0]
    const incomplete = query(`
      SELECT h.name FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date = ? AND hl.done = 1
      WHERE h.active = 1 AND hl.id IS NULL
    `, [today])
    if (incomplete.length > 0) {
      const names = incomplete.map(h => h.name).slice(0, 5).join(', ')
      await sendPushToAll({ type: 'habit', title: '📋 Unfinished Habits', body: `You still have: ${names}`, tag: 'habit-reminder' })
    }
  } catch (err) {
    logger.error({ err }, 'Habit push check failed')
  }
}

async function sendDailyBriefing() {
  if (!isEnabled('daily_briefing')) return
  try {
    const { getAIConfig, aiCall } = require('./aiCall')
    const config = getAIConfig()
    let body = 'Good morning! '
    if (config) {
      const today = new Date().toISOString().split('T')[0]
      const tasks = query("SELECT COUNT(*) as c FROM tasks WHERE status = 'todo' AND due_date = ?", [today])
      const habits = query("SELECT COUNT(*) as c FROM habits WHERE active = 1")
      body += `You have ${tasks[0]?.c || 0} tasks due today and ${habits[0]?.c || 0} habits to track.`
    } else {
      body += 'Check your dashboard for today\'s briefing.'
    }
    await sendPushToAll({ type: 'briefing', title: '🌅 Morning Briefing', body, tag: 'daily-briefing' })
  } catch (err) {
    logger.error({ err }, 'Briefing push failed')
  }
}

const notified_patterns = {}

async function checkPatternAlerts() {
  if (!isEnabled('pattern_alert')) return
  try {
    const now = new Date()
    if (now.getHours() !== 20) return
    const today = now.toISOString().split('T')[0]
    if (notified_patterns[today]) return

    const patterns = []
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]

    // Prayer rate check
    const prayerStats = get(`SELECT ROUND(100.0 * SUM(done) / COUNT(*)) as rate FROM prayers WHERE date >= ?`, [threeDaysAgo])
    if (prayerStats && prayerStats.rate !== null && Number(prayerStats.rate) < 60) {
      patterns.push({ type: 'prayer', message: "I noticed you've missed a few prayers lately. Everything okay? I'm here if you want to talk." })
    }

    // Habit completion rate check
    const habitStats = get(`
      SELECT ROUND(100.0 * SUM(hl.done) / COUNT(*)) as rate FROM habit_logs hl
      JOIN habits h ON h.id = hl.habit_id
      WHERE hl.date >= ? AND h.active = 1
    `, [threeDaysAgo])
    if (habitStats && habitStats.rate !== null && Number(habitStats.rate) < 50) {
      patterns.push({ type: 'habit', message: "Your habit streak has been slipping. Remember why you started — I believe in you!" })
    }

    // Overdue tasks check
    const overdue = get(`SELECT COUNT(*) as count FROM tasks WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?`, [threeDaysAgo])
    if (overdue && overdue.count > 0) {
      patterns.push({ type: 'task', message: `You have ${overdue.count} task${overdue.count > 1 ? 's' : ''} that ${overdue.count > 1 ? 'are' : 'is'} overdue by 3+ days. Want to reschedule or break them down?` })
    }

    // Journal inactivity check
    const lastJournal = get(`SELECT MAX(date) as last_date FROM journal_entries`)
    if (lastJournal && lastJournal.last_date) {
      const daysSince = Math.floor((Date.now() - new Date(lastJournal.last_date + 'T00:00:00').getTime()) / 86400000)
      if (daysSince >= 3) {
        patterns.push({ type: 'journal', message: "You haven't written in your journal for a few days. Taking a moment to reflect can really help clear the mind." })
      }
    }

    for (const p of patterns) {
      await sendPushToAll({ type: 'pattern_alert', title: '🧠 JARVIS Notice', body: p.message, tag: `pattern-${p.type}-${today}` })
    }

    notified_patterns[today] = patterns.map(p => p.type)
    if (patterns.length > 0) {
      logger.info({ patterns: patterns.map(p => p.type) }, 'Pattern alerts sent')
    }
  } catch (err) {
    logger.error({ err }, 'Pattern alert check failed')
  }
}

let intervals = []

function startSchedulers() {
  ensureVapidKeys()

  // Prayer reminders — check every 2 minutes
  intervals.push(setInterval(checkPrayerReminders, 120000))

  // Habit reminders — check every hour, only send at 21:00
  intervals.push(setInterval(() => {
    const h = new Date().getHours()
    if (h === 21) checkHabitReminders()
  }, 60000))

  // Daily briefing — check every minute, send at 07:00
  intervals.push(setInterval(() => {
    const now = new Date()
    if (now.getHours() === 7 && now.getMinutes() === 0) sendDailyBriefing()
  }, 60000))

  // Pattern alerts — check every hour, only send at 20:00
  intervals.push(setInterval(checkPatternAlerts, 3600000))

  // Also run immediately on start so first check is at the right hour
  checkPatternAlerts()

  logger.info('Push notification schedulers started')
}

function stopSchedulers() {
  intervals.forEach(i => clearInterval(i))
  intervals = []
}

module.exports = { ensureVapidKeys, getPublicKey, getAllSubscriptions, sendPush, sendPushToAll, checkPatternAlerts, startSchedulers, stopSchedulers }
