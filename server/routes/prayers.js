const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')
const { fetchPrayerTimes, getMethods } = require('../services/prayerTimes')

const router = express.Router()

router.get('/methods', (req, res) => {
  try { res.json(getMethods()) } catch (err) { handleError(res, err) }
})

router.get('/times', async (req, res) => {
  try {
    const { date, city, country, method } = req.query
    const today = date || new Date().toISOString().split('T')[0]
    const c = city || get('SELECT value FROM settings WHERE key = ?', ['city'])?.value || 'Casablanca'
    const co = country || get('SELECT value FROM settings WHERE key = ?', ['country'])?.value || 'Morocco'
    const m = method || get('SELECT value FROM settings WHERE key = ?', ['prayer_method'])?.value || '2'
    const result = await fetchPrayerTimes(today, c, co, m, get)
    if (result.fallback) {
      res.json({ date: today, ...result.timings, city: c, country: co, method: parseInt(m), meta: null, fallback: true })
      return
    }
    run('INSERT OR REPLACE INTO prayer_times_cache (date, fajr, sunrise, dhuhr, asr, maghrib, isha, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [today, result.timings.Fajr, result.timings.Sunrise, result.timings.Dhuhr, result.timings.Asr, result.timings.Maghrib, result.timings.Isha])
    const cached = get('SELECT * FROM prayer_times_cache WHERE date = ?', [today])
    res.json({ ...cached, city: c, country: co, method: parseInt(m) })
  } catch (err) { handleError(res, err) }
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
  } catch (err) { handleError(res, err) }
})

router.post('/toggle', (req, res) => {
  try {
    const { date, prayer_name, done, on_time } = req.body
    const existing = get('SELECT * FROM prayers WHERE date = ? AND prayer_name = ?', [date, prayer_name])
    if (existing) {
      run('UPDATE prayers SET done = ?, on_time = ? WHERE id = ?',
        [done ? 1 : 0, on_time !== undefined ? (on_time ? 1 : 0) : (done ? 1 : 0), existing.id])
    } else {
      run('INSERT INTO prayers (id, date, prayer_name, done, on_time) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), date, prayer_name, done ? 1 : 0, on_time !== undefined ? (on_time ? 1 : 0) : (done ? 1 : 0)])
    }
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

router.get('/fajr-streak', (req, res) => {
  try {
    const rows = query('SELECT * FROM prayers WHERE prayer_name = ? AND done = 1 ORDER BY date DESC', ['fajr'])
    let streak = 0
    const today = new Date()
    for (let i = 0; i < rows.length; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - i)
      const expectedDate = expected.toISOString().split('T')[0]
      if (rows[i]?.date === expectedDate) {
        streak++
      } else {
        break
      }
    }
    res.json({ streak })
  } catch (err) { handleError(res, err) }
})

router.get('/stats', (req, res) => {
  try {
    const { start, end } = req.query
    const total = query('SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ?', [start, end])
    const done = query('SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ? AND done = 1', [start, end])
    const onTime = query('SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ? AND on_time = 1', [start, end])
    const completionRate = total[0].count > 0 ? Math.round((done[0].count / total[0].count) * 100) : 0
    const onTimeRate = done[0].count > 0 ? Math.round((onTime[0].count / done[0].count) * 100) : 0
    res.json({ total: total[0].count, done: done[0].count, onTime: onTime[0].count, completionRate, onTimeRate })
  } catch (err) { handleError(res, err) }
})

router.get('/heatmap', (req, res) => {
  try {
    const { start, end } = req.query
    const rows = query('SELECT * FROM prayers WHERE date >= ? AND date <= ? ORDER BY date', [start, end])
    res.json(rows)
  } catch (err) { handleError(res, err) }
})

router.get('/monthly', (req, res) => {
  try {
    const { year, month } = req.query
    const m = month ? month.padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0')
    const y = year || String(new Date().getFullYear())
    const start = `${y}-${m}-01`
    const endDate = new Date(parseInt(y), parseInt(m), 0)
    const end = endDate.toISOString().split('T')[0]
    const prayers = query('SELECT * FROM prayers WHERE date >= ? AND date <= ? ORDER BY date, prayer_name', [start, end])
    const stats = { fajr: { done: 0, total: 0, onTime: 0 }, dhuhr: { done: 0, total: 0, onTime: 0 }, asr: { done: 0, total: 0, onTime: 0 }, maghrib: { done: 0, total: 0, onTime: 0 }, isha: { done: 0, total: 0, onTime: 0 } }
    for (const p of prayers) {
      if (stats[p.prayer_name]) {
        stats[p.prayer_name].total++
        if (p.done) stats[p.prayer_name].done++
        if (p.on_time) stats[p.prayer_name].onTime++
      }
    }
    res.json({ year: parseInt(y), month: parseInt(m), daysInMonth: endDate.getDate(), prayers, stats })
  } catch (err) { handleError(res, err) }
})

module.exports = router
