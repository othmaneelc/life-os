const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query } = require('../db/database')
const { getAIConfig, aiCall } = require('../services/aiCall')
const logger = require('../services/logger')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    // Best & worst habit streaks
    const habitStreaks = query(`
      SELECT h.name, h.id, COUNT(*) as streak
      FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id
      WHERE hl.done = 1 AND hl.date >= ?
      GROUP BY hl.habit_id ORDER BY streak DESC LIMIT 5
    `, [thirtyDaysAgo])

    // Most skipped habits
    const skippedHabits = query(`
      SELECT h.name, COUNT(*) as skipped
      FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id
      WHERE hl.done = 0 AND hl.date >= ?
      GROUP BY hl.habit_id ORDER BY skipped DESC LIMIT 5
    `, [thirtyDaysAgo])

    // Prayer consistency by prayer name (rolling 7 days)
    const prayerConsistency = query(`
      SELECT prayer_name,
        SUM(done) as done_count,
        COUNT(*) as total,
        ROUND(CAST(SUM(done) AS REAL) / COUNT(*) * 100) as rate
      FROM prayers WHERE date >= ? AND date <= ?
      GROUP BY prayer_name ORDER BY rate DESC
    `, [sevenDaysAgo, today])

    // Energy correlation: days with vs without Fajr prayer
    const energyWithFajr = query(`
      SELECT AVG(dr.energy) as avg_energy, COUNT(*) as days
      FROM daily_reviews dr
      JOIN prayers p ON p.date = dr.date AND p.prayer_name = 'fajr' AND p.done = 1
      WHERE dr.date >= ? AND dr.energy IS NOT NULL
    `, [thirtyDaysAgo])
    const energyWithoutFajr = query(`
      SELECT AVG(dr.energy) as avg_energy, COUNT(*) as days
      FROM daily_reviews dr
      LEFT JOIN prayers p ON p.date = dr.date AND p.prayer_name = 'fajr' AND p.done = 1
      WHERE dr.date >= ? AND dr.energy IS NOT NULL AND p.id IS NULL
    `, [thirtyDaysAgo])

    // Task completion rate by priority
    const tasksByPriority = query(`
      SELECT priority,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        COUNT(*) as total,
        ROUND(CAST(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100) as rate
      FROM tasks WHERE created_at >= ?
      GROUP BY priority ORDER BY rate DESC
    `, [thirtyDaysAgo])

    // Best performing day of week (by energy)
    const dayOfWeekEnergy = query(`
      SELECT CAST(strftime('%w', date) AS INTEGER) as day_num,
        CASE CAST(strftime('%w', date) AS INTEGER)
          WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        AVG(energy) as avg_energy,
        COUNT(*) as days
      FROM daily_reviews WHERE date >= ? AND energy IS NOT NULL
      GROUP BY day_num ORDER BY avg_energy DESC
    `, [thirtyDaysAgo])

    // Task completion by day of week
    const tasksByDayOfWeek = query(`
      SELECT CAST(strftime('%w', date(completed_at)) AS INTEGER) as day_num,
        COUNT(*) as tasks_done
      FROM tasks WHERE status = 'done' AND completed_at >= ?
      GROUP BY day_num ORDER BY tasks_done DESC
    `, [thirtyDaysAgo])

    // AI insight
    let aiInsight = null
    try {
      const prompt = `Analyze these behavior patterns and write 2-3 concise insights:\n${JSON.stringify({
        bestHabits: habitStreaks.slice(0, 3),
        skippedHabits: skippedHabits.slice(0, 3),
        prayerConsistency,
        energyWithFajr: energyWithFajr[0],
        energyWithoutFajr: energyWithoutFajr[0],
        bestDay: dayOfWeekEnergy[0],
        tasksByPriority,
      }, null, 2)}\n\nHighlight correlations and actionable suggestions. Keep it supportive and specific.`
      const config = getAIConfig()
      aiInsight = await aiCall(config, [{ role: 'system', content: prompt }])
    } catch (err) {
      logger.error({ err }, 'Pattern AI insight failed')
    }

    res.json({
      habits: { bestStreaks: habitStreaks, mostSkipped: skippedHabits },
      prayers: { consistency: prayerConsistency },
      correlations: {
        energyWithFajr: energyWithFajr[0] || { avg_energy: null, days: 0 },
        energyWithoutFajr: energyWithoutFajr[0] || { avg_energy: null, days: 0 },
        bestDayOfWeek: dayOfWeekEnergy[0] || null,
        bestTaskDay: tasksByDayOfWeek[0] || null,
      },
      tasks: { byPriority: tasksByPriority },
      aiInsight,
    })
  } catch (err) { handleError(res, err) }
})

module.exports = router
