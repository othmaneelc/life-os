const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query } = require('../db/database')
const { getAIConfig, aiCall } = require('../services/aiCall')
const logger = require('../services/logger')

const router = express.Router()

router.get('/current', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const energyRows = query('SELECT date, energy, completed FROM daily_reviews WHERE date >= ? AND date <= ? ORDER BY date', [weekAgo, today])
    const energyValues = energyRows.filter(r => r.energy)
    const avgEnergy = energyValues.length > 0 ? (energyValues.reduce((s, r) => s + r.energy, 0) / energyValues.length).toFixed(1) : '—'
    const energyTrend = energyValues.length >= 2 ? (energyValues[energyValues.length - 1].energy - energyValues[0].energy).toFixed(1) : 0

    const tasksDone = query("SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND completed_at >= ? AND completed_at <= ?", [weekAgo, today])
    const tasksCreated = query("SELECT COUNT(*) as count FROM tasks WHERE created_at >= ? AND created_at <= ?", [weekAgo, today])

    const habitLogs = query('SELECT h.name, hl.done FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id WHERE hl.date >= ? AND hl.date <= ?', [weekAgo, today])
    const totalHabits = habitLogs.length
    const doneHabits = habitLogs.filter(h => h.done).length
    const habitRate = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0

    const streakData = query(`SELECT h.name, COUNT(*) as streak FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id WHERE hl.done = 1 AND hl.date >= ? GROUP BY hl.habit_id ORDER BY streak DESC LIMIT 1`, [monthAgo])

    const prayersDone = query("SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ? AND done = 1", [weekAgo, today])
    const prayersTotal = query("SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ?", [weekAgo, today])
    const prayerRate = prayersTotal[0]?.count > 0 ? Math.round(((prayersDone[0]?.count || 0) / prayersTotal[0].count) * 100) : 0

    const finance = query("SELECT type, SUM(amount) as total FROM finance_transactions WHERE date >= ? AND date <= ? GROUP BY type", [weekAgo, today])
    const income = finance.find(f => f.type === 'income')?.total || 0
    const expense = finance.find(f => f.type === 'expense')?.total || 0

    const pomodoro = query("SELECT COUNT(*) as sessions, SUM(duration_min) as total_min FROM pomodoro_sessions WHERE date >= ? AND date <= ? AND completed = 1", [weekAgo, today])

    const journal = query("SELECT date, mood FROM journal_entries WHERE date >= ? AND date <= ? ORDER BY date", [weekAgo, today])
    const moods = journal.filter(j => j.mood)
    const avgMood = moods.length > 0 ? (moods.reduce((s, j) => s + j.mood, 0) / moods.length).toFixed(1) : '—'

    const score = calculateScore({ avgEnergy, habitRate, prayerRate, tasksDone: tasksDone[0]?.count || 0, tasksCreated: tasksCreated[0]?.count || 0, pomodoro: pomodoro[0]?.sessions || 0, avgMood })

    // AI summary
    let aiSummary = null
    try {
      const prompt = `You are a weekly review assistant. Summarize the user's week based on this data:\n${JSON.stringify({ avgEnergy, energyTrend, habitRate, prayerRate, income, expense, tasksDone: tasksDone[0]?.count, pomodoro: pomodoro[0]?.sessions, focusMinutes: pomodoro[0]?.total_min, avgMood, streak: streakData[0] || null, score }, null, 2)}\n\nWrite 2-3 concise sentences about their week, highlighting trends and areas for improvement. Use a supportive tone.`
      const config = getAIConfig()
      aiSummary = await aiCall(config, [{ role: 'system', content: prompt }])
    } catch (err) {
      logger.error({ err }, 'AI weekly summary failed')
    }

    res.json({
      period: { start: weekAgo, end: today },
      score,
      energy: { avg: avgEnergy, trend: energyTrend, days: energyRows },
      tasks: { done: tasksDone[0]?.count || 0, created: tasksCreated[0]?.count || 0 },
      habits: { rate: habitRate, done: doneHabits, total: totalHabits, bestStreak: streakData[0] || null },
      prayers: { rate: prayerRate, done: prayersDone[0]?.count || 0, total: prayersTotal[0]?.count || 0 },
      finance: { income, expense, net: income - expense },
      pomodoro: { sessions: pomodoro[0]?.sessions || 0, minutes: pomodoro[0]?.total_min || 0 },
      mood: { avg: avgMood, entries: journal },
      aiSummary,
    })
  } catch (err) { handleError(res, err) }
})

function calculateScore({ avgEnergy, habitRate, prayerRate, tasksDone, tasksCreated, pomodoro, avgMood }) {
  const energyScore = avgEnergy !== '—' ? Math.min((parseFloat(avgEnergy) / 5) * 25, 25) : 0
  const habitScore = Math.min((habitRate / 100) * 25, 25)
  const prayerScore = Math.min((prayerRate / 100) * 20, 20)
  const taskScore = tasksCreated > 0 ? Math.min((tasksDone / Math.max(tasksCreated, 1)) * 15, 15) : 0
  const pomoScore = Math.min((pomodoro / 20) * 10, 10)
  const moodScore = avgMood !== '—' ? Math.min((parseFloat(avgMood) / 5) * 5, 5) : 0
  return Math.round(energyScore + habitScore + prayerScore + taskScore + pomoScore + moodScore)
}

module.exports = router
