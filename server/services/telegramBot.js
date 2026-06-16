const TelegramBot = require('node-telegram-bot-api')
const fetch = require('node-fetch')
const { query, run } = require('../db/database')
const { processTextMessage, formatResults, generateAndSendBriefing, processVoiceInput } = require('./botProcessor')
const logger = require('./logger')

let bot = null

function getToken() {
  const row = query('SELECT value FROM settings WHERE key = ?', ['telegram_bot_token'])
  return row?.[0]?.value || null
}

function getAllowedChatIds() {
  const row = query('SELECT value FROM settings WHERE key = ?', ['telegram_chat_id'])
  if (!row?.[0]?.value) return []
  return row[0].value.split(',').map(s => s.trim()).filter(Boolean).map(s => { const n = parseInt(s); return isNaN(n) ? s : n })
}

function isAllowed(chatId) {
  const ids = getAllowedChatIds()
  return ids.length === 0 || ids.includes(chatId)
}

async function handleMessage(msg) {
  const chatId = msg.chat.id
  if (!isAllowed(chatId)) { await bot.sendMessage(chatId, 'Sorry, you are not authorized.'); return }
  const text = msg.text?.trim()
  if (!text) return

  if (text.startsWith('/')) {
    const cmd = text.split(' ')[0].toLowerCase()
    switch (cmd) {
      case '/start':
        await bot.sendMessage(chatId, 'Hello! I\'m your Life OS assistant. Send me a message and I\'ll process it.\n\nCommands:\n/briefing - Get today\'s briefing\n/today - Today\'s summary\n/help - Show this message')
        return
      case '/help':
        await bot.sendMessage(chatId, 'Send me any message and I\'ll parse it into actions.\n\nCommands:\n/briefing - Daily briefing\n/today - Today summary\n/help - This message\n\nExamples:\n"Add task buy groceries tomorrow"\n"Log fajr prayer"\n"Create habit read 30 minutes daily"')
        return
      case '/briefing':
        await bot.sendMessage(chatId, 'Generating your briefing...')
        await generateAndSendBriefing(chatId, (id, msg) => bot.sendMessage(id, msg))
        return
      case '/today':
        try {
          const { gatherFullContext } = require('../routes/ai-shared')
          const ctx = gatherFullContext('/dashboard')
          const summary = [
            `📅 ${ctx.date} — ${ctx.dayOfWeek}`,
            '',
            `Tasks: ${ctx.tasksOverview || 'N/A'}`,
            `Habits: ${ctx.habitsOverview || 'N/A'}`,
            `Prayers: ${ctx.prayersOverview || 'N/A'}`,
            `Revenue: ${ctx.revenueOverview || 'N/A'}`,
          ].join('\n')
          await bot.sendMessage(chatId, summary)
        } catch (err) {
          await bot.sendMessage(chatId, 'Failed to get today\'s summary.')
        }
        return
    }
    return
  }

  try {
    const { results } = await processTextMessage(text, 'telegram', chatId)
    await bot.sendMessage(chatId, formatResults(results))
  } catch (err) {
    logger.error({ err, text }, 'Telegram message processing failed')
    await bot.sendMessage(chatId, 'Sorry, I couldn\'t process that. Make sure your Groq API key is configured.')
  }
}

async function handleVoice(msg) {
  const chatId = msg.chat.id
  if (!isAllowed(chatId)) return

  try {
    const fileId = msg.voice?.file_id || msg.audio?.file_id
    if (!fileId) return

    const fileLink = await bot.getFileLink(fileId)
    const resp = await fetch(fileLink)
    const buffer = Buffer.from(await resp.arrayBuffer())

    const today = new Date()
    const clientDate = today.toISOString()
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    const { transcript, actions, natural_summary } = await processVoiceInput(buffer, clientDate, timezone)
    if (!transcript) { await bot.sendMessage(chatId, 'Could not transcribe your voice message.'); return }

    const { executeAction: exec } = require('./actions')
    const results = []
    for (const { action, params } of actions) {
      try { const result = exec(action, params); results.push({ action, params, natural_summary, success: true, result }) }
      catch (err) { results.push({ action, params, natural_summary, success: false, error: err.message }) }
    }

    await bot.sendMessage(chatId, `📝 "${transcript}"\n\n${formatResults(results)}`)
  } catch (err) {
    logger.error({ err }, 'Telegram voice processing failed')
    await bot.sendMessage(chatId, 'Failed to process voice message.')
  }
}

function startBot() {
  if (bot) return true
  const token = getToken()
  if (!token) { logger.info('Telegram bot not configured — no token set'); return false }

  try {
    bot = new TelegramBot(token, { polling: true })
    bot.on('message', (msg) => { if (msg.voice || msg.audio) handleVoice(msg); else if (msg.text) handleMessage(msg) })
    bot.on('polling_error', (err) => logger.error({ err: err.message }, 'Telegram bot polling error'))
    logger.info('Telegram bot started')
    return true
  } catch (err) {
    logger.error({ err }, 'Failed to start Telegram bot')
    bot = null
    return false
  }
}

function stopBot() {
  if (bot) { bot.stopPolling(); bot = null; logger.info('Telegram bot stopped') }
}

function restartBot() { stopBot(); return startBot() }

function isRunning() { return bot !== null }

module.exports = { startBot, stopBot, restartBot, isRunning }
