const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { getDatabase, query, run } = require('../db/database')

const router = express.Router()

run(`CREATE TABLE IF NOT EXISTS search_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  item_id TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  content TEXT,
  url TEXT NOT NULL
)`)
try { run('ALTER TABLE search_index ADD COLUMN updated_at TEXT DEFAULT NULL') } catch {}
run('CREATE UNIQUE INDEX IF NOT EXISTS idx_search_index_lookup ON search_index(category, item_id)')

const CATEGORY_CONFIG = [
  { category: 'tasks', table: 'tasks', titleField: 'title', subtitleField: 'notes', contentFields: ['title', 'notes'], snippetField: 'notes', url: '/tasks' },
  { category: 'habits', table: 'habits', titleField: 'name', subtitleField: null, contentFields: ['name', 'category'], snippetField: 'name', url: '/habits' },
  { category: 'journal_entries', table: 'journal_entries', titleField: 'date', subtitleField: null, contentFields: ['what_happened', 'gratitude', 'muhasaba', 'tags'], snippetField: 'what_happened', url: '/journal' },
  { category: 'kb_documents', table: 'kb_documents', titleField: 'title', subtitleField: null, contentFields: ['title', 'content'], snippetField: 'content', url: '/knowledge' },
  { category: 'finance_transactions', table: 'finance_transactions', titleField: 'description', subtitleField: 'category', contentFields: ['description', 'category', 'client'], snippetField: 'description', url: '/finance' },
  { category: 'schedule_blocks', table: 'schedule_blocks', titleField: 'title', subtitleField: 'subtitle', contentFields: ['title', 'subtitle'], snippetField: 'subtitle', url: '/schedule' },
  { category: 'goals', table: 'goals', titleField: 'title', subtitleField: 'description', contentFields: ['title', 'description'], snippetField: 'description', url: '/goals' },
  { category: 'books', table: 'books', titleField: 'title', subtitleField: 'author', contentFields: ['title', 'author'], snippetField: 'author', url: '/reading' },
  { category: 'clients', table: 'clients', titleField: 'name', subtitleField: 'email', contentFields: ['name', 'email', 'phone1', 'phone2', 'contact_name', 'notes'], snippetField: 'notes', url: '/agency' },
]

let lastIndexedAt = null
const REINDEX_INTERVAL = 5 * 60 * 1000

function extractSnippet(content, query) {
  if (!content || !query) return ''
  const q = query.toLowerCase()
  const idx = content.toLowerCase().indexOf(q)
  if (idx === -1) return content.substring(0, 120) + (content.length > 120 ? '...' : '')
  const start = Math.max(0, idx - 40)
  const end = Math.min(content.length, idx + q.length + 80)
  const snippet = content.substring(start, end)
  return (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : '')
}

