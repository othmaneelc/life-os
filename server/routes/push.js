const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { run, get } = require('../db/database')
const { v4: uuidv4 } = require('uuid')
const { getPublicKey, sendPush } = require('../services/pushNotifications')

const router = express.Router()

// Return VAPID public key for client subscription
router.get('/vapid-public-key', (req, res) => {
  try {
    const key = getPublicKey()
    if (!key) return handleError(res, new Error('VAPID keys not initialized'))
    res.json({ publicKey: key })
  } catch (err) { handleError(res, err) }
})

// Subscribe a new push subscription
router.post('/subscribe', (req, res) => {
  try {
    const { endpoint, keys } = req.body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'endpoint, p256dh, and auth required' })
    }
    // Check if already subscribed
    const existing = get('SELECT id FROM push_subscriptions WHERE endpoint = ?', [endpoint])
    if (existing) return res.json({ success: true, alreadySubscribed: true })

    const id = uuidv4()
    const ua = req.headers['user-agent'] || null
    run('INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?, ?)',
      [id, endpoint, keys.p256dh, keys.auth, ua])

    // Send a welcome/test push
    sendPush({ endpoint, keys }, { type: 'test', title: '🔔 Notifications Active', body: 'You\'ll now receive prayer reminders and daily briefings.', tag: 'welcome' }).catch(() => {})

    res.json({ success: true, id })
  } catch (err) { handleError(res, err) }
})

// Unsubscribe (remove a push subscription)
router.post('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
    run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
