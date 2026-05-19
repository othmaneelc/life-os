const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const habits = query('SELECT * FROM habits WHERE active = 1 ORDER BY sort_order')
    res.json(habits)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const habits = query(`SELECT h.*, hl.done as done_today, hl.id as log_id
      FROM habits h LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date = ?
      WHERE h.active = 1 ORDER BY h.sort_order`, [today])
    res.json(habits)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/week', (req, res) => {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - dayOfWeek)
    const end = new Date(today)
    end.setDate(today.getDate() + (6 - dayOfWeek))
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    const habits = query('SELECT * FROM habits WHERE active = 1 ORDER BY sort_order')
    const logs = query('SELECT * FROM habit_logs WHERE date >= ? AND date <= ?', [startStr, endStr])

    function getStreak(habitId) {
      const doneLogs = query('SELECT date FROM habit_logs WHERE habit_id = ? AND done = 1 ORDER BY date DESC', [habitId])
      if (!doneLogs.length) return 0
      let streak = 0
      for (let i = 0; i < doneLogs.length; i++) {
        const expected = new Date()
        expected.setDate(expected.getDate() - i)
        const expectedDate = expected.toISOString().split('T')[0]
        if (doneLogs[i].date === expectedDate) { streak++ } else { break }
      }
      return streak
    }

    const result = habits.map(h => ({
      ...h,
      logs: logs.filter(l => l.habit_id === h.id),
      streak: getStreak(h.id),
    }))
    res.json({ start: startStr, end: endStr, habits: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/month', (req, res) => {
  try {
    const { start, end } = req.query
    if (!start || !end) return res.status(400).json({ error: 'start and end required' })
    const logs = query('SELECT * FROM habit_logs WHERE date >= ? AND date <= ?', [start, end])
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/log', (req, res) => {
  try {
    const { habit_id, date, done } = req.body
    const existing = get('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?', [habit_id, date])
    if (existing) {
      run('UPDATE habit_logs SET done = ? WHERE id = ?', [done ? 1 : 0, existing.id])
    } else {
      run('INSERT INTO habit_logs (id, habit_id, date, done) VALUES (?, ?, ?, ?)',
        [uuidv4(), habit_id, date, done ? 1 : 0])
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/stats', (req, res) => {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - dayOfWeek)
    const startStr = start.toISOString().split('T')[0]
    const endStr = today.toISOString().split('T')[0]

    const habits = query('SELECT * FROM habits WHERE active = 1')
    const logs = query('SELECT * FROM habit_logs WHERE date >= ? AND date <= ?', [startStr, endStr])

    // Fetch all done logs for streak calculation in a single query
    const allDoneLogs = query('SELECT habit_id, date FROM habit_logs WHERE done = 1 ORDER BY date DESC')
    const logsByHabit = {}
    allDoneLogs.forEach(l => {
      if (!logsByHabit[l.habit_id]) logsByHabit[l.habit_id] = []
      logsByHabit[l.habit_id].push(l.date)
    })

    let totalPossible = 0
    let totalDone = 0
    let bestStreak = { name: '', streak: 0 }
    let needsAttention = []
    let perfectDays = 0

    const daysInRange = query('SELECT DISTINCT date FROM habit_logs WHERE date >= ? AND date <= ? ORDER BY date', [startStr, endStr])
    const dayCount = daysInRange.length || 1

    for (const h of habits) {
      const hLogs = logs.filter(l => l.habit_id === h.id)
      const done = hLogs.filter(l => l.done).length
      totalPossible += dayCount
      totalDone += done

      if (done < dayCount) {
        needsAttention.push({ name: h.name, done, total: dayCount })
      }

      // Calculate streak from pre-fetched logs (no N+1 queries)
      let streak = 0
      const hDoneDates = logsByHabit[h.id] || []
      for (let i = 0; i < 365; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dStr = d.toISOString().split('T')[0]
        if (hDoneDates.includes(dStr)) {
          streak++
        } else {
          break
        }
      }
      if (streak > bestStreak.streak) {
        bestStreak = { name: h.name, streak }
      }
    }

    // Count perfect days
    for (const d of daysInRange) {
      const dayLogs = logs.filter(l => l.date === d.date)
      if (dayLogs.length > 0 && dayLogs.every(l => l.done)) {
        perfectDays++
      }
    }

    const weekCompletion = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0

    res.json({
      weekCompletion,
      bestStreak,
      needsAttention: needsAttention.slice(0, 3),
      perfectDays,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { name, category, frequency } = req.body
    const id = uuidv4()
    const maxOrder = get('SELECT MAX(sort_order) as max FROM habits')
    run('INSERT INTO habits (id, name, category, frequency, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)',
      [id, name, category, frequency || 'daily', (maxOrder?.max || 10) + 1])
    res.json(get('SELECT * FROM habits WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/reorder', (req, res) => {
  try {
    const { order } = req.body
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' })
    const stmt = 'UPDATE habits SET sort_order = ? WHERE id = ?'
    order.forEach((id, idx) => run(stmt, [idx, id]))
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', (req, res) => {
  try {
    const { name, category, frequency } = req.body
    run('UPDATE habits SET name=COALESCE(?,name), category=COALESCE(?,category), frequency=COALESCE(?,frequency) WHERE id=?',
      [name, category, frequency, req.params.id])
    res.json(get('SELECT * FROM habits WHERE id = ?', [req.params.id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', (req, res) => {
  try {
    run('UPDATE habits SET active = 0 WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

