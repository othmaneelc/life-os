const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { getAIConfig, aiCall, streamAiCall } = require('../services/aiCall')
const logger = require('../services/logger')
const {
  safeQuery, gatherFullContext, SYSTEM_PROMPT,
  createConversation, addMessage, getConversationMessages, estimateTokens,
  extractAndStoreMemories, generateSuggestions,
} = require('./ai-shared')

const router = express.Router()

router.post('/chat', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.status(400).json({ error: 'No AI key set. Add a free Groq key (groq.com) or Gemini key in Settings.', needsKey: true, hint: 'Groq is free — sign up at groq.com and paste your API key in Settings.' })

    const { message, view, conversationId } = req.body
    if (!message) return res.status(400).json({ error: 'Message required' })

    const context = gatherFullContext(view)
    let convId = conversationId
    if (!convId) {
      const title = message.length > 60 ? message.slice(0, 57) + '...' : message
      convId = createConversation(title)
    }

    addMessage(convId, 'user', message)

    const history = getConversationMessages(convId)
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Current context (user's live data):\n${context}` },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ]

    let estimatedTokens = estimateTokens(messages)
    while (estimatedTokens > 28000 && messages.length > 3) {
      messages.splice(2, 1)
      estimatedTokens = estimateTokens(messages)
    }

    const reply = await aiCall(config, messages, 2048, 0.7)

    if (!reply) {
      return res.status(502).json({ error: 'AI response empty. Check your API key.' })
    }

    addMessage(convId, 'assistant', reply)

    const suggestions = generateSuggestions(message, view, context, convId)

    const { get } = require('../db/database')
    const conv = get('SELECT title FROM conversations WHERE id=?', [convId])
    if (conv && !conv.title) {
      const { run } = require('../db/database')
      run("UPDATE conversations SET title=? WHERE id=?", [reply.length > 60 ? reply.slice(0, 57) + '...' : reply, convId])
    }

    res.json({ reply, conversationId: convId, suggestions })

    const allMessages = [...history, { role: 'user', content: message }, { role: 'assistant', content: reply }]
    extractAndStoreMemories(allMessages, convId).catch(e => logger.error({ err: e }, 'Memory extraction failed'))
  } catch (err) {
    handleError(res, err)
  }
})

router.post('/chat/stream', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.status(400).json({ error: 'No AI key set. Add a free Groq key (groq.com) or Gemini key in Settings.', needsKey: true })

    const { message, view, conversationId } = req.body
    if (!message) return res.status(400).json({ error: 'Message required' })

    const context = gatherFullContext(view)
    let convId = conversationId
    if (!convId) {
      const title = message.length > 60 ? message.slice(0, 57) + '...' : message
      convId = createConversation(title)
    }

    addMessage(convId, 'user', message)

    const history = getConversationMessages(convId)
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Current context (user's live data):\n${context}` },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ]

    let estimatedTokens = estimateTokens(messages)
    while (estimatedTokens > 28000 && messages.length > 3) {
      messages.splice(2, 1)
      estimatedTokens = estimateTokens(messages)
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`)

    let fullReply = ''
    let streamFailed = false

    try {
      for await (const token of streamAiCall(config, messages, 2048, 0.7)) {
        fullReply += token
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`)
      }
    } catch (streamErr) {
      streamFailed = true
      res.write(`data: ${JSON.stringify({ type: 'error', message: streamErr.message })}\n\n`)
      return res.end()
    }

    if (!streamFailed && fullReply) {
      addMessage(convId, 'assistant', fullReply)

      const { get, run } = require('../db/database')
      const conv = get('SELECT title FROM conversations WHERE id=?', [convId])
      if (conv && !conv.title) {
        run("UPDATE conversations SET title=? WHERE id=?", [fullReply.length > 60 ? fullReply.slice(0, 57) + '...' : fullReply, convId])
      }
    }

    const suggestions = generateSuggestions(message, view, context, convId)
    res.write(`data: ${JSON.stringify({ type: 'done', reply: fullReply, conversationId: convId, suggestions })}\n\n`)
    res.end()

    if (fullReply) {
      const allMessages = [...history, { role: 'user', content: message }, { role: 'assistant', content: fullReply }]
      extractAndStoreMemories(allMessages, convId).catch(e => logger.error({ err: e }, 'Memory extraction failed'))
    }

    req.on('close', () => {
      if (!fullReply && !streamFailed) {
        addMessage(convId, 'assistant', '[Interrupted]')
      }
    })
  } catch (err) {
    const msg = err.message?.includes('429') ? 'AI is rate-limited. Wait a moment and try again.' : err.message
    res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`)
    res.end()
  }
})

module.exports = router
