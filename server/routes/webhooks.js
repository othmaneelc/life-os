const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')
const logger = require('../services/logger')

const router = express.Router()

function logWebhook(source, action, payload, status, result) {
  run(
    `INSERT INTO webhook_log (id, source, action, payload_json, status, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [uuidv4(), source, action, JSON.stringify(payload), status, result ? JSON.stringify(result) : null]
  )
}

function webhookAuth(req, res, next) {
  const secret = process.env.WEBHOOK_SECRET
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
}

router.post('/crm', webhookAuth, async (req, res) => {
  try {
    const { company_name, contact_name, phone, email, notes, name } = req.body
    if (!company_name && !name) {
      return res.status(400).json({ success: false, error: 'company_name or name is required' })
    }

    const prospectName = company_name || name
    const prospectId = uuidv4()

    const existing = get('SELECT id FROM prospects WHERE company_name = ?', [prospectName])
    if (existing) {
      run(`UPDATE prospects SET contact_name=?, phone=?, notes=?, updated_at=datetime('now') WHERE id=?`,
        [contact_name || '', phone || '', notes || '', existing.id])
      logWebhook('crm', 'update_prospect', req.body, 'success', { id: existing.id })
      return res.json({ success: true, action: 'updated', id: existing.id })
    }

    run(`INSERT INTO prospects (id, company_name, contact_name, phone, email, notes, status) VALUES (?, ?, ?, ?, ?, ?, 'new_lead')`,
      [prospectId, prospectName, contact_name || '', phone || '', email || '', notes || ''])
    logWebhook('crm', 'create_prospect', req.body, 'success', { id: prospectId })
    res.json({ success: true, action: 'created', id: prospectId })
  } catch (err) {
    logWebhook('crm', 'error', req.body, 'failed', { error: "Internal server error" })
    logger.error({ err }, 'Webhook CRM failed')
    handleError(res, err)
  }
})

router.post('/content', webhookAuth, async (req, res) => {
  try {
    const { platform, content_type, caption, client, likes, comments, shares, views, link, date } = req.body

    if (!platform) {
      return res.status(400).json({ success: false, error: 'platform is required' })
    }

    const id = uuidv4()
    const today = new Date().toISOString().split('T')[0]

    run(`INSERT INTO content_log (id, date, platform, content_type, client, caption, likes, comments, shares, views, link) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, date || today, platform, content_type || 'post', client || '', caption || '', parseInt(likes) || 0, parseInt(comments) || 0, parseInt(shares) || 0, parseInt(views) || 0, link || ''])
    logWebhook('content', 'create_content_log', req.body, 'success', { id })

    const created = get('SELECT * FROM content_log WHERE id = ?', [id])
    res.json({ success: true, action: 'created', id, data: created })
  } catch (err) {
    logWebhook('content', 'error', req.body, 'failed', { error: "Internal server error" })
    logger.error({ err }, 'Webhook content failed')
    handleError(res, err)
  }
})

router.get('/logs', webhookAuth, (req, res) => {
  try {
    const { source, limit: limitStr } = req.query
    let sql = 'SELECT * FROM webhook_log WHERE 1=1'
    const params = []
    if (source) { sql += ' AND source = ?'; params.push(source) }
    sql += ' ORDER BY created_at DESC'
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 50))
    sql += ' LIMIT ?'
    params.push(limit)
    res.json(query(sql, params))
  } catch (err) { handleError(res, err) }
})

module.exports = router
