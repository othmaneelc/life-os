const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const { day, date } = req.query
    if (date) {
      const d = new Date(date)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayName = dayNames[d.getDay()]
      const results = query(
        `SELECT * FROM schedule_blocks WHERE date = ? OR (date IS NULL AND (day_of_week = ? OR day_of_week = 'all')) ORDER BY start_time`,
        [date, dayName]
      )
      return res.json(results)
    }
    if (day) {
      return res.json(query('SELECT * FROM schedule_blocks WHERE day_of_week = ? OR day_of_week = ? ORDER BY start_time', [day, 'all']))
    }
    res.json(query('SELECT * FROM schedule_blocks ORDER BY start_time'))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { start_time, end_time, title, subtitle, block_type, color, day_of_week, date, recurrence, recurrence_end_date, is_all_day } = req.body
    const id = uuidv4()
    run(`INSERT INTO schedule_blocks (id, day_of_week, start_time, end_time, title, subtitle, block_type, color, date, recurrence, recurrence_end_date, is_all_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, day_of_week || 'all', start_time, end_time, title, subtitle || '', block_type, color, date || null, recurrence || null, recurrence_end_date || null, is_all_day ? 1 : 0])
    res.json(get('SELECT * FROM schedule_blocks WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', (req, res) => {
  try {
    const fields = []
    const params = []
    const allowed = ['start_time', 'end_time', 'title', 'subtitle', 'block_type', 'color', 'day_of_week', 'date', 'recurrence', 'recurrence_end_date', 'is_all_day']
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`)
        params.push(req.body[key])
      }
    }
    if (fields.length > 0) {
      params.push(req.params.id)
      run(`UPDATE schedule_blocks SET ${fields.join(', ')} WHERE id = ?`, params)
    }
    res.json(get('SELECT * FROM schedule_blocks WHERE id = ?', [req.params.id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM schedule_blocks WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/templates', (req, res) => {
  try {
    res.json(query('SELECT * FROM event_templates ORDER BY sort_order'))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/templates', (req, res) => {
  try {
    const { name, title, start_time, end_time, block_type, color, icon } = req.body
    const id = uuidv4()
    const maxOrder = get('SELECT MAX(sort_order) as max FROM event_templates')
    run('INSERT INTO event_templates (id, name, title, start_time, end_time, block_type, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, title, start_time, end_time, block_type || 'Work', color || '#0071E3', icon || null, (maxOrder?.max || 0) + 1])
    res.json(get('SELECT * FROM event_templates WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/templates/:id', (req, res) => {
  try {
    run('DELETE FROM event_templates WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
