const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const trips = query('SELECT * FROM trips ORDER BY start_date DESC')
    const totals = query('SELECT trip_id, SUM(amount) as total FROM trip_expenses GROUP BY trip_id')
    const totalMap = {}
    totals.forEach(t => { totalMap[t.trip_id] = t.total })
    trips.forEach(t => { t.total_spent = totalMap[t.id] || 0 })
    res.json(trips)
  } catch (err) { handleError(res, err) }
})

router.post('/', (req, res) => {
  try {
    const { title, destination, start_date, end_date, budget, status, notes } = req.body
    if (!title) return res.status(400).json({ error: 'title is required' })
    const id = uuidv4()
    run('INSERT INTO trips (id, title, destination, start_date, end_date, budget, status, notes) VALUES (?,?,?,?,?,?,?,?)',
      [id, title, destination || null, start_date || null, end_date || null, budget || 0, status || 'planned', notes || null])
    res.json(get('SELECT * FROM trips WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.get('/:id', (req, res) => {
  try {
    const trip = get('SELECT * FROM trips WHERE id = ?', [req.params.id])
    if (!trip) return res.status(404).json({ error: 'Not found' })
    trip.expenses = query('SELECT * FROM trip_expenses WHERE trip_id = ? ORDER BY date DESC', [req.params.id])
    trip.total_spent = trip.expenses.reduce((s, e) => s + e.amount, 0)
    res.json(trip)
  } catch (err) { handleError(res, err) }
})

router.put('/:id', (req, res) => {
  try {
    const { title, destination, start_date, end_date, budget, status, notes } = req.body
    run(`UPDATE trips SET title=COALESCE(?,title), destination=COALESCE(?,destination), start_date=COALESCE(?,start_date), end_date=COALESCE(?,end_date), budget=COALESCE(?,budget), status=COALESCE(?,status), notes=COALESCE(?,notes) WHERE id=?`,
      [title, destination, start_date, end_date, budget ?? null, status, notes ?? null, req.params.id])
    res.json(get('SELECT * FROM trips WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM trip_expenses WHERE trip_id = ?', [req.params.id])
    run('DELETE FROM trips WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Expenses nested under trips
router.get('/:tripId/expenses', (req, res) => {
  try {
    res.json(query('SELECT * FROM trip_expenses WHERE trip_id = ? ORDER BY date DESC', [req.params.tripId]))
  } catch (err) { handleError(res, err) }
})

router.post('/:tripId/expenses', (req, res) => {
  try {
    const { category, amount, description, date } = req.body
    if (amount === undefined || amount === null || isNaN(amount)) return res.status(400).json({ error: 'amount is required' })
    const id = uuidv4()
    run('INSERT INTO trip_expenses (id, trip_id, category, amount, description, date) VALUES (?,?,?,?,?,?)',
      [id, req.params.tripId, category || 'Other', Number(amount), description || null, date || null])
    res.json(get('SELECT * FROM trip_expenses WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/:tripId/expenses/:id', (req, res) => {
  try {
    const { category, amount, description, date } = req.body
    run('UPDATE trip_expenses SET category=COALESCE(?,category), amount=?, description=?, date=? WHERE id=?',
      [category, amount ?? null, description ?? null, date ?? null, req.params.id])
    res.json(get('SELECT * FROM trip_expenses WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/:tripId/expenses/:id', (req, res) => {
  try {
    run('DELETE FROM trip_expenses WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
