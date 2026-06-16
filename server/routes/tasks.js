const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get, getDatabase } = require('../db/database')
const { validate } = require('../middleware/validate')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const { category, status, tag, page: pageStr, limit: limitStr } = req.query
    let sql = 'SELECT * FROM tasks WHERE deleted_at IS NULL'
    const params = []
    if (category) { sql += ' AND category = ?'; params.push(category) }
    if (status) { sql += ' AND status = ?'; params.push(status) }
    if (tag) { sql += ' AND tag = ?'; params.push(tag) }
    sql += ' ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, created_at DESC'
    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr) || 1)
      const limit = Math.min(200, Math.max(1, parseInt(limitStr) || 50))
      const offset = (page - 1) * limit
      const total = get('SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NULL' +
        (category ? ' AND category = ?' : '') +
        (status ? ' AND status = ?' : '') +
        (tag ? ' AND tag = ?' : ''), [...params]).count
      const data = query(sql + ' LIMIT ? OFFSET ?', [...params, limit, offset])
      return res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
    }
    res.json(query(sql, params))
  } catch (err) { handleError(res, err) }
})

router.post('/', validate({
  title: [{ required: true }, { type: 'string' }, { minLength: 1 }, { maxLength: 500 }],
  category: [{ oneOf: ['urgent', 'business', 'personal'] }],
  priority: [{ oneOf: ['high', 'medium', 'low'] }],
  status: [{ oneOf: ['todo', 'inprogress', 'done'] }],
}), (req, res) => {
  try {
    const { title, category, tag, priority, status, due_date, notes, is_top_priority, recurrence } = req.body
    const id = uuidv4()
    run(`INSERT INTO tasks (id, title, category, tag, priority, status, due_date, notes, is_top_priority, recurrence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, category || 'business', tag || null, priority || 'medium', status || 'todo', due_date || null, notes || null, is_top_priority ? 1 : 0, recurrence || null])
    res.json(get('SELECT * FROM tasks WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params
    const fields = []
    const params = []
    const allowed = ['title', 'category', 'tag', 'priority', 'status', 'due_date', 'notes', 'is_top_priority', 'recurrence']
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`)
        params.push(key === 'is_top_priority' ? (req.body[key] ? 1 : 0) : req.body[key])
      }
    }
    if (req.body.status === 'done') {
      fields.push("completed_at = datetime('now')")
    } else if (req.body.status && req.body.status !== 'done') {
      fields.push('completed_at = NULL')
    }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')")
      params.push(id)
      run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params)
    }
    // Auto-create next recurring task when marked done
    const task = get('SELECT * FROM tasks WHERE id = ?', [id])
    if (task && task.recurrence && req.body.status === 'done') {
      let nextDue = null
      const due = task.due_date || new Date().toISOString().split('T')[0]
      if (task.recurrence === 'daily') {
        const d = new Date(due); d.setDate(d.getDate() + 1); nextDue = d.toISOString().split('T')[0]
      } else if (task.recurrence === 'weekly') {
        const d = new Date(due); d.setDate(d.getDate() + 7); nextDue = d.toISOString().split('T')[0]
      } else if (task.recurrence === 'monthly') {
        const d = new Date(due); d.setMonth(d.getMonth() + 1); nextDue = d.toISOString().split('T')[0]
      }
      if (nextDue) {
        const newId = uuidv4()
        run(`INSERT INTO tasks (id, title, category, tag, priority, status, due_date, notes, recurrence)
          VALUES (?, ?, ?, ?, ?, 'todo', ?, ?, ?)`,
          [newId, task.title, task.category, task.tag, task.priority, nextDue, task.notes, task.recurrence])
      }
    }
    res.json(task)
  } catch (err) { handleError(res, err) }
})

router.delete('/:id', (req, res) => {
  try {
    const result = run("UPDATE tasks SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL", [req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Task not found' })
    const task = get('SELECT * FROM tasks WHERE id = ?', [req.params.id])
    res.json(task)
  } catch (err) { handleError(res, err) }
})

router.post('/:id/restore', (req, res) => {
  try {
    run("UPDATE tasks SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?", [req.params.id])
    res.json(get('SELECT * FROM tasks WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.post('/reorder', (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' })
    const db = getDatabase()
    const reorderTransaction = db.transaction((taskIds) => {
      const stmt = db.prepare("UPDATE tasks SET sort_order = ?, updated_at = datetime('now') WHERE id = ?")
      for (let i = 0; i < taskIds.length; i++) {
        stmt.run(i, taskIds[i])
      }
    })
    reorderTransaction(ids)
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
