const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, run, get } = require('../db/database')
const { v4: uuidv4 } = require('uuid')
const { hashPassword, verifyPassword, setVaultKey, clearVaultKey, encrypt, decrypt } = require('../services/encryption')

const router = express.Router()

// Check if vault has a password set
router.get('/status', (req, res) => {
  try {
    const pw = get("SELECT value FROM vault_settings WHERE key = 'password_hash'")
    res.json({ locked: !!pw })
  } catch (err) { handleError(res, err) }
})

// Set initial password
router.post('/setup', (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' })
    const existing = get("SELECT value FROM vault_settings WHERE key = 'password_hash'")
    if (existing) return res.status(400).json({ error: 'Vault already has a password' })
    const hash = hashPassword(password)
    run("INSERT INTO vault_settings (key, value) VALUES ('password_hash', ?)", [hash])
    setVaultKey(password)
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Unlock vault
router.post('/unlock', (req, res) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password required' })
    const stored = get("SELECT value FROM vault_settings WHERE key = 'password_hash'")
    if (!stored) return res.status(400).json({ error: 'Vault not set up' })
    if (!verifyPassword(password, stored.value)) return res.status(401).json({ error: 'Incorrect password' })
    setVaultKey(password)
    res.json({ success: true })
  } catch (err) { handleError(res, err); clearVaultKey() }
})

// Lock vault
router.post('/lock', (req, res) => {
  try {
    clearVaultKey()
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Reset vault (forgot password) — wipes all entries + password
router.post('/reset', (req, res) => {
  try {
    run('DELETE FROM vault_entries')
    run("DELETE FROM vault_settings WHERE key = 'password_hash'")
    clearVaultKey()
    res.json({ success: true, message: 'Vault reset. All entries cleared.' })
  } catch (err) { handleError(res, err) }
})

// List entries (titles only, not decrypted)
router.get('/entries', (req, res) => {
  try {
    const entries = query('SELECT id, title, pinned, created_at, updated_at FROM vault_entries ORDER BY pinned DESC, updated_at DESC')
    res.json(entries)
  } catch (err) { handleError(res, err) }
})

// Get single entry (decrypted)
router.get('/entries/:id', (req, res) => {
  try {
    const entry = get('SELECT * FROM vault_entries WHERE id = ?', [req.params.id])
    if (!entry) return res.status(404).json({ error: 'Not found' })
    const body = decrypt(entry.body_encrypted, entry.body_iv, entry.body_tag)
    res.json({ id: entry.id, title: entry.title, body, pinned: entry.pinned, created_at: entry.created_at, updated_at: entry.updated_at })
  } catch (err) { handleError(res, err) }
})

// Create entry
router.post('/entries', (req, res) => {
  try {
    const { title, body } = req.body
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' })
    const id = uuidv4()
    const { encrypted, iv, authTag } = encrypt(body)
    run('INSERT INTO vault_entries (id, title, body_encrypted, body_iv, body_tag) VALUES (?, ?, ?, ?, ?)', [id, title, encrypted, iv, authTag])
    res.json({ id, title, created_at: new Date().toISOString() })
  } catch (err) { handleError(res, err) }
})

// Update entry
router.put('/entries/:id', (req, res) => {
  try {
    const { title, body, pinned } = req.body
    const entry = get('SELECT * FROM vault_entries WHERE id = ?', [req.params.id])
    if (!entry) return res.status(404).json({ error: 'Not found' })
    const updates = []
    const params = []
    if (title !== undefined) { updates.push('title = ?'); params.push(title) }
    if (body !== undefined) { const { encrypted, iv, authTag } = encrypt(body); updates.push('body_encrypted = ?, body_iv = ?, body_tag = ?'); params.push(encrypted, iv, authTag) }
    if (pinned !== undefined) { updates.push('pinned = ?'); params.push(pinned ? 1 : 0) }
    if (updates.length === 0) return res.json({ unchanged: true })
    updates.push("updated_at = datetime('now')")
    params.push(req.params.id)
    run(`UPDATE vault_entries SET ${updates.join(', ')} WHERE id = ?`, params)
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

// Delete entry
router.delete('/entries/:id', (req, res) => {
  try {
    run('DELETE FROM vault_entries WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
