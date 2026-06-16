const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const { type } = req.query
    let sql = 'SELECT * FROM relationships'
    const params = []
    if (type && type !== 'all') { sql += ' WHERE relationship_type = ?'; params.push(type) }
    sql += ' ORDER BY name ASC'
    res.json(query(sql, params))
  } catch (err) { handleError(res, err) }
})

router.post('/', (req, res) => {
  try {
    const { name, relationship_type, birthday, phone, email, notes, last_contact, importance } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const id = uuidv4()
    run('INSERT INTO relationships (id, name, relationship_type, birthday, phone, email, notes, last_contact, importance) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, name, relationship_type || 'other', birthday || null, phone || null, email || null, notes || null, last_contact || null, importance || 3])
    res.json(get('SELECT * FROM relationships WHERE id = ?', [id]))
  } catch (err) { handleError(res, err) }
})

router.get('/:id', (req, res) => {
  try {
    const rel = get('SELECT * FROM relationships WHERE id = ?', [req.params.id])
    if (!rel) return res.status(404).json({ error: 'Not found' })
    res.json(rel)
  } catch (err) { handleError(res, err) }
})

router.put('/:id', (req, res) => {
  try {
    const { name, relationship_type, birthday, phone, email, notes, last_contact, importance } = req.body
    run(`UPDATE relationships SET name=COALESCE(?,name), relationship_type=COALESCE(?,relationship_type), birthday=COALESCE(?,birthday), phone=COALESCE(?,phone), email=COALESCE(?,email), notes=COALESCE(?,notes), last_contact=COALESCE(?,last_contact), importance=COALESCE(?,importance) WHERE id=?`,
      [name, relationship_type, birthday ?? null, phone ?? null, email ?? null, notes ?? null, last_contact ?? null, importance ?? null, req.params.id])
    res.json(get('SELECT * FROM relationships WHERE id = ?', [req.params.id]))
  } catch (err) { handleError(res, err) }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM relationships WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
