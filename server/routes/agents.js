const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, run, get } = require('../db/database')
const { getAIConfig, aiCall } = require('../services/aiCall')
const logger = require('../services/logger')

const router = express.Router()

// Auto-create tables
run(`CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  action_type TEXT,
  action_params TEXT DEFAULT '{}',
  schedule_type TEXT NOT NULL DEFAULT 'interval',
  schedule_value TEXT NOT NULL DEFAULT '24h',
  schedule_time TEXT,
  schedule_days TEXT,
  enabled INTEGER DEFAULT 0,
  last_run DATETIME,
  next_run DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`)
run(`CREATE TABLE IF NOT EXISTS agent_logs (
  id TEXT PRIMARY KEY,
  agent_id INTEGER,
  status TEXT DEFAULT 'pending',
  result TEXT,
  error TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
)`)
// If the table was created with the old INTEGER PRIMARY KEY schema, migrate it
const cols = query(`PRAGMA table_info(agent_logs)`)
const idCol = cols.find(c => c.name === 'id')
if (idCol && idCol.type.toUpperCase().includes('INTEGER')) {
  run(`ALTER TABLE agent_logs RENAME TO agent_logs_old`)
  run(`CREATE TABLE agent_logs (
    id TEXT PRIMARY KEY,
    agent_id INTEGER,
    status TEXT DEFAULT 'pending',
    result TEXT,
    error TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`)
  run(`INSERT INTO agent_logs (id, agent_id, status, result, error, started_at, completed_at) SELECT CAST(id AS TEXT), agent_id, status, result, error, started_at, completed_at FROM agent_logs_old`)
  run(`DROP TABLE agent_logs_old`)
}

function parseInterval(value) {
  const match = value.match(/^(\d+)([hmd])$/)
  if (!match) return 86400000
  const n = parseInt(match[1])
  switch (match[2]) {
    case 'h': return n * 60 * 60 * 1000
    case 'm': return n * 60 * 1000
    case 'd': return n * 24 * 60 * 60 * 1000
    default: return 86400000
  }
}

function computeNextRun(agent) {
  const now = new Date()
  switch (agent.schedule_type) {
    case 'interval': {
      const ms = parseInterval(agent.schedule_value)
      const last = agent.last_run ? new Date(agent.last_run) : now
      return new Date(last.getTime() + ms).toISOString()
    }
    case 'daily': {
      if (!agent.schedule_time) return null
      const [h, m] = agent.schedule_time.split(':').map(Number)
      const next = new Date(now)
      next.setHours(h, m, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return next.toISOString()
    }
    case 'weekly': {
      if (!agent.schedule_time || !agent.schedule_days) return null
      const [h, m] = agent.schedule_time.split(':').map(Number)
      const days = agent.schedule_days.split(',').map(Number)
      const next = new Date(now)
      next.setHours(h, m, 0, 0)
      for (let i = 0; i < 7; i++) {
        const d = new Date(next)
        d.setDate(next.getDate() + i)
        if (days.includes(d.getDay()) && d > now) return d.toISOString()
      }
      return null
    }
    default: return null
  }
}

const DAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function buildAgentContext() {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  const todayTasks = query("SELECT id, title, status, priority, due_date FROM tasks WHERE due_date = ? ORDER BY sort_order LIMIT 20", [today])
  const pendingTasks = query("SELECT id, title, status, priority, due_date FROM tasks WHERE status != 'done' ORDER BY sort_order LIMIT 20")
  const completedToday = query("SELECT id, title FROM tasks WHERE status = 'done' AND completed_at >= datetime('now', '-1 day') LIMIT 10")
  const journal = query("SELECT date, mood, what_happened FROM journal_entries ORDER BY date DESC LIMIT 3")
  const habits = query("SELECT h.id, h.name, h.category, COALESCE(hl.done, 0) as done FROM habits h LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.date = ? ORDER BY h.sort_order", [today])
  const schedule = query("SELECT id, title, start_time, end_time, block_type FROM schedule_blocks WHERE day_of_week = 'all' OR day_of_week = ? ORDER BY start_time LIMIT 10", [DAYS_SHORT[now.getDay()].toLowerCase()])
  const finance = query("SELECT id, date, type, category, amount, description FROM finance_transactions ORDER BY date DESC LIMIT 5")
  const goals = query("SELECT id, title, active FROM goals ORDER BY sort_order LIMIT 10")
  const notifications = query("SELECT id, title, message, read FROM notifications WHERE read = 0 ORDER BY created_at DESC LIMIT 10")

  return JSON.stringify({
    date: today,
    dayOfWeek: DAYS_FULL[now.getDay()],
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    tasks: { today: todayTasks, pending: pendingTasks, completedToday },
    journal: journal,
    habits: habits,
    schedule: schedule,
    finance: finance,
    goals: goals,
    notifications: notifications,
  }, null, 2)
}

async function executeActions(responseText) {
  const results = []
  const actionRegex = /\[ACTION:([^\]]+)\]/g
  let match
  while ((match = actionRegex.exec(responseText)) !== null) {
    const parts = match[1].split(':')
    const action = parts[0]
    const params = {}
    for (let i = 1; i < parts.length; i++) {
      const eq = parts[i].indexOf('=')
      if (eq > 0) {
        params[parts[i].slice(0, eq)] = parts[i].slice(eq + 1)
      }
    }
    try {
      const result = await executeAction(action, params)
      results.push({ action, params, success: true, result })
    } catch (err) {
      results.push({ action, params, success: false, error: "Internal server error" })
    }
  }
  return results
}

