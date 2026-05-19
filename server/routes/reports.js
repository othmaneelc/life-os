const express = require('express')
const { query } = require('../db/database')

const router = express.Router()

router.get('/:period', (req, res) => {
  try {
    const { period } = req.params
    const { start, end } = req.query
    if (!start || !end) return res.status(400).json({ error: 'start and end query params required' })

    // Tasks
    const totalTasks = query('SELECT COUNT(*) as count FROM tasks WHERE created_at >= ? AND created_at <= ?', [start, end])
    const doneTasks = query("SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND (completed_at >= ? AND completed_at <= ? OR updated_at >= ? AND updated_at <= ?)", [start, end, start, end])
    const tasksByCategory = query("SELECT category, COUNT(*) as count FROM tasks WHERE created_at >= ? AND created_at <= ? GROUP BY category", [start, end])

    // Habits
    const habitLogs = query('SELECT COUNT(*) as count FROM habit_logs WHERE date >= ? AND date <= ? AND done = 1', [start, end])
    const totalHabitLogs = query('SELECT COUNT(*) as count FROM habit_logs WHERE date >= ? AND date <= ?', [start, end])

    // Prayers
    const prayersDone = query('SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ? AND done = 1', [start, end])
    const prayersTotal = query('SELECT COUNT(*) as count FROM prayers WHERE date >= ? AND date <= ?', [start, end])

    // Revenue
    const startMonth = parseInt(start.split('-')[1]) || 1
    const endYear = new Date(end).getFullYear()
    const startYear = new Date(start).getFullYear()
    const revenue = query('SELECT SUM(revenue_mad) as total_revenue, SUM(expenses_mad) as total_expenses FROM revenue WHERE (year = ? AND month >= ?) OR (year = ? AND month <= ?)', [startYear, startMonth, endYear, parseInt(end.split('-')[1]) || 12])

    // Pomodoro
    const pomodoroStats = query('SELECT COUNT(*) as count, SUM(duration_min) as total_min FROM pomodoro_sessions WHERE date >= ? AND date <= ? AND completed = 1', [start, end])

    // Reviews
    const reviews = query('SELECT AVG(energy) as avg_energy, COUNT(*) as total, SUM(completed) as completed_days FROM daily_reviews WHERE date >= ? AND date <= ?', [start, end])

    // Prayer heatmap summary
    const prayerByDay = query('SELECT prayer_name, SUM(done) as done_count FROM prayers WHERE date >= ? AND date <= ? GROUP BY prayer_name', [start, end])

    // Tasks done by day for chart
    const tasksByDay = query("SELECT date(completed_at) as day, COUNT(*) as count FROM tasks WHERE status = 'done' AND completed_at >= ? AND completed_at <= ? GROUP BY day ORDER BY day", [start, end])

    res.json({
      period,
      tasks: { total: totalTasks[0]?.count || 0, done: doneTasks[0]?.count || 0, byCategory: tasksByCategory, byDay: tasksByDay },
      habits: { done: habitLogs[0]?.count || 0, total: totalHabitLogs[0]?.count || 0, rate: totalHabitLogs[0]?.count > 0 ? Math.round(((habitLogs[0]?.count || 0) / totalHabitLogs[0].count) * 100) : 0 },
      prayers: { done: prayersDone[0]?.count || 0, total: prayersTotal[0]?.count || 0, byPrayer: prayerByDay, rate: prayersTotal[0]?.count > 0 ? Math.round(((prayersDone[0]?.count || 0) / prayersTotal[0].count) * 100) : 0 },
      revenue: { total: revenue[0]?.total_revenue || 0, expenses: revenue[0]?.total_expenses || 0 },
      pomodoro: { sessions: pomodoroStats[0]?.count || 0, totalMinutes: pomodoroStats[0]?.total_min || 0 },
      reviews: { avgEnergy: reviews[0]?.avg_energy ? parseFloat(reviews[0].avg_energy.toFixed(1)) : 0, total: reviews[0]?.total || 0, completedDays: reviews[0]?.completed_days || 0 },
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
