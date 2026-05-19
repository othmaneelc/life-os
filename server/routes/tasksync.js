const express = require('express')
const { getGoogleAuth } = require('../services/googleAuth')
const { syncTasks } = require('../services/googleTasks')

const router = express.Router()

router.post('/sync', async (req, res) => {
  try {
    const auth = getGoogleAuth()
    if (!auth) {
      return res.status(400).json({ error: 'Google account not connected. Go to Settings to connect.' })
    }
    const result = await syncTasks(auth)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
