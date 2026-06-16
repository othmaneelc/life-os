const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { v4: uuidv4 } = require('uuid')
const { query, run, get } = require('../db/database')
const multer = require('multer')
const { processVoiceInput } = require('../services/voiceParser')
const { executeAction } = require('../services/actions')
const logger = require('../services/logger')

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

router.post('/inbox', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No audio provided' })

    const clientDate = req.body.clientDate || new Date().toISOString()
    const clientTimezone = req.body.clientTimezone || 'UTC'

    const { transcript, actions, natural_summary } = await processVoiceInput(
      req.file.buffer,
      clientDate,
      clientTimezone
    )

    if (!transcript.trim()) {
      return res.status(422).json({ success: false, transcript: '', actions: [], natural_summary: 'No speech detected', error: 'No speech detected' })
    }

    const id = uuidv4()
    const actionsJson = JSON.stringify(actions)

    const highRisk = actions.some(a =>
      (a.action === 'add_expense' || a.action === 'add_income' || a.action === 'add_transaction') &&
      (a.params?.amount || 0) >= 500
    )

    run(
      `INSERT INTO voice_inbox (id, transcript, actions_json, natural_summary, client_date, client_timezone, risk_level, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, transcript, actionsJson, natural_summary, clientDate, clientTimezone, highRisk ? 'high' : 'low']
    )

    res.json({ success: true, inboxId: id, transcript, actions, natural_summary, riskLevel: highRisk ? 'high' : 'low' })
  } catch (err) {
    logger.error({ err }, 'Voice inbox submission failed')
    handleError(res, err)
  }
})

router.post('/inbox/:id/execute', async (req, res) => {
  try {
    const entry = get('SELECT * FROM voice_inbox WHERE id = ? AND status = ?', [req.params.id, 'pending'])
    if (!entry) return res.status(404).json({ success: false, error: 'Item not found or already processed' })

    const actions = JSON.parse(entry.actions_json || '[]')
    if (!actions.length) {
      run('UPDATE voice_inbox SET status = ?, error = ? WHERE id = ?', ['executed', 'No actions to execute', req.params.id])
      return res.json({ success: true, results: [] })
    }

    const results = []
    for (const { action, params } of actions) {
      try {
        const result = executeAction(action, params)
        results.push({ action, params, success: true, result })
      } catch (err) {
        results.push({ action, params, success: false, error: "Internal server error" })
      }
    }

    const hasErrors = results.some(r => !r.success)
    run(`UPDATE voice_inbox SET status = ?, executed_at = datetime('now'), error = ? WHERE id = ?`,
      [hasErrors ? 'partial' : 'executed', hasErrors ? JSON.stringify(results.filter(r => !r.success).map(r => r.error)) : null, req.params.id])

    res.json({ success: true, results })
  } catch (err) {
    logger.error({ err }, 'Voice inbox execution failed')
    handleError(res, err)
  }
})

router.delete('/inbox/:id', async (req, res) => {
  try {
    const entry = get('SELECT * FROM voice_inbox WHERE id = ? AND status = ?', [req.params.id, 'pending'])
    if (!entry) return res.status(404).json({ success: false, error: 'Item not found or already processed' })
    run('UPDATE voice_inbox SET status = ? WHERE id = ?', ['discarded', req.params.id])
    res.json({ success: true, discarded: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
