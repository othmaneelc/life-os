const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query } = require('../db/database')
const { processTextMessage, formatResults } = require('../services/botProcessor')
const logger = require('../services/logger')

const router = express.Router()

function getTwilioConfig() {
  const rows = query('SELECT key, value FROM settings WHERE key IN (?, ?, ?)', ['whatsapp_account_sid', 'whatsapp_auth_token', 'whatsapp_phone_number'])
  const cfg = {}
  rows.forEach(r => { cfg[r.key] = r.value })
  return cfg
}

router.get('/', (req, res) => {
  try {
    const q = req.query['hub.challenge']
    if (q) return res.send(q)
    res.send('ok')
  } catch (err) { handleError(res, err) }
})

router.post('/', async (req, res) => {
  try {
    const cfg = getTwilioConfig()
    const from = req.body.From || ''
    const body = (req.body.Body || '').trim()
    const numMedia = parseInt(req.body.NumMedia || '0')

    if (!body && numMedia === 0) return res.send('<Response></Response>')

    if (body) {
      try {
        const { results } = await processTextMessage(body, 'whatsapp', from)
        const reply = formatResults(results)
        if (reply && cfg.whatsapp_account_sid && cfg.whatsapp_auth_token) {
          const twilio = require('twilio')
          const client = twilio(cfg.whatsapp_account_sid, cfg.whatsapp_auth_token)
          await client.messages.create({
            from: `whatsapp:${cfg.whatsapp_phone_number}`,
            to: from,
            body: reply,
          }).catch(err => logger.error({ err }, 'WhatsApp reply failed'))
        }
      } catch (err) {
        logger.error({ err, body }, 'WhatsApp message processing failed')
        return handleError(res, err)
      }
    }

    res.send('<Response></Response>')
  } catch (err) {
    logger.error({ err }, 'WhatsApp webhook error')
    handleError(res, err)
  }
})

module.exports = router