function doReindex() {
  const db = getDatabase()
  const del = db.prepare('DELETE FROM search_index')
  const ins = db.prepare('INSERT OR REPLACE INTO search_index (category, item_id, title, subtitle, content, url, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const now = new Date().toISOString()

  const tx = db.transaction(() => {
    del.run()
    for (const row of query('SELECT id, title, notes FROM tasks')) {
      ins.run('tasks', String(row.id), row.title || '', '', row.notes || '', '/tasks', now)
    }
    for (const row of query('SELECT id, name, category FROM habits')) {
      ins.run('habits', String(row.id), row.name || '', row.category || '', row.name || '', '/habits', now)
    }
    for (const row of query('SELECT id, date, what_happened, gratitude, muhasaba, tags FROM journal_entries')) {
      const content = [row.what_happened, row.gratitude, row.muhasaba, row.tags].filter(Boolean).join(' ')
      ins.run('journal_entries', String(row.id), row.date || '', '', content, '/journal', now)
    }
    for (const row of query('SELECT id, title, content FROM kb_documents')) {
      ins.run('kb_documents', String(row.id), row.title || '', '', row.content || '', '/knowledge', now)
    }
    for (const row of query('SELECT id, description, category, client FROM finance_transactions')) {
      const content = [row.description, row.category, row.client].filter(Boolean).join(' ')
      ins.run('finance_transactions', String(row.id), row.description || '', row.category || '', content, '/finance', now)
    }
    for (const row of query('SELECT id, title, subtitle FROM schedule_blocks')) {
      ins.run('schedule_blocks', String(row.id), row.title || '', row.subtitle || '', row.subtitle || '', '/schedule', now)
    }
    for (const row of query('SELECT id, title, description FROM goals')) {
      ins.run('goals', String(row.id), row.title || '', '', row.description || '', '/goals', now)
    }
    for (const row of query('SELECT id, title, author FROM books')) {
      ins.run('books', String(row.id), row.title || '', row.author || '', row.author || '', '/reading', now)
    }
    for (const row of query('SELECT id, name, email, phone1, phone2, contact_name, notes FROM clients')) {
      const content = [row.name, row.email, row.phone1, row.phone2, row.contact_name, row.notes].filter(Boolean).join(' ')
      ins.run('clients', String(row.id), row.name || '', row.email || '', content, '/agency', now)
    }
  })
  tx()
}

function maybeReindex() {
  const now = Date.now()
  if (lastIndexedAt && now - lastIndexedAt < REINDEX_INTERVAL) return
  lastIndexedAt = now
  setTimeout(() => {
    try { doReindex() } catch (err) { console.error('[Search] Auto-reindex failed:', err.message) }
  }, 100)
}

router.get('/', (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json({ results: [] })

    maybeReindex()
    const pattern = `%${q}%`
    const results = []
    const indexCount = getDatabase().prepare('SELECT COUNT(*) as cnt FROM search_index').get()

    if (indexCount && indexCount.cnt > 0) {
      const indexRows = query(
        `SELECT category, item_id, title, subtitle, content, url FROM search_index
         WHERE title LIKE ? OR subtitle LIKE ? OR content LIKE ?
         ORDER BY
           CASE WHEN title LIKE ? THEN 0 ELSE 1 END,
           CASE WHEN subtitle LIKE ? THEN 0 ELSE 1 END,
           updated_at DESC
         LIMIT 50`,
        [pattern, pattern, pattern, pattern, pattern]
      )
      const counts = {}
      for (const r of indexRows) {
        counts[r.category] = (counts[r.category] || 0) + 1
        if (counts[r.category] <= 5) {
          results.push({
            id: r.item_id,
            category: r.category,
            title: r.title || '',
            subtitle: r.subtitle || '',
            snippet: extractSnippet(r.content || '', q),
            url: r.url,
          })
        }
      }
    } else {
      for (const cfg of CATEGORY_CONFIG) {
        const conditions = cfg.contentFields.map(f => `${f} LIKE ?`).join(' OR ')
        const params = cfg.contentFields.map(() => pattern)
        const snippetField = cfg.snippetField || cfg.contentFields[0]
        const orderBy = cfg.titleField
        const sql = `SELECT id,
          ${cfg.titleField} as _title,
          ${cfg.subtitleField ? cfg.subtitleField + ' as _subtitle' : 'NULL as _subtitle'},
          ${snippetField} as _snippet
          FROM ${cfg.table}
          WHERE ${conditions}
          ORDER BY CASE WHEN ${orderBy} LIKE ? THEN 0 ELSE 1 END
          LIMIT 5`
        const rows = query(sql, [...params, pattern])
        for (const row of rows) {
          results.push({
            id: String(row.id),
            category: cfg.category,
            title: row._title || '',
            subtitle: row._subtitle || '',
            snippet: extractSnippet(row._snippet || '', q),
            url: cfg.url,
          })
        }
      }
    }

    res.json({ results })
  } catch (err) { handleError(res, err) }
})

router.post('/reindex', (req, res) => {
  try {
    doReindex()
    lastIndexedAt = Date.now()
    res.json({ success: true })
  } catch (err) { handleError(res, err) }
})

module.exports = router
