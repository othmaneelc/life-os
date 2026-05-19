const express = require('express')
const { query, run, get } = require('../db/database')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

const conversationHistory = {}

function getAIConfig() {
  const settings = query('SELECT * FROM settings')
  const groqKey = settings?.find(s => s.key === 'groq_key')?.value
  const geminiKey = settings?.find(s => s.key === 'gemini_key')?.value
  const openaiKey = settings?.find(s => s.key === 'openai_key')?.value

  if (groqKey) return { provider: 'groq', key: groqKey, model: 'llama-3.3-70b-versatile', url: 'https://api.groq.com/openai/v1/chat/completions' }
  if (geminiKey) return { provider: 'gemini', key: geminiKey, model: 'gemini-2.0-flash', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' }
  if (openaiKey) return { provider: 'openai', key: openaiKey, model: 'gpt-4o-mini', url: 'https://api.openai.com/v1/chat/completions' }
  return null
}

async function aiCall(config, messages, maxTokens = 800, temperature = 0.5) {
  const { default: fetch } = await import('node-fetch')
  const resp = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
    body: JSON.stringify({ model: config.model, messages, temperature, max_tokens: maxTokens }),
  })
  const data = await resp.json()
  return data.choices?.[0]?.message?.content
}

const DAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function gatherFullContext(view) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const tasks = query("SELECT title, status, priority, category, due_date, is_top_priority FROM tasks WHERE status != 'done' ORDER BY sort_order LIMIT 15")
  const todayTasks = tasks.filter(t => t.due_date === today)
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today)

  const habits = query("SELECT h.name, h.category, COUNT(CASE WHEN hl.done = 1 THEN 1 END) as done_count, COUNT(hl.id) as total_count FROM habits h LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date >= date('now', '-7 days') GROUP BY h.id")
  const todayHabits = query("SELECT h.name, hl.done FROM habits h LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date = ? ORDER BY h.sort_order", [today])

  const journal = query("SELECT date, mood, what_happened, gratitude FROM journal_entries ORDER BY date DESC LIMIT 7")
  const avgMood = journal.filter(j => j.mood).reduce((s, j) => s + j.mood, 0) / (journal.filter(j => j.mood).length || 1)

  const prayers = query("SELECT prayer_name, done, on_time FROM prayers WHERE date = ? ORDER BY CASE prayer_name WHEN 'fajr' THEN 1 WHEN 'dhuhr' THEN 2 WHEN 'asr' THEN 3 WHEN 'maghrib' THEN 4 WHEN 'isha' THEN 5 END", [today])
  const prayerTimes = query("SELECT * FROM prayer_times_cache WHERE date = ?", [today])

  const schedule = query("SELECT title, start_time, end_time, block_type, color FROM schedule_blocks WHERE day_of_week = 'all' OR day_of_week = ? ORDER BY start_time", [DAYS_SHORT[now.getDay()].toLowerCase()])

  const finance = query("SELECT type, SUM(amount) as total FROM finance_transactions WHERE date LIKE ? GROUP BY type", [`${today.slice(0, 7)}%`])
  const monthIncome = finance.find(f => f.type === 'income')?.total || 0
  const monthExpense = finance.find(f => f.type === 'expense')?.total || 0

  const goals = query("SELECT id, title, timeframe, active FROM goals WHERE active = 1 LIMIT 5")
  const goalProgress = goals.map(g => {
    const steps = query("SELECT COUNT(*) as total, SUM(done) as done FROM goal_steps WHERE goal_id = ?", [g.id])
    return { ...g, progress: steps[0]?.total > 0 ? Math.round((steps[0].done / steps[0].total) * 100) : 0 }
  })

  const pomodoro = query("SELECT COUNT(*) as sessions, SUM(duration_min) as total_min FROM pomodoro_sessions WHERE date = ?", [today])

  const books = query("SELECT title, status, current_page, total_pages FROM books WHERE status = 'reading' LIMIT 3")

  const context = {
    greeting,
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    date: today,
    dayOfWeek: DAYS_FULL[now.getDay()],
    tasks: { total: tasks.length, today: todayTasks, overdue: overdueTasks, topPriority: tasks.filter(t => t.is_top_priority) },
    habits: { summary: habits, today: todayHabits },
    journal: { recent: journal, avgMood: avgMood.toFixed(1) },
    prayers: { today, done: prayers.filter(p => p.done).length, total: prayers.length, times: prayerTimes[0] },
    schedule: schedule.slice(0, 10),
    finance: { monthIncome, monthExpense, net: monthIncome - monthExpense },
    goals: goalProgress,
    pomodoro: { sessions: pomodoro[0]?.sessions || 0, minutes: pomodoro[0]?.total_min || 0 },
    reading: books,
    view,
  }

  return JSON.stringify(context, null, 2)
}

