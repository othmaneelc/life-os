const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

// Clients
router.get('/clients', (req, res) => {
  try {
    const { page: pageStr, limit: limitStr } = req.query
    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(limitStr) || 50))
      const offset = (page - 1) * limit
      const total = get("SELECT COUNT(*) as count FROM clients WHERE status = 'active'", []).count
      const data = query('SELECT * FROM clients WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', ['active', limit, offset])
      return res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
    }
    res.json(query('SELECT * FROM clients WHERE status = ? ORDER BY created_at DESC', ['active']))
  } catch (err) { handleError(res, err) }
})

const VALID_PLATFORMS = ['instagram', 'youtube', 'twitter', 'tiktok', 'facebook', 'linkedin', 'other']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

router.post('/clients', (req, res) => {
  try {
    if (!req.body.name || typeof req.body.name !== 'string' || !req.body.name.trim()) {
      return res.status(400).json({ error: 'Validation failed', details: ['name is required'] })
    }
    const { name, contact_name, phone1, phone2, email, website, instagram, facebook, address,
      contract_start, contract_end, setup_fee, monthly_retainer, notes } = req.body
    const id = uuidv4()
    run(`INSERT INTO clients (id, name, contact_name, phone1, phone2, email, website, instagram, facebook, address,
      contract_start, contract_end, setup_fee, monthly_retainer, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, contact_name, phone1, phone2, email, website, instagram, facebook, address,
        contract_start, contract_end, setup_fee, monthly_retainer, notes])
    res.json(get('SELECT * FROM clients WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/clients/:id', (req, res) => {
  try {
    const fields = []
    const params = []
    const allowed = ['name', 'contact_name', 'phone1', 'phone2', 'email', 'website', 'instagram', 'facebook', 'address',
      'contract_start', 'contract_end', 'setup_fee', 'monthly_retainer', 'status', 'notes']
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`)
        params.push(req.body[key])
      }
    }
    if (fields.length > 0) {
      params.push(req.params.id)
      run(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, params)
    }
    res.json(get('SELECT * FROM clients WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

// Prospects
router.get('/prospects', (req, res) => {
  try {
    const { page: pageStr, limit: limitStr } = req.query
    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(limitStr) || 50))
      const offset = (page - 1) * limit
      const total = get('SELECT COUNT(*) as count FROM prospects', []).count
      const data = query('SELECT * FROM prospects ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset])
      return res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
    }
    res.json(query('SELECT * FROM prospects ORDER BY created_at DESC'))
  } catch (err) { handleError(res, err) }
})

router.post('/prospects', (req, res) => {
  try {
    const { company_name, contact_name, phone, state, status, notes, next_action } = req.body
    if (!company_name && !contact_name) {
      return res.status(400).json({ error: 'Validation failed', details: ['company_name or name is required'] })
    }
    const id = uuidv4()
    run(`INSERT INTO prospects (id, company_name, contact_name, phone, state, status, notes, next_action)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, company_name, contact_name, phone, state, status || 'new_lead', notes, next_action])
    res.json(get('SELECT * FROM prospects WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

// Client health scores
router.get('/clients/health', (req, res) => {
  try {
    const clients = query('SELECT * FROM clients')
    const now = new Date()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000

    const result = clients.map(c => {
      let score = 50

      if (c.status === 'active') score += 20
      else if (c.status === 'inactive') score -= 10
      if (c.status === 'at_risk') score -= 15

      if (c.monthly_retainer > 0) score += 10

      if (c.contract_end) {
        const end = new Date(c.contract_end)
        const diff = end - now
        if (diff > thirtyDays) score += 10
        else if (diff > 0 && diff <= thirtyDays) score -= 5
      }

      score = Math.max(0, Math.min(100, score))

      let label = 'At Risk'
      if (score >= 80) label = 'Good'
      else if (score >= 50) label = 'Okay'

      return { id: c.id, name: c.name, health_score: score, status: c.status, label }
    })

    res.json(result)
  } catch (err) { handleError(res, err) }
})

router.put('/prospects/:id', (req, res) => {
  try {
    const fields = []
    const params = []
    const allowed = ['company_name', 'contact_name', 'phone', 'state', 'status', 'last_contact', 'notes', 'next_action']
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`)
        params.push(req.body[key])
      }
    }
    fields.push("updated_at = datetime('now')")
    params.push(req.params.id)
    run(`UPDATE prospects SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json(get('SELECT * FROM prospects WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/prospects/:id', (req, res) => {
  try {
    run('DELETE FROM prospects WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Revenue
router.get('/revenue', (req, res) => {
  try {
    res.json(query('SELECT * FROM revenue ORDER BY year DESC, month DESC'))
  } catch (err) { handleError(res, err) }
})

router.post('/revenue', (req, res) => {
  try {
    const { month, year, revenue_mad, expenses_mad, notes } = req.body
    const id = uuidv4()
    run('INSERT OR REPLACE INTO revenue (id, month, year, revenue_mad, expenses_mad, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, month, year, revenue_mad || 0, expenses_mad || 0, notes])
    res.json(get('SELECT * FROM revenue WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

// Outreach
router.get('/outreach', (req, res) => {
  try {
    const { page: pageStr, limit: limitStr } = req.query
    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(limitStr) || 50))
      const offset = (page - 1) * limit
      const total = get('SELECT COUNT(*) as count FROM outreach_log', []).count
      const data = query('SELECT * FROM outreach_log ORDER BY date DESC LIMIT ? OFFSET ?', [limit, offset])
      return res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
    }
    res.json(query('SELECT * FROM outreach_log ORDER BY date DESC'))
  } catch (err) { handleError(res, err) }
})

router.post('/outreach', (req, res) => {
  try {
    const { date, calls_made, dms_sent, responses, meetings_booked, notes } = req.body
    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Validation failed', details: ['date is required and must be in YYYY-MM-DD format'] })
    }
    const existing = get('SELECT * FROM outreach_log WHERE date = ?', [date])
    if (existing) {
      run('UPDATE outreach_log SET calls_made=?, dms_sent=?, responses=?, meetings_booked=?, notes=? WHERE date=?',
        [calls_made || 0, dms_sent || 0, responses || 0, meetings_booked || 0, notes, date])
    } else {
      run('INSERT INTO outreach_log (id, date, calls_made, dms_sent, responses, meetings_booked, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), date, calls_made || 0, dms_sent || 0, responses || 0, meetings_booked || 0, notes])
    }
    res.json(get('SELECT * FROM outreach_log WHERE date = ?', [date]))
  } catch (err) { handleError(res, err) }
})

// Content Tracker
router.get('/content', (req, res) => {
  try {
    const { client, page: pageStr, limit: limitStr } = req.query
    let sql = 'SELECT * FROM content_log'
    const params = []
    if (client) { sql += ' WHERE client = ?'; params.push(client) }
    sql += ' ORDER BY date DESC'
    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(limitStr) || 50))
      const offset = (page - 1) * limit
      let countSql = 'SELECT COUNT(*) as count FROM content_log'
      if (client) countSql += ' WHERE client = ?'
      const total = get(countSql, [...params]).count
      const data = query(sql + ' LIMIT ? OFFSET ?', [...params, limit, offset])
      return res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
    }
    res.json(query(sql, params))
  } catch (err) { handleError(res, err) }
})

router.post('/content', (req, res) => {
  try {
    const { date, platform, content_type, client, caption, likes, comments, shares, views, link } = req.body
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: 'Validation failed', details: [`platform must be one of: ${VALID_PLATFORMS.join(', ')}`] })
    }
    const id = uuidv4()
    run(`INSERT INTO content_log (id, date, platform, content_type, client, caption, likes, comments, shares, views, link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, date, platform, content_type, client, caption, likes || 0, comments || 0, shares || 0, views || 0, link])
    res.json(get('SELECT * FROM content_log WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/content/:id', (req, res) => {
  try {
    run('DELETE FROM content_log WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Google Business Profile
router.get('/gbp', (req, res) => {
  try {
    res.json(query('SELECT * FROM gbp_metrics ORDER BY week_start DESC'))
  } catch (err) { handleError(res, err) }
})

router.post('/gbp', (req, res) => {
  try {
    const { week_start, profile_views, direction_requests, phone_calls, new_reviews, avg_rating, posts_published } = req.body
    const existing = get('SELECT * FROM gbp_metrics WHERE week_start = ?', [week_start])
    if (existing) {
      run('UPDATE gbp_metrics SET profile_views=?, direction_requests=?, phone_calls=?, new_reviews=?, avg_rating=?, posts_published=? WHERE week_start=?',
        [profile_views || 0, direction_requests || 0, phone_calls || 0, new_reviews || 0, avg_rating || 0, posts_published || 0, week_start])
    } else {
      run(`INSERT INTO gbp_metrics (id, week_start, profile_views, direction_requests, phone_calls, new_reviews, avg_rating, posts_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), week_start, profile_views || 0, direction_requests || 0, phone_calls || 0, new_reviews || 0, avg_rating || 0, posts_published || 0])
    }
    res.json(get('SELECT * FROM gbp_metrics WHERE week_start = ?', [week_start]))
  } catch (err) { handleError(res, err) }
})

module.exports = router
