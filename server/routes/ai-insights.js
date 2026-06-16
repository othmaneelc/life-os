const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, get } = require('../db/database')
const { getAIConfig, aiCall } = require('../services/aiCall')
const { safeQuery, gatherFullContext, SYSTEM_PROMPT } = require('./ai-shared')

const router = express.Router()

router.post('/briefing', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.status(400).json({ error: 'No AI key set', needsKey: true })

    const context = gatherFullContext(req.body.view)

    let weather = {}
    try {
      const { default: fetch } = await import('node-fetch')
      const settings = query('SELECT * FROM settings')
      const lat = settings?.find(s => s.key === 'weather_lat')?.value || '31.7917'
      const lon = settings?.find(s => s.key === 'weather_lon')?.value || '-7.0926'
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=1`)
      if (weatherRes.ok) {
        const w = await weatherRes.json()
        if (w.daily) {
          const codes = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 61: 'Rain', 63: 'Moderate rain', 71: 'Snow', 80: 'Rain showers', 95: 'Thunderstorm' }
          weather = { temp_max: w.daily.temperature_2m_max[0], temp_min: w.daily.temperature_2m_min[0], conditions: codes[w.daily.weathercode[0]] || 'Unknown' }
        }
      }
    } catch { weather = { conditions: 'Weather unavailable' } }

    const weatherStr = weather.temp_max ? `Weather: ${weather.conditions}, ${weather.temp_min}°C - ${weather.temp_max}°C` : ''

    const briefing = await aiCall(config, [
      { role: 'system', content: `You are JARVIS. Generate a rich daily briefing with markdown. Structure:

**☀️ Good [time], [user]**
**🌤️ Weather** (one line)
**📋 Top Priorities** (2-3 bullet tasks)
**🔥 Habits** (streak status)
**🕌 Prayers** (today's progress)
**💡 Insight** (one cross-domain observation)

Keep under 150 words. Be motivational. Use emojis only as section headers.
\n\n${weatherStr}\n\nContext:\n${context}` },
      { role: 'user', content: 'Brief me.' },
    ], 1024, 0.5)

    res.json({ briefing: briefing || 'No briefing available.' })
  } catch (err) { handleError(res, err) }
})

router.post('/prioritize', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.status(400).json({ error: 'No AI key set. Add a free Groq key in Settings.' })

    const tasks = query("SELECT id, title, category, tag, due_date, priority, is_top_priority FROM tasks WHERE status != 'done' ORDER BY sort_order")
    if (!tasks.length) return res.json({ tasks: [] })

    const prompt = `Prioritize these tasks by urgency and importance. Return ONLY a JSON array of task IDs in priority order (most urgent first). No explanation, no markdown.
Tasks: ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, category: t.category, due_date: t.due_date, priority: t.priority, is_top_priority: t.is_top_priority })))}`

    const content = await aiCall(config, [{ role: 'user', content: prompt }], 512, 0.2)
    if (!content) return res.json({ tasks })

    try {
      const ids = JSON.parse(content.replace(/```json|```/g, '').trim())
      res.json({ tasks: ids || tasks })
    } catch {
      res.json({ tasks })
    }
  } catch (err) { handleError(res, err) }
})

router.post('/analyze-mood', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.status(400).json({ error: 'No AI key set' })

    const entries = query("SELECT date, mood, what_happened FROM journal_entries ORDER BY date DESC LIMIT 30")
    if (!entries.length) return res.json({ analysis: 'No journal entries to analyze.' })

    const prompt = `Analyze this journal data for mood trends, patterns, and insights. Return a short paragraph with specific observations.
${JSON.stringify(entries)}`

    const analysis = await aiCall(config, [{ role: 'user', content: prompt }], 512, 0.3)
    res.json({ analysis: analysis || 'Could not analyze.' })
  } catch (err) { handleError(res, err) }
})

router.post('/coach', async (req, res) => {
  try {
    const config = getAIConfig()
    if (!config) return res.status(400).json({ error: 'No AI key configured. Add a Groq API key in Settings.', needsKey: true })

    const { goalId } = req.body
    const goal = get('SELECT * FROM goals WHERE id = ? AND active = 1', [goalId])
    if (!goal) return res.status(404).json({ error: 'Goal not found' })

    const steps = query('SELECT * FROM goal_steps WHERE goal_id = ? ORDER BY sort_order', [goalId])
    const habitLinks = query('SELECT h.id, h.name, COUNT(CASE WHEN hl.done = 1 THEN 1 END) as streak FROM goal_habits gh JOIN habits h ON h.id = gh.habit_id LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.date >= date("now", "-7 days") WHERE gh.goal_id = ? GROUP BY h.id', [goalId])

    const done = steps.filter(s => s.done).length
    const progress = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0

    const prompt = `You are a goal-oriented life coach. Analyze this goal and provide actionable coaching.

Goal: ${goal.title}
Description: ${goal.description || 'N/A'}
Timeframe: ${goal.timeframe}
Progress: ${progress}% (${done}/${steps.length} steps done)

Steps:
${steps.map(s => `- ${s.done ? '[DONE]' : '[TODO]'} ${s.title}`).join('\n')}

Linked habits: ${habitLinks.map(h => `- ${h.name} (streak: ${h.streak}d)`).join('\n') || 'None'}

Provide a short coaching response (3-4 sentences) with:
1. Honest assessment of progress
2. Specific next-step recommendation
3. Encouragement`

    const reply = await aiCall(config, [{ role: 'user', content: prompt }], 1024, 0.6)
    res.json({ coaching: reply || 'Could not generate coaching.' })
  } catch (err) { handleError(res, err) }
})

module.exports = router