async function executeAction(action, params) {
  const { executeAction: exec } = require('../services/actions')
  return exec(action, params)
}

async function runAgent(agent) {
  const startedAt = new Date().toISOString()
  const logId = uuidv4()
  try {
    run("INSERT INTO agent_logs (id, agent_id, status, started_at) VALUES (?,?,?,?)", [logId, agent.id, 'running', startedAt])
    const config = getAIConfig()
    if (!config) throw new Error('No AI key configured')

    const context = buildAgentContext()
    const messages = [
      { role: 'system', content: `You are an automated Life OS agent running on a schedule. Use the context below to execute actions.\n\nAgent: ${agent.name}\nDescription: ${agent.description || 'N/A'}\n\nYou can use any of these actions: create_task, update_task, delete_task, complete_task, create_habit, delete_habit, log_habit, unlog_habit, create_journal, update_journal, log_prayer, create_goal, add_goal_step, toggle_step, update_goal, create_block, delete_block, add_transaction, delete_transaction, add_book, update_book, log_pomodoro, update_setting, create_review, create_client, update_client, create_prospect, add_revenue, log_outreach, log_content, create_document, add_book_note.\n\nFormat: [ACTION:action_name:param1=value1|param2=value2]\n\nContext:\n${context}\n\nRespond with action commands to execute. Keep responses minimal.` },
      { role: 'user', content: agent.prompt_template },
    ]

    const reply = await aiCall(config, messages, 600, 0.4)
    if (!reply) throw new Error('AI response empty')

    const actionResults = await executeActions(reply)

    run("UPDATE agent_logs SET status=?, result=?, completed_at=? WHERE id=?", ['completed', JSON.stringify({ reply, actions: actionResults }), new Date().toISOString(), logId])

    const nextRun = computeNextRun(agent)
    run("UPDATE agents SET last_run=?, next_run=? WHERE id=?", [startedAt, nextRun, agent.id])

    return { success: true, reply, actions: actionResults }
  } catch (err) {
    run("UPDATE agent_logs SET status=?, error=?, completed_at=? WHERE id=?", ['failed', err.message, new Date().toISOString(), logId])
    run("UPDATE agents SET last_run=? WHERE id=?", [startedAt, agent.id])
    return { success: false, error: "Internal server error" }
  }
}

function uuidv4() {
  const { v4 } = require('uuid')
  return v4()
}

// Routes

router.get('/', (req, res) => {
  try {
    const agents = query('SELECT * FROM agents ORDER BY created_at DESC')
    res.json({ success: true, agents })
  } catch (err) { handleError(res, err) }
})

