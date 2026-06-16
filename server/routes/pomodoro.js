const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const { date } = req.query
    if (date) return res.json(query('SELECT * FROM pomodoro_sessions WHERE date = ? ORDER BY started_at', [date]))
    res.json(query('SELECT * FROM pomodoro_sessions ORDER BY date DESC, started_at DESC'))
  } catch (err) { handleError(res, err) }
})

router.post('/', (req, res) => {
  try {
    const { date, task_title, duration_min, completed } = req.body
    const id = uuidv4()
    run('INSERT INTO pomodoro_sessions (id, date, task_title, duration_min, completed, started_at) VALUES (?,?,?,?,?,?)',
      [id, date || new Date().toISOString().split('T')[0], task_title || '', duration_min || 25, completed ? 1 : 0, new Date().toISOString()])
    res.json(get('SELECT * FROM pomodoro_sessions WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/:id', (req, res) => {
  try {
    const { completed, task_title, duration_min } = req.body
    const fields = []; const params = []
    if (completed !== undefined) { fields.push('completed = ?'); params.push(completed ? 1 : 0) }
    if (task_title !== undefined) { fields.push('task_title = ?'); params.push(task_title) }
    if (duration_min !== undefined) { fields.push('duration_min = ?'); params.push(duration_min) }
    if (fields.length > 0) { params.push(req.params.id); run(`UPDATE pomodoro_sessions SET ${fields.join(', ')} WHERE id = ?`, params) }
    res.json(get('SELECT * FROM pomodoro_sessions WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.get('/stats', (req, res) => {
  try {
    const { start, end } = req.query
    const sessions = query('SELECT * FROM pomodoro_sessions WHERE date >= ? AND date <= ? AND completed = 1', [start, end])
    const totalMinutes = sessions.reduce((s, r) => s + (r.duration_min || 0), 0)
    res.json({ count: sessions.length, totalMinutes, sessions })
  } catch (err) { handleError(res, err) }
})

module.exports = router
