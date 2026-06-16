const { query, run } = require('../db/database')
const { parseIntent, processVoiceInput } = require('./voiceParser')
const { executeAction } = require('./actions')
const { v4: uuidv4 } = require('uuid')
const logger = require('./logger')

run(`CREATE TABLE IF NOT EXISTS bot_inbox (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  chat_id TEXT,
  transcript TEXT,
  actions_json TEXT,
  natural_summary TEXT,
  results_json TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
)`)

async function processTextMessage(transcript, source, chatId) {
  const today = new Date()
  const clientDate = today.toISOString()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const actions = await parseIntent(transcript, clientDate, timezone)

  const results = []
  for (const { action, params, natural_summary } of actions) {
    try {
      const result = executeAction(action, params)
      results.push({ action, params, natural_summary, success: true, result })
    } catch (err) {
      results.push({ action, params, natural_summary, success: false, error: err.message })
    }
  }

  run(`INSERT INTO bot_inbox (id, source, chat_id, transcript, actions_json, natural_summary, results_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'processed', datetime('now'))`,
    [uuidv4(), source, String(chatId), transcript, JSON.stringify(actions), actions[0]?.natural_summary || '', JSON.stringify(results)])

  return { actions, results }
}

function formatResults(results) {
  if (!results || results.length === 0) return 'No actions to execute.'
  return results.map(r => `${r.success ? '✅' : '❌'} ${r.natural_summary || r.action}`).join('\n')
}

async function generateAndSendBriefing(chatId, sendFn) {
  try {
    const { gatherFullContext } = require('../routes/ai-shared')
    const { getAIConfig, aiCall } = require('./aiCall')

    const config = getAIConfig()
    if (!config) { await sendFn(chatId, 'AI not configured. Set your API key in settings.'); return }

    const context = gatherFullContext('/dashboard')
    const briefing = await aiCall(config, [
      { role: 'system', content: `You are JARVIS. Generate a concise daily briefing in plain text. Structure:\n\nGood [time], [user]\n\nTODAY'S PRIORITIES:\n- (2-3 tasks)\nHABITS: (streak status)\nPRAYERS: (today's progress)\nINSIGHT: (one cross-domain observation)\n\nKeep under 120 words. Be motivational.\n\nContext:\n${context}` },
      { role: 'user', content: 'Brief me.' },
    ], 1024, 0.5)

    if (briefing) await sendFn(chatId, briefing)
    else await sendFn(chatId, 'Failed to generate briefing.')
  } catch (err) {
    logger.error({ err }, 'Briefing generation failed')
    await sendFn(chatId, 'Failed to generate briefing.')
  }
}

module.exports = { processTextMessage, formatResults, processVoiceInput, generateAndSendBriefing }
