const express = require('express')
const { getAuthUrl, handleCallback, disconnectGoogle, getGoogleAuth } = require('../services/googleAuth')

const router = express.Router()

router.get('/google', (req, res) => {
  const url = getAuthUrl()
  if (!url) {
    return res.status(400).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env' })
  }
  res.json({ url })
})

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).json({ error: 'No authorization code provided' })
    await handleCallback(code)
    res.redirect('http://localhost:5173/settings?google=connected')
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/google/disconnect', (req, res) => {
  disconnectGoogle()
  res.json({ success: true })
})

router.get('/status', (req, res) => {
  const auth = getGoogleAuth()
  res.json({ connected: !!auth })
})

module.exports = router
