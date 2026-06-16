const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query, run, get, getDatabase } = require('../db/database')
const { requireAuth } = require('../middleware/auth')
const { apiError, HTTP_STATUS } = require('../middleware/errorHandler')
const crypto = require('crypto')
const { getAuthUrl } = require('../services/googleAuth')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET environment variable is required.')
}
const JWT_EXPIRY = '30d'

router.post('/register', (req, res) => {
  try {
    const { username, email, password, name } = req.body
    if (!username || !email || !password) {
      return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Username, email, and password are required')
    }
    if (typeof password !== 'string' || password.length < 6) {
      return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Password must be at least 6 characters')
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid email format')
    }
    const existing = get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email])
    if (existing) {
      return apiError(res, HTTP_STATUS.CONFLICT, 'Username or email already exists')
    }
    const hashedPassword = bcrypt.hashSync(password, 12)
    const info = getDatabase().prepare(
      'INSERT INTO users (username, email, password, name) VALUES (?, ?, ?, ?)'
    ).run(username, email, hashedPassword, name || null)
    const user = get('SELECT id, username, email, name, created_at FROM users WHERE id = ?', [info.lastInsertRowid])
    const defaults = [
      ['city', 'Casablanca'],
      ['country', 'Morocco'],
      ['prayer_method', '2'],
      ['obsidian_path', '~/Documents/ObsidianVault'],
      ['user_name', name || ''],
    ]
    for (const [key, value] of defaults) {
      run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value])
    }
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRY })
    res.json({ success: true, token, user })
  } catch (err) {
    return apiError(res, HTTP_STATUS.INTERNAL_ERROR, err.message)
  }
})

router.post('/login', (req, res) => {
  try {
    const { username, email, password } = req.body
    if ((!username && !email) || !password) {
      return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Username or email and password are required')
    }
    const user = get(
      'SELECT id, username, email, password, name, created_at FROM users WHERE username = ? OR email = ?',
      [username || email, username || email]
    )
    if (!user) {
      return apiError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials')
    }
    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) {
      return apiError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials')
    }
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRY })
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, name: user.name, created_at: user.created_at }
    })
  } catch (err) {
    return apiError(res, HTTP_STATUS.INTERNAL_ERROR, err.message)
  }
})

router.get('/me', requireAuth, (req, res) => {
  try {
    const user = get('SELECT id, username, email, name, created_at FROM users WHERE id = ?', [req.user.id])
    if (!user) {
      return apiError(res, HTTP_STATUS.NOT_FOUND, 'User not found')
    }
    const profileImage = get('SELECT value FROM settings WHERE key = ?', ['profile_image'])
    res.json({ success: true, user: { ...user, profile_image: profileImage?.value || null } })
  } catch (err) {
    return apiError(res, HTTP_STATUS.INTERNAL_ERROR, err.message)
  }
})

router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body
    if (!email) return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Email is required')
    const user = get('SELECT id, email FROM users WHERE email = ?', [email])
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been generated' })
    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [`reset_token:${email}`, `${token}:${expiry}`])
    res.json({ success: true, token, message: 'Use this token to reset your password (valid for 1 hour)' })
  } catch (err) {
    return apiError(res, HTTP_STATUS.INTERNAL_ERROR, err.message)
  }
})

router.post('/reset-password', (req, res) => {
  try {
    const { email, token, password } = req.body
    if (!email || !token || !password) return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Email, token, and new password are required')
    if (typeof password !== 'string' || password.length < 6) return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Password must be at least 6 characters')
    const row = get('SELECT value FROM settings WHERE key = ?', [`reset_token:${email}`])
    if (!row) return apiError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired reset token')
    const [storedToken, expiry] = row.value.split(':')
    if (storedToken !== token) return apiError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid reset token')
    if (new Date(expiry) < new Date()) return apiError(res, HTTP_STATUS.UNAUTHORIZED, 'Reset token has expired')
    const hashed = bcrypt.hashSync(password, 12)
    run('UPDATE users SET password = ? WHERE email = ?', [hashed, email])
    run('DELETE FROM settings WHERE key = ?', [`reset_token:${email}`])
    res.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    return apiError(res, HTTP_STATUS.INTERNAL_ERROR, err.message)
  }
})

router.get('/google', (req, res) => {
  try {
    const { run } = require('../db/database')
    const state = crypto.randomBytes(32).toString('hex')
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['oauth_state', state])
    const url = getAuthUrl(state)
    if (!url) {
      return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Google OAuth not configured. Add Client ID and Secret in Settings.')
    }
    res.json({ url })
  } catch (err) {
    return apiError(res, HTTP_STATUS.INTERNAL_ERROR, err.message)
  }
})

module.exports = router
