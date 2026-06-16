const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const { date, limit } = req.query
    if (date) return res.json(get('SELECT * FROM daily_reviews WHERE date = ?', [date]) || null)
    res.json(query('SELECT * FROM daily_reviews ORDER BY date DESC LIMIT ?', [parseInt(limit) || 30]))
  } catch (err) { handleError(res, err) }
})

router.post('/', (req, res) => {
  try {
    const { date, energy, wins, lessons, tomorrow_focus, completed } = req.body
    const existing = get('SELECT * FROM daily_reviews WHERE date = ?', [date])
    if (existing) {
      run(`UPDATE daily_reviews SET energy=?, wins=?, lessons=?, tomorrow_focus=?, completed=? WHERE date=?`,
        [energy, wins, lessons, tomorrow_focus, completed ? 1 : 0, date])
      return res.json(get('SELECT * FROM daily_reviews WHERE date = ?', [date]))
    }
    const id = uuidv4()
    run('INSERT INTO daily_reviews (id, date, energy, wins, lessons, tomorrow_focus, completed) VALUES (?,?,?,?,?,?,?)',
      [id, date, energy, wins, lessons, tomorrow_focus, completed ? 1 : 0])
    res.json(get('SELECT * FROM daily_reviews WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.get('/stats', (req, res) => {
  try {
    const { start, end } = req.query
    const reviews = query('SELECT * FROM daily_reviews WHERE date >= ? AND date <= ? ORDER BY date', [start, end])
    const avgEnergy = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.energy, 0) / reviews.length).toFixed(1) : 0
    const completedDays = reviews.filter(r => r.completed).length
    res.json({ total: reviews.length, completedDays, avgEnergy: parseFloat(avgEnergy), reviews })
  } catch (err) { handleError(res, err) }
})

module.exports = router
