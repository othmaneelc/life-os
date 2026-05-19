const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')
const { fetchPrayerTimes } = require('../services/prayerTimes')

const router = express.Router()

router.get('/times', async (req, res) => {
  try {
    const { date } = req.query
    const today = date || new Date().toISOString().split('T')[0]
    let cached = get('SELECT * FROM prayer_times_cache WHERE date = ?', [today])
    if (!cached) {
      const times = await fetchPrayerTimes(today)
      run('INSERT OR REPLACE INTO prayer_times_cache (date, fajr, sunrise, dhuhr, asr, maghrib, isha, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
        [today, times.Fajr, times.Sunrise, times.Dhuhr, times.Asr, times.Maghrib, times.Isha])
      cached = get('SELECT * FROM prayer_times_cache WHERE date = ?', [today])
    }
    res.json(cached)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    let prayers = query('SELECT * FROM prayers WHERE date = ?', [today])
    if (!prayers.length) {
      const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
      prayerNames.forEach(name => {
        run('INSERT INTO prayers (id, date, prayer_name, done, on_time) VALUES (?, ?, ?, 0, 0)', [uuidv4(), today, name])
      })
      prayers = query('SELECT * FROM prayers WHERE date = ?', [today])
    }
    res.json(prayers)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/toggle', (req, res) => {
  try {
    const { date, prayer_name, done } = req.body
    const existing = get('SELECT * FROM prayers WHERE date = ? AND prayer_name = ?', [date, prayer_name])
    if (existing) {
      run('UPDATE prayers SET done = ?, on_time = ? WHERE id = ?', [done ? 1 : 0, done ? 1 : 0, existing.id])
    } else {
      run('INSERT INTO prayers (id, date, prayer_name, done, on_time) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), date, prayer_name, done ? 1 : 0, done ? 1 : 0])
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/fajr-streak', (req, res) => {
  try {
    const rows = query('SELECT * FROM prayers WHERE prayer_name = ? AND done = 1 ORDER BY date DESC', ['fajr'])
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    for (let i = 0; i < rows.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      const expectedDate = expected.toISOString().split('T')[0]
      if (rows[i]?.date === expectedDate) {
        streak++
      } else {
        break
      }
    }
    res.json({ streak })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/stats', (req, res) => {
  try {
    const { start, end } = req.query
    const total = query('SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ?', [start, end])
    const done = query('SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ? AND done = 1', [start, end])
    const completionRate = total[0].count > 0 ? Math.round((done[0].count / total[0].count) * 100) : 0
    res.json({ total: total[0].count, done: done[0].count, completionRate })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/heatmap', (req, res) => {
  try {
    const { start, end } = req.query
    const rows = query('SELECT * FROM prayers WHERE date >= ? AND date <= ? ORDER BY date', [start, end])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
