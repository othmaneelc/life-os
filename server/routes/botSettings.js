const express = require('express')
const { handleError } = require('../middleware/errorHandler')

const router = express.Router()

router.get('/telegram/status', (req, res) => {
  try {
    const { isRunning } = require('../services/telegramBot')
    res.json({ running: isRunning() })
  } catch (err) { handleError(res, err) }
})

router.post('/telegram/restart', (req, res) => {
  try {
    const { restartBot } = require('../services/telegramBot')
    const ok = restartBot()
    res.json({ success: ok, running: ok })
  } catch (err) { handleError(res, err) }
})

router.get('/whatsapp/status', (req, res) => {
  try {
    const { query } = require('../db/database')
    const sid = query('SELECT value FROM settings WHERE key = ?', ['whatsapp_account_sid'])?.[0]?.value
    res.json({ configured: !!sid })
  } catch (err) { handleError(res, err) }
})

module.exports = router
