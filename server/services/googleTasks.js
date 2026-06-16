const { google } = require('googleapis')
const { v4: uuidv4 } = require('uuid')
const logger = require('./logger')

async function syncTasks(auth) {
  const service = google.tasks({ version: 'v1', auth })
  const taskLists = await service.tasklists.list()
  const defaultList = taskLists.data.items?.[0]
  if (!defaultList) return { pulled: 0, pushed: 0 }

  const { query, get, run } = require('../db/database')

  // Pull remote tasks
  const remoteRes = await service.tasks.list({ tasklist: defaultList.id, showCompleted: true, maxResults: 100 })
  const remoteTasks = remoteRes.data.items || []
  let pulled = 0

  const localTasks = query('SELECT * FROM tasks')
  const localByGoogleId = {}
  for (const t of localTasks) {
    if (t.google_task_id) localByGoogleId[t.google_task_id] = t
  }

  for (const rt of remoteTasks) {
    const existing = localByGoogleId[rt.id]
    if (!existing) {
      run(`INSERT INTO tasks (id, title, category, tag, priority, status, google_task_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), rt.title, 'business', null, 'medium', rt.status === 'completed' ? 'done' : 'todo', rt.id, rt.notes || null])
      pulled++
    }
  }

  // Push local tasks to Google
  const localUnsynced = query("SELECT * FROM tasks WHERE google_task_id IS NULL AND status != 'done'")
  let pushed = 0
  for (const t of localUnsynced) {
    try {
      const created = await service.tasks.insert({
        tasklist: defaultList.id,
        requestBody: { title: t.title, notes: t.notes || '' },
      })
      run('UPDATE tasks SET google_task_id = ? WHERE id = ?', [created.data.id, t.id])
      pushed++
    } catch (err) {
      logger.error({ err }, 'Failed to push task')
    }
  }

  return { pulled, pushed }
}

module.exports = { syncTasks }