const SYSTEM_PROMPT = `You are JARVIS, a highly intelligent personal assistant for Life OS. You have access to the user's complete life data.

PERSONALITY:
- Concise, direct, and helpful. No fluff.
- Use data from the context to give specific, actionable insights.
- When asked about trends, correlate data across domains (e.g. "Your mood drops on days you miss Fajr").
- If data is missing, say so clearly.
- Use bullet points and short paragraphs.
- Reference specific numbers from the data.

CAPABILITIES:
- Answer questions about tasks, habits, prayers, journal, schedule, finance, goals, reading
- Suggest optimizations based on patterns
- Provide daily briefings when asked
- Help with planning and prioritization
- Give motivational but realistic feedback

RULES:
- NEVER make up data. Only use what's provided in context.
- If the user asks you to do something (create a task, etc.), respond with a command like: [ACTION:create_task:title=Buy groceries|date=2025-01-15|priority=high]
- Supported actions: create_task, delete_task, toggle_habit, add_journal_entry
- Keep responses under 200 words unless the user asks for detail.`

router.post('/chat', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.json({ error: 'No AI key set. Add a free Groq key (groq.com) or Gemini key in Settings.', needsKey: true, hint: 'Groq is free — sign up at groq.com and paste your API key in Settings.' })

    const { message, view, history } = req.body
    if (!message) return res.status(400).json({ error: 'Message required' })

    const context = gatherFullContext(view)
    const sessionId = req.body.sessionId || uuidv4()

    if (!conversationHistory[sessionId]) conversationHistory[sessionId] = []
    conversationHistory[sessionId].push({ role: 'user', content: message })

    const messages = [
      { role: 'system', content: `Current context (user's live data):\n${context}\n\n${SYSTEM_PROMPT}` },
      ...conversationHistory[sessionId].slice(-10),
    ]

    const reply = await aiCall(config, messages, 800, 0.5)

    if (!reply) {
      conversationHistory[sessionId].pop()
      return res.json({ error: 'AI response empty. Check your API key.' })
    }

    conversationHistory[sessionId].push({ role: 'assistant', content: reply })

    const suggestions = generateSuggestions(message, view, context)

    res.json({ reply, sessionId, suggestions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/briefing', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.json({ error: 'No AI key set', needsKey: true })

    const context = gatherFullContext(req.body.view)

    const briefing = await aiCall(config, [
      { role: 'system', content: `You are JARVIS. Generate a concise daily briefing from this data. Include: 1) Good morning/afternoon/evening greeting, 2) Today's schedule highlights, 3) Task priorities, 4) Habit status, 5) Prayer tracking, 6) One key insight. Use emojis sparingly. Keep it under 150 words.\n\nContext:\n${context}` },
      { role: 'user', content: 'Give me my daily briefing.' },
    ], 400, 0.4)

    res.json({ briefing: briefing || 'No briefing available.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/suggestions', (req, res) => {
  try {
    const { view } = req.body
    const suggestions = getContextSuggestions(view)
    res.json({ suggestions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/prioritize', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.json({ error: 'No AI key set. Add a free Groq key in Settings.' })

    const tasks = query("SELECT id, title, category, tag, due_date, priority, is_top_priority FROM tasks WHERE status != 'done' ORDER BY sort_order")
    if (!tasks.length) return res.json({ tasks: [] })

    const prompt = `Prioritize these tasks by urgency and importance. Return ONLY a JSON array of task IDs in priority order (most urgent first). No explanation, no markdown.
Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, category: t.category, due_date: t.due_date, priority: t.priority, is_top_priority: t.is_top_priority })))}`

    const content = await aiCall(config, [{ role: 'user', content: prompt }], 500, 0.2)
    if (!content) return res.json({ tasks })

    try {
      const ids = JSON.parse(content.replace(/```json|```/g, '').trim())
      res.json({ tasks: ids || tasks })
    } catch {
      res.json({ tasks })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/analyze-mood', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.json({ error: 'No AI key set' })

    const entries = query("SELECT date, mood, what_happened FROM journal_entries ORDER BY date DESC LIMIT 30")
    if (!entries.length) return res.json({ analysis: 'No journal entries to analyze.' })

    const prompt = `Analyze this journal data for mood trends, patterns, and insights. Return a short paragraph with specific observations.
${JSON.stringify(entries)}`

    const analysis = await aiCall(config, [{ role: 'user', content: prompt }], 500, 0.5)
    res.json({ analysis: analysis || 'Could not analyze.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/action', (req, res) => {
  try {
    const { action, params } = req.body

    switch (action) {
      case 'create_task': {
        const id = uuidv4()
        run("INSERT INTO tasks (id, title, category, priority, status, sort_order) VALUES (?, ?, ?, ?, 'todo', COALESCE((SELECT MAX(sort_order) FROM tasks), 0) + 1)",
          [id, params.title || 'New Task', params.category || 'personal', params.priority || 'medium'])
        const task = get('SELECT * FROM tasks WHERE id = ?', [id])
        return res.json({ success: true, action: 'create_task', data: task })
      }
      case 'delete_task': {
        run('DELETE FROM tasks WHERE id = ?', [params.id])
        return res.json({ success: true, action: 'delete_task' })
      }
      case 'toggle_habit': {
        const today = new Date().toISOString().split('T')[0]
        const existing = get('SELECT id FROM habit_logs WHERE habit_id = ? AND date = ?', [params.habit_id, today])
        if (existing) {
          run('UPDATE habit_logs SET done = NOT done WHERE id = ?', [existing.id])
        } else {
          const id = uuidv4()
          run('INSERT INTO habit_logs (id, habit_id, date, done) VALUES (?, ?, ?, 1)', [id, params.habit_id, today])
        }
        return res.json({ success: true, action: 'toggle_habit' })
      }
      case 'add_journal_entry': {
        const id = uuidv4()
        const today = new Date().toISOString().split('T')[0]
        run("INSERT OR REPLACE INTO journal_entries (id, date, what_happened) VALUES (?, ?, ?)", [id, today, params.content || ''])
        return res.json({ success: true, action: 'add_journal_entry' })
      }
      default:
        return res.status(400).json({ error: 'Unknown action' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

function getContextSuggestions(view) {
  const today = new Date().toISOString().split('T')[0]
  const tasks = query("SELECT COUNT(*) as count FROM tasks WHERE status != 'done'")
  const habits = query("SELECT COUNT(*) as count FROM habits")
  const journal = query("SELECT COUNT(*) as count FROM journal_entries WHERE date = ?", [today])

  const base = [
    "What's my schedule today?",
    "Give me my daily briefing",
    "What tasks should I focus on?",
  ]

  const viewSpecific = {
    '/dashboard': ["How am I doing overall?", "What needs my attention right now?"],
    '/schedule': ["What's my next block?", "Any gaps in my schedule today?", "How productive is my schedule?"],
    '/tasks': ["Prioritize my tasks", "What's overdue?", "Suggest what to work on next"],
    '/journal': ["How's my mood trending?", "Summarize this week's journal", "What patterns do you see?"],
    '/prayers': ["How's my prayer consistency?", "Which prayers am I missing most?"],
    '/habits': ["What's my best streak?", "Which habits need attention?", "Suggest a new habit"],
    '/finance': ["How's my budget this month?", "Where am I overspending?", "Monthly income vs expenses"],
    '/goals': ["How am I progressing on goals?", "Which goal is falling behind?"],
    '/reading': ["What books am I reading?", "Suggest reading time in my schedule"],
    '/agency': ["How's my agency performing?", "Any client issues to address?"],
  }

  return [...base, ...(viewSpecific[view] || ["How can I be more productive today?"])]
}

function generateSuggestions(message, view, contextStr) {
  try {
    const ctx = JSON.parse(contextStr)
    const suggestions = []

    if (ctx.tasks?.overdue?.length > 0) suggestions.push(`You have ${ctx.tasks.overdue.length} overdue tasks`)
    if (ctx.prayers?.done < ctx.prayers?.total) suggestions.push(`${ctx.prayers.total - ctx.prayers.done} prayers remaining today`)
    if (ctx.habits?.today) {
      const undone = ctx.habits.today.filter(h => !h.done)
      if (undone.length > 0) suggestions.push(`${undone.length} habits not done yet`)
    }
    if (ctx.finance?.net < 0) suggestions.push('Expenses exceed income this month')
    if (ctx.pomodoro?.sessions === 0 && new Date().getHours() > 10) suggestions.push('No Pomodoro sessions today')

    return suggestions.slice(0, 3)
  } catch {
    return []
  }
}

module.exports = router
