const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const rows = query('SELECT * FROM sleep_logs ORDER BY date DESC')
    res.json(rows)
  } catch (err) { handleError(res, err) }
})

router.get('/current', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const row = get('SELECT * FROM sleep_logs WHERE date = ?', [today])
    res.json(row || null)
  } catch (err) { handleError(res, err) }
})

router.post('/', (req, res) => {
  try {
    const { date, bedtime, wake_time, duration_min, quality, notes } = req.body
    if (!date) return res.status(400).json({ error: 'date is required' })
    if (quality != null && (quality < 1 || quality > 5)) return res.status(400).json({ error: 'quality must be between 1 and 5' })

    const existing = get('SELECT * FROM sleep_logs WHERE date = ?', [date])
    if (existing) {
      run(`UPDATE sleep_logs SET bedtime=COALESCE(?,bedtime), wake_time=COALESCE(?,wake_time), duration_min=COALESCE(?,duration_min), quality=COALESCE(?,quality), notes=COALESCE(?,notes) WHERE date=?`,
        [bedtime ?? null, wake_time ?? null, duration_min ?? null, quality ?? null, notes ?? null, date])
      return res.json(get('SELECT * FROM sleep_logs WHERE date = ?', [date]))
    }
    const id = uuidv4()
    run('INSERT INTO sleep_logs (id, date, bedtime, wake_time, duration_min, quality, notes) VALUES (?,?,?,?,?,?,?)',
      [id, date, bedtime || null, wake_time || null, duration_min || null, quality != null ? quality : null, notes || null])
    res.json(get('SELECT * FROM sleep_logs WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/:id', (req, res) => {
  try {
    const existing = get('SELECT * FROM sleep_logs WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Not found' })
    run('DELETE FROM sleep_logs WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
