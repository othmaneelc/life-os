const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const { category, status, tag } = req.query
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const params = []
    if (category) { sql += ' AND category = ?'; params.push(category) }
    if (status) { sql += ' AND status = ?'; params.push(status) }
    if (tag) { sql += ' AND tag = ?'; params.push(tag) }
    sql += ' ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, created_at DESC'
    res.json(query(sql, params))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', (req, res) => {
  try {
    const { title, category, tag, priority, status, due_date, notes, is_top_priority } = req.body
    const id = uuidv4()
    run(`INSERT INTO tasks (id, title, category, tag, priority, status, due_date, notes, is_top_priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, category || 'business', tag || null, priority || 'medium', status || 'todo', due_date || null, notes || null, is_top_priority ? 1 : 0])
    res.json(get('SELECT * FROM tasks WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const fields = []
    const params = []
    for (const key of ['title', 'category', 'tag', 'priority', 'status', 'due_date', 'notes', 'is_top_priority']) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`)
        params.push(key === 'is_top_priority' ? (req.body[key] ? 1 : 0) : req.body[key])
      }
    }
    if (req.body.status === 'done') {
      fields.push('completed_at = datetime("now")')
    }
    if (fields.length > 0) {
      fields.push('updated_at = datetime("now")')
      params.push(id)
      run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params)
    }
    res.json(get('SELECT * FROM tasks WHERE id = ?', [id]))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM tasks WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/reorder', (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' })
    ids.forEach((id, index) => {
      run('UPDATE tasks SET sort_order = ?, updated_at = datetime("now") WHERE id = ?', [index, id])
    })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
