const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, run, get, getDatabase } = require('../db/database')

const router = express.Router()

// Migration: create tables if not exist
const migrationTables = [
  `CREATE TABLE IF NOT EXISTS user_xp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS xp_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    action TEXT NOT NULL,
    xp_amount INTEGER NOT NULL,
    source_id TEXT,
    source_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    achievement_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '\uD83C\uDFC6',
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
]
for (const sql of migrationTables) {
  try { run(sql) } catch (e) { /* table may already exist */ }
}

// Ensure default user_xp row exists
try {
  if (!get('SELECT id FROM user_xp WHERE user_id = ?', [1])) {
    run('INSERT INTO user_xp (user_id, total_xp, level) VALUES (?, 0, 1)', [1])
  }
} catch (e) {}

const XP_MAP = {
  task_completed: 10,
  habit_logged: 5,
  journal_written: 15,
  prayer_logged: 3,
  review_written: 20,
  transaction_added: 5,
  book_finished: 25,
  pomodoro_completed: 2,
  goal_step_completed: 8,
  streak_milestone: 50,
}

function recalculateLevel(totalXp) {
  let level = 1
  let cumulative = 0
  while (true) {
    const needed = level * 100
    if (cumulative + needed > totalXp) break
    cumulative += needed
    level++
  }
  return level
}

function xpForLevel(level) {
  return level * 100
}

function xpProgress(totalXp, level) {
  let cumulative = 0
  for (let i = 1; i < level; i++) cumulative += i * 100
  return totalXp - cumulative
}

const SAFE_TABLES = {
  habit_logs: { tableName: 'habit_logs', dateCol: 'date', doneCol: 'done' },
  prayers: { tableName: 'prayers', dateCol: 'date', doneCol: 'done' },
}

function getLongestStreak(tableKey) {
  const safe = SAFE_TABLES[tableKey]
  if (!safe) throw new Error(`Invalid table: ${tableKey}`)
  const { tableName, dateCol, doneCol } = safe
  const rows = query(`SELECT DISTINCT ${dateCol} FROM ${tableName} WHERE ${doneCol} = 1 ORDER BY ${dateCol} DESC`)
  if (rows.length === 0) return 0
  let current = 1
  let longest = 1
  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1][dateCol])
    const curr = new Date(rows[i][dateCol])
    const diff = (prev - curr) / (1000 * 60 * 60 * 24)
    if (diff === 1) { current++ } else { current = 1 }
    longest = Math.max(longest, current)
  }
  return longest
}

function checkAchievements(userId, totalXp, newAchievements) {
  const earned = query('SELECT achievement_key FROM achievements WHERE user_id = ?', [userId]).map(r => r.achievement_key)
  const add = (key, title, description) => {
    if (earned.includes(key)) return
    try {
      run('INSERT INTO achievements (user_id, achievement_key, title, description) VALUES (?, ?, ?, ?)',
        [userId, key, title, description])
      newAchievements.push({ achievement_key: key, title, description })
    } catch (e) {}
  }

  const actionCounts = {}
  for (const a of query('SELECT action, COUNT(*) as cnt FROM xp_events WHERE user_id = ? GROUP BY action', [userId])) {
    actionCounts[a.action] = a.cnt
  }

  const taskCount = get('SELECT COUNT(*) as cnt FROM tasks WHERE status = ?', ['done']).cnt
  const level = recalculateLevel(totalXp)

  if (taskCount >= 1) add('first_task', 'First Task', 'Complete your first task')
  if ((actionCounts['habit_logged'] || 0) >= 1) add('first_habit_log', 'First Habit Log', 'Log your first habit')
  if ((actionCounts['journal_written'] || 0) >= 1) add('first_journal', 'First Journal', 'Write your first journal entry')
  if (level >= 5) add('level_5', 'Level 5', 'Reach level 5')
  if (level >= 10) add('level_10', 'Level 10', 'Reach level 10')
  if (level >= 25) add('level_25', 'Level 25', 'Reach level 25')
  if (taskCount >= 100) add('hundred_tasks', 'Century', 'Complete 100 tasks')
  if (totalXp >= 1000) add('thousand_xp', 'Thousand XP', 'Earn 1000 total XP')
  if (totalXp >= 10000) add('ten_thousand_xp', 'Ten Thousand XP', 'Earn 10000 total XP')

  const streak = getLongestStreak('habit_logs')
  if (streak >= 7) add('streak_7', 'Weekly Warrior', 'Maintain a 7 day streak')
  if (streak >= 30) add('streak_30', 'Monthly Master', 'Maintain a 30 day streak')

  const prayerStreak = getLongestStreak('prayers')
  if (prayerStreak >= 30) add('prayer_30', '30 Days of Prayer', 'Log prayers for 30 consecutive days')
}

router.post('/award', (req, res) => {
  try {
    const userId = 1
    const { action, source_id, source_type } = req.body
    const xpAmount = XP_MAP[action]
    if (!xpAmount) return res.status(400).json({ success: false, error: 'Unknown action: ' + action })

    const db = getDatabase()
    const tx = db.transaction(() => {
      run('INSERT INTO xp_events (user_id, action, xp_amount, source_id, source_type) VALUES (?, ?, ?, ?, ?)',
        [userId, action, xpAmount, source_id || null, source_type || null])

      const row = get('SELECT total_xp, level FROM user_xp WHERE user_id = ?', [userId])
      const newTotalXp = row.total_xp + xpAmount
      const newLevel = recalculateLevel(newTotalXp)
      run('UPDATE user_xp SET total_xp = ?, level = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [newTotalXp, newLevel, userId])
      return { newTotalXp, newLevel }
    })
    const { newTotalXp, newLevel } = tx()
    const oldLevel = recalculateLevel(newTotalXp - xpAmount)

    const leveledUp = newLevel > oldLevel
    const newAchievements = []
    checkAchievements(userId, newTotalXp, newAchievements)

    res.json({ success: true, xp_awarded: xpAmount, total_xp: newTotalXp, level: newLevel, leveled_up: leveledUp, new_achievements: newAchievements })
  } catch (err) { handleError(res, err) }
})

router.get('/stats', (req, res) => {
  try {
    const userId = 1
    const row = get('SELECT total_xp, level FROM user_xp WHERE user_id = ?', [userId]) || { total_xp: 0, level: 1 }
    const achievements = query('SELECT * FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC', [userId])
    res.json({ total_xp: row.total_xp, level: row.level, xp_for_next_level: xpForLevel(row.level), xp_progress: xpProgress(row.total_xp, row.level), achievements })
  } catch (err) { handleError(res, err) }
})

router.get('/leaderboard', (req, res) => {
  try {
    res.json(query('SELECT user_id, total_xp, level FROM user_xp ORDER BY total_xp DESC'))
  } catch (err) { handleError(res, err) }
})

module.exports = router
