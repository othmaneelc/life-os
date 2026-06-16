const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, run, get } = require('../db/database')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

// List all identities
router.get('/', (req, res) => {
  try {
    const identities = query('SELECT * FROM identities ORDER BY sort_order')
    res.json(identities)
  } catch (err) { handleError(res, err) }
})

// Create identity
router.post('/', (req, res) => {
  try {
    const { name, avatar_url, focus_areas, accent_color, theme } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const id = uuidv4()
    const count = query('SELECT COUNT(*) as c FROM identities')[0].c
    run('INSERT INTO identities (id, name, avatar_url, focus_areas, accent_color, theme, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, avatar_url || null, JSON.stringify(focus_areas || []), accent_color || '#5B5BD6', theme || 'dark', count])
    res.json({ id, name })
  } catch (err) { handleError(res, err) }
})

// Update identity
router.put('/:id', (req, res) => {
  try {
    const { name, avatar_url, focus_areas, accent_color, theme, sort_order } = req.body
    const existing = get('SELECT * FROM identities WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Not found' })
    const updates = []; const params = []
    if (name !== undefined) { updates.push('name = ?'); params.push(name) }
    if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url) }
    if (focus_areas !== undefined) { updates.push('focus_areas = ?'); params.push(JSON.stringify(focus_areas)) }
    if (accent_color !== undefined) { updates.push('accent_color = ?'); params.push(accent_color) }
    if (theme !== undefined) { updates.push('theme = ?'); params.push(theme) }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order) }
    if (updates.length === 0) return res.json({ unchanged: true })
    params.push(req.params.id)
    run(`UPDATE identities SET ${updates.join(', ')} WHERE id = ?`, params)
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Switch active identity
router.post('/switch', (req, res) => {
  try {
    const { id } = req.body
    const identity = get('SELECT * FROM identities WHERE id = ?', [id])
    if (!identity) return res.status(404).json({ error: 'Identity not found' })
    run('UPDATE identities SET active = 0 WHERE active = 1')
    run('UPDATE identities SET active = 1 WHERE id = ?', [id])
    res.json({ active: { id: identity.id, name: identity.name, accent_color: identity.accent_color, theme: identity.theme } })
  } catch (err) { handleError(res, err) }
})

// Delete identity
router.delete('/:id', (req, res) => {
  try {
    const identity = get('SELECT * FROM identities WHERE id = ?', [req.params.id])
    if (!identity) return res.status(404).json({ error: 'Not found' })
    run('DELETE FROM identities WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
