const express = require('express')
const { handleError } = require('../middleware/errorHandler')
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
  } catch (err) { handleError(res, err) }
})

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/
const VALID_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'all']
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function validateScheduleBody(body, forUpdate) {
  const errors = []
  if (!forUpdate || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string') errors.push('title is required and must be a string')
    else if (body.title.length < 1 || body.title.length > 200) errors.push('title must be 1-200 characters')
  }
  if (!forUpdate || body.start_time !== undefined) {
    if (!body.start_time) errors.push('start_time is required')
    else if (!HH_MM.test(body.start_time)) errors.push('start_time must be in HH:MM format')
  }
  if (!forUpdate || body.end_time !== undefined) {
    if (!body.end_time) errors.push('end_time is required')
    else if (!HH_MM.test(body.end_time)) errors.push('end_time must be in HH:MM format')
  }
  if (body.day_of_week !== undefined && body.day_of_week !== null) {
    if (!VALID_DAYS.includes(body.day_of_week)) errors.push(`day_of_week must be one of: ${VALID_DAYS.join(', ')}`)
  }
  if (body.color !== undefined && body.color !== null) {
    if (!HEX_COLOR.test(body.color)) errors.push('color must be a valid hex color (e.g. #0071E3)')
  }
  if (body.start_time && body.end_time && !forUpdate) {
    if (body.start_time >= body.end_time) errors.push('end_time must be after start_time')
  }
  return errors
}

router.post('/', (req, res) => {
  try {
    const errors = validateScheduleBody(req.body, false)
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors })

    const { start_time, end_time, title, subtitle, block_type, color, day_of_week, date, recurrence, recurrence_end_date, is_all_day } = req.body
    const id = uuidv4()
    run(`INSERT INTO schedule_blocks (id, day_of_week, start_time, end_time, title, subtitle, block_type, color, date, recurrence, recurrence_end_date, is_all_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, day_of_week || 'all', start_time, end_time, title, subtitle || '', block_type || 'Work', color || '#5B5BD6', date || null, recurrence || null, recurrence_end_date || null, is_all_day ? 1 : 0])
    res.json(get('SELECT * FROM schedule_blocks WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/:id', (req, res) => {
  try {
    const block = get('SELECT * FROM schedule_blocks WHERE id = ?', [req.params.id])
    if (!block) return res.status(404).json({ error: 'Block not found' })

    const errors = validateScheduleBody(req.body, true)
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors })

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
  } catch (err) { handleError(res, err) }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM schedule_blocks WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Batch operations
router.post('/batch', (req, res) => {
  try {
    const { operations } = req.body
    if (!Array.isArray(operations)) return res.status(400).json({ error: 'operations must be an array' })

    const results = []
    for (const op of operations) {
      if (op.action === 'delete' && op.id) {
        run('DELETE FROM schedule_blocks WHERE id = ?', [op.id])
        results.push({ id: op.id, action: 'deleted' })
      } else if (op.action === 'upsert' && op.data) {
        const { start_time, end_time, title, subtitle, block_type, color, day_of_week, date, recurrence, recurrence_end_date, is_all_day } = op.data
        if (op.data.id) {
          const existing = get('SELECT * FROM schedule_blocks WHERE id = ?', [op.data.id])
          if (existing) {
            const fields = []
            const params = []
            for (const key of ['start_time', 'end_time', 'title', 'subtitle', 'block_type', 'color', 'day_of_week', 'date', 'recurrence', 'recurrence_end_date', 'is_all_day']) {
              if (op.data[key] !== undefined) {
                fields.push(`${key} = ?`)
                params.push(op.data[key])
              }
            }
            if (fields.length > 0) {
              params.push(op.data.id)
              run(`UPDATE schedule_blocks SET ${fields.join(', ')} WHERE id = ?`, params)
            }
            results.push({ id: op.data.id, action: 'updated' })
          }
        } else {
          const id = uuidv4()
          run(`INSERT INTO schedule_blocks (id, day_of_week, start_time, end_time, title, subtitle, block_type, color, date, recurrence, recurrence_end_date, is_all_day)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, day_of_week || 'all', start_time, end_time, title, subtitle || '', block_type || 'Work', color || '#5B5BD6', date || null, recurrence || null, recurrence_end_date || null, is_all_day ? 1 : 0])
          results.push({ id, action: 'created' })
        }
      }
    }
    res.json({ success: true, results })
  } catch (err) { handleError(res, err) }
})

router.get('/templates', (req, res) => {
  try {
    res.json(query('SELECT * FROM event_templates ORDER BY sort_order'))
  } catch (err) { handleError(res, err) }
})

router.post('/templates', (req, res) => {
  try {
    const { name, title, start_time, end_time, block_type, color, icon } = req.body
    if (!name || !title) return res.status(400).json({ error: 'name and title are required' })
    const id = uuidv4()
    const maxOrder = get('SELECT MAX(sort_order) as max FROM event_templates')
    run('INSERT INTO event_templates (id, name, title, start_time, end_time, block_type, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, title, start_time, end_time, block_type || 'Work', color || '#0071E3', icon || null, (maxOrder?.max || 0) + 1])
    res.json(get('SELECT * FROM event_templates WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/templates/:id', (req, res) => {
  try {
    run('DELETE FROM event_templates WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
