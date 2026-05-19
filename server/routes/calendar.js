const express = require('express')
const { getGoogleAuth } = require('../services/googleAuth')
const { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getCalendarEventsRange } = require('../services/googleCalendar')
const { syncEvents, getSyncedEvents, getSyncStatus } = require('../services/googleCalendarSync')

const router = express.Router()

router.get('/events', async (req, res) => {
  try {
    const { date } = req.query
    const auth = getGoogleAuth()
    if (!auth) {
      return res.json({ error: 'not_connected', events: [] })
    }
    const events = await getCalendarEvents(auth, date)
    res.json({ events })
  } catch (err) {
    res.status(500).json({ error: err.message, events: [] })
  }
})

router.get('/events-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const auth = getGoogleAuth()
    if (!auth) {
      return res.json({ error: 'not_connected', events: [] })
    }
    const events = await getCalendarEventsRange(auth, startDate, endDate)
    res.json({ events })
  } catch (err) {
    res.status(500).json({ error: err.message, events: [] })
  }
})

router.post('/create', async (req, res) => {
  try {
    const auth = getGoogleAuth()
    if (!auth) {
      return res.status(400).json({ error: 'not_connected' })
    }
    const event = await createCalendarEvent(auth, req.body)
    res.json({ event })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:eventId', async (req, res) => {
  try {
    const auth = getGoogleAuth()
    if (!auth) {
      return res.status(400).json({ error: 'not_connected' })
    }
    const event = await updateCalendarEvent(auth, req.params.eventId, req.body)
    res.json({ event })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:eventId', async (req, res) => {
  try {
    const auth = getGoogleAuth()
    if (!auth) {
      return res.status(400).json({ error: 'not_connected' })
    }
    await deleteCalendarEvent(auth, req.params.eventId)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/synced', (req, res) => {
  try {
    const { date } = req.query
    const auth = getGoogleAuth()
    if (!auth) {
      return res.json({ error: 'not_connected', events: [] })
    }
    const events = getSyncedEvents(date || new Date().toISOString().split('T')[0])
    const status = getSyncStatus()
    res.json({ events, status })
  } catch (err) {
    res.status(500).json({ error: err.message, events: [] })
  }
})

router.post('/sync', async (req, res) => {
  try {
    const auth = getGoogleAuth()
    if (!auth) {
      return res.status(400).json({ error: 'not_connected' })
    }
    const result = await syncEvents(auth)
    const status = getSyncStatus()
    res.json({ result, status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/status', (req, res) => {
  try {
    const auth = getGoogleAuth()
    if (!auth) {
      return res.json({ connected: false, status: null })
    }
    const status = getSyncStatus()
    res.json({ connected: true, status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/synced/:id', (req, res) => {
  try {
    const { run } = require('../db/database')
    run('DELETE FROM google_calendar_events WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
