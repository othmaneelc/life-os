const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, run } = require('../db/database')

const router = express.Router()

const EXPECTED_TABLES = {
  tasks: ['id', 'title', 'category', 'tag', 'priority', 'status', 'is_top_priority', 'due_date', 'notes', 'google_task_id', 'created_at', 'updated_at', 'completed_at', 'sort_order'],
  journal_entries: ['id', 'date', 'mood', 'what_happened', 'gratitude', 'muhasaba', 'tomorrow_intention', 'tags', 'created_at', 'updated_at', 'prompts_answered'],
  prayers: ['id', 'date', 'prayer_name', 'scheduled_time', 'done', 'on_time'],
  habits: ['id', 'name', 'category', 'frequency', 'active', 'sort_order', 'created_at'],
  habit_logs: ['id', 'habit_id', 'date', 'done', 'note', 'logged_at'],
  goals: ['id', 'title', 'description', 'timeframe', 'target_date', 'category', 'color', 'sort_order', 'active', 'created_at'],
  goal_steps: ['id', 'goal_id', 'title', 'done', 'sort_order'],
  goal_habits: ['id', 'goal_id', 'habit_id'],
  settings: ['key', 'value'],
  schedule_blocks: ['id', 'day_of_week', 'start_time', 'end_time', 'title', 'subtitle', 'block_type', 'color', 'sort_order', 'date', 'recurrence', 'recurrence_end_date', 'is_all_day'],
  finance_transactions: ['id', 'date', 'type', 'category', 'amount', 'description', 'client', 'is_personal', 'receipt_url', 'created_at'],
  daily_reviews: ['id', 'date', 'energy', 'wins', 'lessons', 'tomorrow_focus', 'completed', 'created_at'],
  books: ['id', 'title', 'author', 'genre', 'status', 'total_pages', 'current_page', 'rating', 'cover_url', 'start_date', 'finish_date', 'notes_summary', 'sort_order', 'created_at'],
  pomodoro_sessions: ['id', 'date', 'task_title', 'duration_min', 'completed', 'started_at', 'created_at'],
  kb_documents: ['id', 'title', 'content', 'source_url', 'source_type', 'created_at', 'updated_at'],
}

function getColumnType(name) {
  const nameLower = name.toLowerCase()
  if (name === 'id') return 'TEXT'
  if (name === 'done' || name === 'on_time' || name === 'completed' || name === 'active' || name === 'is_top_priority' || name === 'is_all_day' || name === 'is_personal' || name === 'alerted') return 'INTEGER DEFAULT 0'
  if (nameLower.endsWith('_id') && name !== 'id') return 'TEXT'
  if (['energy', 'mood', 'sort_order', 'total_pages', 'current_page', 'rating', 'likes', 'comments', 'shares', 'views', 'calls_made', 'dms_sent', 'responses', 'meetings_booked', 'profile_views', 'direction_requests', 'phone_calls', 'new_reviews', 'posts_published', 'duration_min'].includes(name)) return 'INTEGER DEFAULT 0'
  if (['amount', 'setup_fee', 'monthly_retainer', 'revenue_mad', 'expenses_mad', 'spent', 'monthly_limit', 'avg_rating'].includes(name)) return 'REAL DEFAULT 0'
  if (['date', 'day_of_week', 'start_time', 'end_time', 'prayer_name', 'frequency', 'status', 'timeframe', 'type', 'category', 'block_type', 'source_type', 'genre'].includes(name)) return 'TEXT'
  if (nameLower.includes('_at') || ['created_at', 'updated_at', 'completed_at', 'started_at', 'synced_at', 'logged_at'].includes(name)) return 'TEXT DEFAULT (datetime(\'now\'))'
  return 'TEXT'
}

router.get('/', (req, res) => {
  try {
    const existingTables = query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'kb_fts%' AND name NOT LIKE 'sqlite_%'")
    const tableNames = existingTables.map(t => t.name)
    const issues = []
    const repairs = []

    for (const [tableName, expectedCols] of Object.entries(EXPECTED_TABLES)) {
      if (!tableNames.includes(tableName)) {
        issues.push({ table: tableName, issue: 'MISSING_TABLE', detail: 'Table does not exist' })
        continue
      }
      const actualCols = query(`PRAGMA table_info(${tableName})`).map(c => c.name)
      for (const col of expectedCols) {
        if (!actualCols.includes(col)) {
          const typeDef = getColumnType(col)
          const issue = { table: tableName, issue: 'MISSING_COLUMN', detail: `Column '${col}' missing, type: ${typeDef}` }
          issues.push(issue)
          try {
            run(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${typeDef}`)
            repairs.push({ table: tableName, column: col, status: 'REPAIRED' })
          } catch (e) {
            repairs.push({ table: tableName, column: col, status: 'FAILED', error: "Internal server error" })
          }
        }
      }
    }

    const db = require('../db/database').getDatabase()
    const pragma = db.pragma('integrity_check')[0]

    res.json({
      status: issues.length === 0 ? 'healthy' : 'repaired',
      integrity_check: pragma,
      tables: tableNames.length,
      issues,
      repairs,
      timestamp: new Date().toISOString(),
    })
  } catch (err) { handleError(res, err) }
})

module.exports = router
