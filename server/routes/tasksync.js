const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { getGoogleAuth } = require('../services/googleAuth')
const { syncTasks } = require('../services/googleTasks')
const { run } = require('../db/database')

const router = express.Router()

router.post('/sync', async (req, res) => {
  try {
    const auth = getGoogleAuth()
    if (!auth) {
      return res.status(400).json({ error: 'Google account not connected. Go to Settings to connect.' })
    }
    const result = await syncTasks(auth)
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['google_tasks_connected', 'true'])
    res.json(result)
  } catch (err) { handleError(res, err) }
})

router.get('/status', (req, res) => {
  try {
    const auth = getGoogleAuth()
    res.json({ connected: !!auth })
  } catch {
    res.json({ connected: false })
  }
})

module.exports = router
