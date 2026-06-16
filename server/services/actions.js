const { query, run, get } = require('../db/database')
const { v4: uuidv4 } = require('uuid')

function executeAction(action, params) {
  const today = new Date().toISOString().split('T')[0]

  switch (action) {
    case 'create_task': {
      const id = uuidv4()
      run("INSERT INTO tasks (id, title, category, priority, status, due_date, notes, sort_order) VALUES (?, ?, ?, ?, 'todo', ?, ?, COALESCE((SELECT MAX(sort_order) FROM tasks), 0) + 1)",
        [id, params.title || 'New Task', params.category || 'personal', params.priority || 'medium', params.due_date || null, params.notes || null])
      return { id, data: get('SELECT * FROM tasks WHERE id = ?', [id]) }
    }
    case 'update_task': {
      const fields = []; const vals = []
      for (const k of ['title', 'category', 'priority', 'status', 'due_date', 'notes', 'tag']) {
        if (params[k] !== undefined) { fields.push(`${k}=?`); vals.push(params[k]) }
      }
      if (params.status === 'done') fields.push("completed_at=datetime('now')")
      if (fields.length) { vals.push(params.id); run(`UPDATE tasks SET ${fields.join(',')}, updated_at=datetime('now') WHERE id=?`, vals) }
      return { data: params.id ? get('SELECT * FROM tasks WHERE id = ?', [params.id]) : null }
    }
    case 'delete_task': {
      run('DELETE FROM tasks WHERE id = ?', [params.id])
      return {}
    }
    case 'complete_task': {
      run("UPDATE tasks SET status='done', completed_at=datetime('now') WHERE id=?", [params.id])
      return {}
    }
    case 'create_habit': {
      const id = uuidv4()
      run('INSERT INTO habits (id, name, category, sort_order) VALUES (?,?,?,COALESCE((SELECT MAX(sort_order) FROM habits),0)+1)', [id, params.name, params.category || null])
      return { id, data: get('SELECT * FROM habits WHERE id = ?', [id]) }
    }
    case 'delete_habit': {
      run('DELETE FROM habits WHERE id = ?', [params.id])
      run('DELETE FROM habit_logs WHERE habit_id = ?', [params.id])
      return {}
    }
    case 'log_habit': {
      const d = params.date || today
      const exist = get('SELECT id FROM habit_logs WHERE habit_id=? AND date=?', [params.habit_id, d])
      if (exist) run('UPDATE habit_logs SET done=? WHERE id=?', [params.done !== '0' ? 1 : 0, exist.id])
      else run('INSERT INTO habit_logs (id, habit_id, date, done) VALUES (?,?,?,?)', [uuidv4(), params.habit_id, d, params.done !== '0' ? 1 : 0])
      return {}
    }
    case 'unlog_habit': {
      run('DELETE FROM habit_logs WHERE habit_id=? AND date=?', [params.habit_id, params.date || today])
      return {}
    }
    case 'create_journal': {
      const id = uuidv4()
      run("INSERT OR REPLACE INTO journal_entries (id, date, what_happened, mood) VALUES (?,?,?,?)", [id, params.date || today, params.content || '', params.mood ? parseInt(params.mood) : null])
      return {}
    }
    case 'update_journal': {
      const fields = []; const vals = []
      for (const k of ['what_happened', 'gratitude', 'muhasaba', 'tomorrow_intention', 'tags']) {
        if (params[k] !== undefined) { fields.push(`${k}=?`); vals.push(params[k]) }
      }
      if (params.mood) { fields.push('mood=?'); vals.push(parseInt(params.mood)) }
      if (fields.length) { vals.push(params.date || today); run(`UPDATE journal_entries SET ${fields.join(',')} WHERE date=?`, vals) }
      return {}
    }
    case 'log_prayer': {
      const pId = uuidv4()
      run("INSERT OR REPLACE INTO prayers (id, date, prayer_name, done, on_time) VALUES (?,?,?,?,?)",
        [pId, params.date || today, params.prayer_name, params.done !== '0' ? 1 : 0, params.on_time !== '0' ? 1 : 0])
      return {}
    }
    case 'create_goal': {
      const gId = uuidv4()
      run('INSERT INTO goals (id, title, description, timeframe, color) VALUES (?,?,?,?,?)', [gId, params.title, params.description || '', params.timeframe || 'monthly', params.color || '#0071E3'])
      return { id: gId }
    }
    case 'add_goal_step': {
      const sId = uuidv4()
      run('INSERT INTO goal_steps (id, goal_id, title, sort_order) VALUES (?,?,?,COALESCE((SELECT MAX(sort_order) FROM goal_steps WHERE goal_id=?),0)+1)', [sId, params.goal_id, params.title, params.goal_id])
      return {}
    }
    case 'toggle_step': {
      const step = get('SELECT done FROM goal_steps WHERE id=?', [params.step_id])
      if (step) run('UPDATE goal_steps SET done=? WHERE id=?', [step.done ? 0 : 1, params.step_id])
      return {}
    }
    case 'update_goal': {
      const gFields = []; const gVals = []
      for (const k of ['title', 'description', 'timeframe', 'category', 'color', 'active']) {
        if (params[k] !== undefined) { gFields.push(`${k}=?`); gVals.push(params[k]) }
      }
      if (gFields.length) { gVals.push(params.goal_id); run(`UPDATE goals SET ${gFields.join(',')} WHERE id=?`, gVals) }
      return {}
    }
    case 'create_block': {
      const bId = uuidv4()
      run('INSERT INTO schedule_blocks (id, title, start_time, end_time, day_of_week, block_type, color, date) VALUES (?,?,?,?,?,?,?,?)',
        [bId, params.title, params.start_time, params.end_time, params.day_of_week || 'all', params.block_type || null, params.color || null, params.date || null])
      return {}
    }
    case 'delete_block': {
      run('DELETE FROM schedule_blocks WHERE id=?', [params.id])
      return {}
    }
    case 'add_transaction': {
      const fId = uuidv4()
      run('INSERT INTO finance_transactions (id, date, type, category, amount, description, client) VALUES (?,?,?,?,?,?,?)',
        [fId, params.date || today, params.type || 'expense', params.category || 'Other', parseFloat(params.amount) || 0, params.description || '', params.client || ''])
      return {}
    }
    case 'delete_transaction': {
      run('DELETE FROM finance_transactions WHERE id=?', [params.id])
      return {}
    }
    case 'add_book': {
      const bookId = uuidv4()
      run('INSERT INTO books (id, title, author, status, total_pages) VALUES (?,?,?,?,?)', [bookId, params.title, params.author || null, params.status || 'want_to_read', parseInt(params.total_pages) || 0])
      return { id: bookId }
    }
    case 'update_book': {
      const bFields = []; const bVals = []
      for (const k of ['title', 'author', 'status', 'current_page', 'total_pages', 'rating']) {
        if (params[k] !== undefined) { bFields.push(`${k}=?`); bVals.push(params[k]) }
      }
      if (bFields.length) { bVals.push(params.id); run(`UPDATE books SET ${bFields.join(',')} WHERE id=?`, bVals) }
      return {}
    }
    case 'log_pomodoro': {
      const pId = uuidv4()
      run("INSERT INTO pomodoro_sessions (id, date, task_title, duration_min, completed, started_at) VALUES (?,?,?,?,?,datetime('now'))",
        [pId, today, params.task_title || 'Focus session', parseInt(params.duration_min) || 25, params.completed !== '0' ? 1 : 0])
      return {}
    }
    case 'update_setting': {
      if (!/^(groq_key|gemini_key|user_name|voice_lang|theme|weather_lat|weather_lon|notify_|agency_name|user_bio|email|font_size|default_view|date_format|first_day_of_week|time_format)$/.test(params.key)) {
        throw new Error('Setting key not allowed via AI')
      }
      run("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)", [params.key, String(params.value)])
      return {}
    }
    case 'create_review': {
      const rId = uuidv4()
      run("INSERT OR REPLACE INTO daily_reviews (id, date, energy, wins, lessons, tomorrow_focus) VALUES (?,?,?,?,?,?)",
        [rId, params.date || today, params.energy ? parseInt(params.energy) : 3, params.wins || '', params.lessons || '', params.tomorrow_focus || ''])
      return {}
    }
    case 'create_client': {
      const cId = uuidv4()
      run("INSERT INTO clients (id, name, contact_name, phone1, email, address, status, notes) VALUES (?,?,?,?,?,?,?,?)",
        [cId, params.name, params.contact_name || '', params.phone || '', params.email || '', params.address || '', params.status || 'active', params.notes || ''])
      return { id: cId }
    }
    case 'update_client': {
      const cFields = []; const cVals = []
      for (const k of ['name', 'contact_name', 'phone1', 'phone2', 'email', 'website', 'address', 'status', 'notes', 'contract_end', 'monthly_retainer']) {
        if (params[k] !== undefined) { cFields.push(`${k}=?`); cVals.push(params[k]) }
      }
      if (cFields.length) { cVals.push(params.id); run(`UPDATE clients SET ${cFields.join(',')}, updated_at=datetime('now') WHERE id=?`, cVals) }
      return {}
    }
    case 'delete_client': {
      run('DELETE FROM clients WHERE id=?', [params.id])
      return {}
    }
    case 'create_prospect': {
      const pId = uuidv4()
      run("INSERT INTO prospects (id, company_name, contact_name, phone, state, status, notes) VALUES (?,?,?,?,?,?,?)",
        [pId, params.company_name || params.name, params.contact_name || '', params.phone || '', params.state || '', params.status || 'new_lead', params.notes || ''])
      return { id: pId }
    }
    case 'update_prospect': {
      const pFields = []; const pVals = []
      for (const k of ['company_name', 'contact_name', 'phone', 'state', 'status', 'notes', 'next_action', 'last_contact']) {
        if (params[k] !== undefined) { pFields.push(`${k}=?`); pVals.push(params[k]) }
      }
      if (pFields.length) { pVals.push(params.id); run(`UPDATE prospects SET ${pFields.join(',')}, updated_at=datetime('now') WHERE id=?`, pVals) }
      return {}
    }
    case 'delete_prospect': {
      run('DELETE FROM prospects WHERE id=?', [params.id])
      return {}
    }
    case 'add_revenue': {
      run("INSERT INTO revenue (id, month, year, revenue_mad, expenses_mad, notes) VALUES (?,?,?,?,?,?) ON CONFLICT(month, year) DO UPDATE SET revenue_mad=excluded.revenue_mad, expenses_mad=excluded.expenses_mad, notes=excluded.notes",
        [uuidv4(), params.month, parseInt(params.year) || new Date().getFullYear(), parseFloat(params.revenue) || 0, parseFloat(params.expenses) || 0, params.notes || ''])
      return {}
    }
    case 'log_outreach': {
      run("INSERT INTO outreach_log (id, date, calls_made, dms_sent, responses, meetings_booked, notes) VALUES (?,?,?,?,?,?,?) ON CONFLICT(date) DO UPDATE SET calls_made=excluded.calls_made, dms_sent=excluded.dms_sent, responses=excluded.responses, meetings_booked=excluded.meetings_booked, notes=excluded.notes",
        [uuidv4(), params.date || today, parseInt(params.calls) || 0, parseInt(params.dms) || 0, parseInt(params.responses) || 0, parseInt(params.meetings) || 0, params.notes || ''])
      return {}
    }
    case 'log_content': {
      run("INSERT INTO content_log (id, date, platform, content_type, client, caption, likes, comments, shares, views, link) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [uuidv4(), params.date || today, params.platform || '', params.content_type || 'post', params.client || '', params.caption || '', parseInt(params.likes) || 0, parseInt(params.comments) || 0, parseInt(params.shares) || 0, parseInt(params.views) || 0, params.link || ''])
      return {}
    }
    case 'create_document': {
      const kId = uuidv4()
      run("INSERT INTO kb_documents (id, title, content, source_type) VALUES (?,?,?,?)",
        [kId, params.title, params.content || '', params.source_type || 'note'])
      return { id: kId }
    }
    case 'update_document': {
      const kFields = []; const kVals = []
      for (const k of ['title', 'content', 'source_type', 'source_url']) {
        if (params[k] !== undefined) { kFields.push(`${k}=?`); kVals.push(params[k]) }
      }
      if (kFields.length) { kVals.push(params.id); run(`UPDATE kb_documents SET ${kFields.join(',')}, updated_at=datetime('now') WHERE id=?`, kVals) }
      return {}
    }
    case 'search_kb': {
      const term = params.query || params.q || ''
      if (!term) return { results: [] }
      const results = query("SELECT id, title, snippet(kb_fts, '<b>', '</b>', '...', 64) as snippet FROM kb_fts WHERE kb_fts MATCH ? ORDER BY rank LIMIT 10", [term])
      return { results }
    }
    case 'add_book_note': {
      run("INSERT INTO book_notes (id, book_id, chapter, content, type, page) VALUES (?,?,?,?,?,?)",
        [uuidv4(), params.book_id, params.chapter || '', params.content || '', params.type || 'note', params.page ? parseInt(params.page) : null])
      return {}
    }
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

function parseActions(text) {
  const results = []
  const actionRegex = /\[ACTION:(\w+):([^\]]+)\]/g
  let match
  while ((match = actionRegex.exec(text)) !== null) {
    const params = {}
    for (const pair of match[2].split('|')) {
      const idx = pair.indexOf('=')
      if (idx === -1) continue
      params[pair.slice(0, idx)] = pair.slice(idx + 1)
    }
    results.push({ action: match[1], params })
  }
  return results
}

async function executeActions(text) {
  const actions = parseActions(text)
  const results = []
  for (const { action, params } of actions) {
    try {
      const result = executeAction(action, params)
      results.push({ action, params, success: true, data: result })
    } catch (err) {
      results.push({ action, params, success: false, error: err.message })
    }
  }
  return results
}

module.exports = { executeAction, executeActions, parseActions }
