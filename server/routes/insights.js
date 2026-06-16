const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query } = require('../db/database')

const router = express.Router()

router.get('/', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const tasksByDay = query(`
      SELECT date(completed_at) as day, COUNT(*) as count
      FROM tasks WHERE status = 'done' AND completed_at >= ? GROUP BY day ORDER BY day
    `, [thirtyDaysAgo])
    const taskCountByDayQuery = query(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM tasks WHERE created_at >= ? GROUP BY day ORDER BY day
    `, [thirtyDaysAgo])

    const habitLogsByDay = query(`
      SELECT date, COUNT(*) as done_count
      FROM habit_logs WHERE date >= ? AND done = 1 GROUP BY date ORDER BY date
    `, [thirtyDaysAgo])
    const habitLogsTotal = query(`
      SELECT date, COUNT(*) as total
      FROM habit_logs WHERE date >= ? GROUP BY date ORDER BY date
    `, [thirtyDaysAgo])

    const prayerByDay = query(`
      SELECT date, SUM(done) as done_count, COUNT(*) as total
      FROM prayers WHERE date >= ? GROUP BY date ORDER BY date
    `, [sevenDaysAgo])

    const goals = query('SELECT id, title FROM goals WHERE active = 1 ORDER BY sort_order')

    res.json({
      tasks: { byDay: tasksByDay, created: taskCountByDayQuery },
      habits: { byDay: habitLogsByDay, totals: habitLogsTotal },
      prayers: { byDay: prayerByDay },
      goals,
    })
  } catch (err) { handleError(res, err) }
})

module.exports = router
