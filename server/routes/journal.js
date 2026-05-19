const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')
const { syncToObsidian } = require('../services/obsidianSync')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const { date, search } = req.query
    if (date) {
      return res.json(get('SELECT * FROM journal_entries WHERE date = ?', [date]))
    }
    if (search) {
      return res.json(query(
        'SELECT * FROM journal_entries WHERE what_happened LIKE ? OR gratitude LIKE ? OR muhasaba LIKE ? ORDER BY date DESC',
        [`%${search}%`, `%${search}%`, `%${search}%`]
      ))
    }
    res.json(query('SELECT * FROM journal_entries ORDER BY date DESC'))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { date, mood, what_happened, gratitude, muhasaba, tomorrow_intention, tags } = req.body
    const existing = get('SELECT * FROM journal_entries WHERE date = ?', [date])
    if (existing) {
      run(`UPDATE journal_entries SET mood=?, what_happened=?, gratitude=?, muhasaba=?, tomorrow_intention=?, tags=?, updated_at=datetime('now') WHERE date=?`,
        [mood, what_happened, gratitude, muhasaba, tomorrow_intention, tags ? JSON.stringify(tags) : null, date])
      const entry = get('SELECT * FROM journal_entries WHERE date = ?', [date])
      setImmediate(() => syncToObsidian(entry))
      return res.json(entry)
    }
    const id = uuidv4()
    run(`INSERT INTO journal_entries (id, date, mood, what_happened, gratitude, muhasaba, tomorrow_intention, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, date, mood, what_happened, gratitude, muhasaba, tomorrow_intention, tags ? JSON.stringify(tags) : null])
    const entry = get('SELECT * FROM journal_entries WHERE id = ?', [id])
    setImmediate(() => syncToObsidian(entry))
    res.json(entry)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:date', (req, res) => {
  try {
    const entry = get('SELECT * FROM journal_entries WHERE date = ?', [req.params.date])
    res.json(entry || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/mood-trend', (req, res) => {
  try {
    const days = query("SELECT date, mood FROM journal_entries WHERE date >= date('now', '-30 days') ORDER BY date")
    res.json(days)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/photos/:date', (req, res) => {
  try {
    const photos = query('SELECT * FROM journal_photos WHERE entry_date = ? ORDER BY sort_order', [req.params.date])
    res.json(photos)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/upload', (req, res) => {
  try {
    const { entry_date, photo_data, caption } = req.body
    if (!entry_date || !photo_data) return res.status(400).json({ error: 'Missing data' })
    const id = uuidv4()
    const maxSort = get('SELECT MAX(sort_order) as m FROM journal_photos WHERE entry_date = ?', [entry_date])
    const sortOrder = (maxSort?.m || 0) + 1
    run('INSERT INTO journal_photos (id, entry_date, photo_data, caption, sort_order) VALUES (?, ?, ?, ?, ?)',
      [id, entry_date, photo_data, caption || null, sortOrder])
    const photo = get('SELECT * FROM journal_photos WHERE id = ?', [id])
    res.json(photo)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/photos/:id', (req, res) => {
  try {
    run('DELETE FROM journal_photos WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/ai-summary', async (req, res) => {
  try {
    const { date } = req.body
    const entry = get('SELECT * FROM journal_entries WHERE date = ?', [date])
    if (!entry) return res.json({ summary: null })
    const { default: fetch } = await import('node-fetch')
    const settings = query('SELECT * FROM settings')
    const groqKey = settings?.find(s => s.key === 'groq_key')?.value
    if (!groqKey) return res.json({ summary: 'Add a Groq key in Settings to use AI summaries.' })
    const prompt = `Summarize this journal entry in 2-3 insightful sentences. Focus on patterns, mood, and key themes. Keep it warm and personal.\n\nDate: ${entry.date}\nMood: ${entry.mood}/5\nWhat happened: ${entry.what_happened}\nGratitude: ${entry.gratitude}\nMuhasaba: ${entry.muhasaba}`
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 200 }),
    })
    const data = await resp.json()
    res.json({ summary: data.choices?.[0]?.message?.content || 'Could not generate summary.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM journal_entries WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
