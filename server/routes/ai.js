const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, run, get } = require('../db/database')
const { getAIConfig, aiCall } = require('../services/aiCall')
const logger = require('../services/logger')
const {
  safeQuery, gatherFullContext, SYSTEM_PROMPT,
  createConversation, addMessage, getConversationMessages,
  getContextSuggestions,
} = require('./ai-shared')

const router = express.Router()

router.post('/action', (req, res) => {
  try {
    const { executeAction } = require('../services/actions')
    const { action, params } = req.body
    if (!action || typeof action !== 'string') return res.status(400).json({ error: 'Invalid action' })
    const result = executeAction(action, params || {})
    return res.json({ success: true, action, ...result })
  } catch (err) { handleError(res, err) }
})

router.post('/suggestions', (req, res) => {
  try {
    const { view } = req.body
    const suggestions = getContextSuggestions(view)
    res.json({ suggestions })
  } catch (err) { handleError(res, err) }
})

router.post('/check-in', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.json({ greeting: "Hey! I'm here whenever you need me.", priorities: [] })

    const context = gatherFullContext(req.body.view || '/dashboard')
    const memories = safeQuery("SELECT content FROM ai_memories ORDER BY importance DESC LIMIT 10")

    const today = new Date().toISOString().split('T')[0]
    const tasks = safeQuery("SELECT title, priority, due_date FROM tasks WHERE status != 'done' AND due_date <= ? ORDER BY priority DESC LIMIT 5", [today])
    const habits = safeQuery("SELECT h.name, COALESCE(hl.done,0) as done_today FROM habits h LEFT JOIN habit_logs hl ON h.id=hl.habit_id AND hl.date=?", [today])
    const undoneHabits = habits.filter(h => !h.done_today)

    const prompt = `Generate a personalized check-in message for the user. Be warm and friend-like.

Current time context: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}, ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}

Key data:
- Tasks due today: ${tasks.map(t => t.title).join(', ') || 'None'}
- Habits not done yet: ${undoneHabits.map(h => h.name).join(', ') || 'All done!'}
- User memories: ${memories.map(m => m.content).join('; ') || 'No memories yet'}

Generate a short, warm check-in (2-3 sentences). Include:
1. A time-appropriate greeting (morning/afternoon/evening)
2. One key priority or observation
3. A caring question or encouragement

Do NOT use actions. Just conversational text.`

    const greeting = await aiCall(config, [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }], 256, 0.8)
    res.json({ greeting: greeting || `Hey! It's ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. How can I help?`, priorities: tasks })
  } catch (err) {
    res.json({ greeting: "Hey! I'm here whenever you need me.", priorities: [] })
  }
})

router.get('/conversations', (req, res) => {
  try {
    const result = query(`
      SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) as messageCount
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 50
    `)
    res.json({ conversations: result })
  } catch (err) { handleError(res, err) }
})

router.get('/conversations/:id', (req, res) => {
  try {
    const conv = get('SELECT * FROM conversations WHERE id=?', [req.params.id])
    if (!conv) return res.status(404).json({ error: 'Conversation not found' })
    const messages = query("SELECT id, role, content, action_results, created_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC", [req.params.id])
    res.json({ conversation: conv, messages })
  } catch (err) { handleError(res, err) }
})

router.delete('/conversations/:id', (req, res) => {
  try {
    run('DELETE FROM messages WHERE conversation_id=?', [req.params.id])
    run('DELETE FROM conversations WHERE id=?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

router.patch('/conversations/:id', (req, res) => {
  try {
    const { title } = req.body
    if (title) run("UPDATE conversations SET title=?, updated_at=datetime('now') WHERE id=?", [title, req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

router.post('/conversations', (req, res) => {
  try {
    const { title } = req.body
    const id = createConversation(title || 'New conversation')
    res.json({ conversationId: id })
  } catch (err) { handleError(res, err) }
})

router.get('/memories', (req, res) => {
  try {
    const { category, limit } = req.query
    let sql = 'SELECT * FROM ai_memories'
    const params = []
    if (category) { sql += ' WHERE category=?'; params.push(category) }
    sql += ' ORDER BY importance DESC, created_at DESC LIMIT ?'
    params.push(parseInt(limit) || 50)
    const memories = query(sql, params)
    res.json({ memories })
  } catch (err) { handleError(res, err) }
})

router.delete('/memories/:id', (req, res) => {
  try {
    run('DELETE FROM ai_memories WHERE id=?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