router.post('/', (req, res) => {
  try {
    const { name, description, prompt_template, action_type, action_params, schedule_type, schedule_value, schedule_time, schedule_days, enabled } = req.body
    if (!name || !prompt_template) return res.status(400).json({ success: false, error: 'Name and prompt_template required' })

    const nextRun = computeNextRun({ schedule_type: schedule_type || 'interval', schedule_value: schedule_value || '24h', schedule_time, schedule_days, last_run: null })

    const result = run(
      "INSERT INTO agents (name, description, prompt_template, action_type, action_params, schedule_type, schedule_value, schedule_time, schedule_days, enabled, next_run) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [name, description || '', prompt_template, action_type || null, action_params || '{}', schedule_type || 'interval', schedule_value || '24h', schedule_time || null, schedule_days || null, enabled ? 1 : 0, nextRun]
    )
    const agent = get('SELECT * FROM agents WHERE id = ?', [result.lastInsertRowid])
    res.json({ success: true, agent })
  } catch (err) { handleError(res, err) }
})

router.put('/:id', (req, res) => {
  try {
    const agent = get('SELECT * FROM agents WHERE id = ?', [req.params.id])
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' })

    const fields = []; const vals = []
    for (const k of ['name', 'description', 'prompt_template', 'action_type', 'action_params', 'schedule_type', 'schedule_value', 'schedule_time', 'schedule_days']) {
      if (req.body[k] !== undefined) { fields.push(`${k}=?`); vals.push(req.body[k]) }
    }
    if (req.body.enabled !== undefined) { fields.push('enabled=?'); vals.push(req.body.enabled ? 1 : 0) }

    const merged = { ...agent, ...req.body }
    const nextRun = computeNextRun(merged)
    fields.push('next_run=?'); vals.push(nextRun)

    if (fields.length) { vals.push(req.params.id); run(`UPDATE agents SET ${fields.join(',')} WHERE id=?`, vals) }
    const updated = get('SELECT * FROM agents WHERE id = ?', [req.params.id])
    res.json({ success: true, agent: updated })
  } catch (err) { handleError(res, err) }
})

router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM agents WHERE id = ?', [req.params.id])
    run('DELETE FROM agent_logs WHERE agent_id = ?', [req.params.id])
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

router.post('/:id/run', async (req, res) => {
  try {
    const agent = get('SELECT * FROM agents WHERE id = ?', [req.params.id])
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' })

    const result = await runAgent(agent)
    res.json(result)
  } catch (err) { handleError(res, err) }
})

router.post('/:id/toggle', (req, res) => {
  try {
    const agent = get('SELECT * FROM agents WHERE id = ?', [req.params.id])
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' })

    const newEnabled = agent.enabled ? 0 : 1
    let nextRun = agent.next_run
    if (newEnabled && !nextRun) {
      nextRun = computeNextRun(agent)
    }
    run("UPDATE agents SET enabled=?, next_run=? WHERE id=?", [newEnabled, nextRun, req.params.id])
    const updated = get('SELECT * FROM agents WHERE id = ?', [req.params.id])
    res.json({ success: true, agent: updated })
  } catch (err) { handleError(res, err) }
})

router.get('/:id/logs', (req, res) => {
  try {
    const logs = query('SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY started_at DESC LIMIT 50', [req.params.id])
    res.json({ success: true, logs })
  } catch (err) { handleError(res, err) }
})

// Scheduler — check every 60 seconds for agents that need to run
setInterval(() => {
  try {
    const now = new Date()
    const agents = query("SELECT * FROM agents WHERE enabled = 1 AND next_run IS NOT NULL")
    for (const agent of agents) {
      const nextRun = new Date(agent.next_run)
      if (nextRun <= now) {
        runAgent(agent).catch(err => logger.error({ err, agentId: agent.id }, 'Agent scheduled run failed'))
      }
    }
  } catch (err) {
    logger.error({ err }, 'Agent scheduler check failed')
  }
}, 60000)

module.exports = router
