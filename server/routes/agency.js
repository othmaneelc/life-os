const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

// Clients
router.get('/clients', (req, res) => {
  try {
    res.json(query('SELECT * FROM clients WHERE status = ? ORDER BY created_at DESC', ['active']))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/clients', (req, res) => {
  try {
    const { name, contact_name, phone1, phone2, email, website, instagram, facebook, address,
      contract_start, contract_end, setup_fee, monthly_retainer, notes } = req.body
    const id = uuidv4()
    run(`INSERT INTO clients (id, name, contact_name, phone1, phone2, email, website, instagram, facebook, address,
      contract_start, contract_end, setup_fee, monthly_retainer, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, contact_name, phone1, phone2, email, website, instagram, facebook, address,
        contract_start, contract_end, setup_fee, monthly_retainer, notes])
    res.json(get('SELECT * FROM clients WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Prospects
router.get('/prospects', (req, res) => {
  try {
    res.json(query('SELECT * FROM prospects ORDER BY created_at DESC'))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/prospects', (req, res) => {
  try {
    const { company_name, contact_name, phone, state, status, notes, next_action } = req.body
    const id = uuidv4()
    run(`INSERT INTO prospects (id, company_name, contact_name, phone, state, status, notes, next_action)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, company_name, contact_name, phone, state, status || 'new_lead', notes, next_action])
    res.json(get('SELECT * FROM prospects WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
    fields.push('updated_at = datetime("now")')
    params.push(req.params.id)
    run(`UPDATE prospects SET ${fields.join(', ')} WHERE id = ?`, params)
    res.json(get('SELECT * FROM prospects WHERE id = ?', [req.params.id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/prospects/:id', (req, res) => {
  try {
    run('DELETE FROM prospects WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Revenue
router.get('/revenue', (req, res) => {
  try {
    res.json(query('SELECT * FROM revenue ORDER BY year DESC, month DESC'))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/revenue', (req, res) => {
  try {
    const { month, year, revenue_mad, expenses_mad, notes } = req.body
    const id = uuidv4()
    run('INSERT OR REPLACE INTO revenue (id, month, year, revenue_mad, expenses_mad, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, month, year, revenue_mad || 0, expenses_mad || 0, notes])
    res.json(get('SELECT * FROM revenue WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Outreach
router.get('/outreach', (req, res) => {
  try {
    res.json(query('SELECT * FROM outreach_log ORDER BY date DESC'))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/outreach', (req, res) => {
  try {
    const { date, calls_made, dms_sent, responses, meetings_booked, notes } = req.body
    const existing = get('SELECT * FROM outreach_log WHERE date = ?', [date])
    if (existing) {
      run('UPDATE outreach_log SET calls_made=?, dms_sent=?, responses=?, meetings_booked=?, notes=? WHERE date=?',
        [calls_made || 0, dms_sent || 0, responses || 0, meetings_booked || 0, notes, date])
    } else {
      run('INSERT INTO outreach_log (id, date, calls_made, dms_sent, responses, meetings_booked, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), date, calls_made || 0, dms_sent || 0, responses || 0, meetings_booked || 0, notes])
    }
    res.json(get('SELECT * FROM outreach_log WHERE date = ?', [date]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Content Tracker
router.get('/content', (req, res) => {
  try {
    const { client } = req.query
    let sql = 'SELECT * FROM content_log'
    const params = []
    if (client) { sql += ' WHERE client = ?'; params.push(client) }
    sql += ' ORDER BY date DESC'
    res.json(query(sql, params))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/content', (req, res) => {
  try {
    const { date, platform, content_type, client, caption, likes, comments, shares, views, link } = req.body
    const id = uuidv4()
    run(`INSERT INTO content_log (id, date, platform, content_type, client, caption, likes, comments, shares, views, link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, date, platform, content_type, client, caption, likes || 0, comments || 0, shares || 0, views || 0, link])
    res.json(get('SELECT * FROM content_log WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/content/:id', (req, res) => {
  try {
    run('DELETE FROM content_log WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Google Business Profile
router.get('/gbp', (req, res) => {
  try {
    res.json(query('SELECT * FROM gbp_metrics ORDER BY week_start DESC'))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
