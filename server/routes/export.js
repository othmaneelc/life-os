const express = require('express')
const { handleError } = require('../middleware/errorHandler')
const { query, getDatabase, run } = require('../db/database')
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const router = express.Router()

const TABLES = [
  'tasks', 'journal_entries', 'prayers', 'habits', 'habit_logs', 'goals', 'goal_steps',
  'goal_habits', 'schedule_blocks', 'finance_transactions', 'books', 'book_notes',
  'daily_reviews', 'pomodoro_sessions', 'kb_documents', 'settings', 'clients',
]

router.get('/json', (req, res) => {
  try {
    const data = {}
    for (const table of TABLES) {
      try { data[table] = query(`SELECT * FROM "${table}"`) } catch { data[table] = [] }
    }
    res.setHeader('Content-Disposition', `attachment; filename=lifeos-export-${new Date().toISOString().split('T')[0]}.json`)
    res.json(data)
  } catch (err) { handleError(res, err) }
})

router.get('/csv/:table', (req, res) => {
  try {
    const { table } = req.params
    if (!TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' })
    const rows = query(`SELECT * FROM "${table}"`)
    if (!rows.length) return res.status(404).json({ error: 'No data' })
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const val = r[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=${table}-${new Date().toISOString().split('T')[0]}.csv`)
    res.send(csv)
  } catch (err) { handleError(res, err) }
})

router.post('/import', (req, res) => {
  try {
    const data = req.body
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid payload: expected { table: [rows] }' })
    }

    const db = getDatabase()
    let tablesImported = 0

    const importTx = db.transaction(() => {
      for (const [table, rows] of Object.entries(data)) {
        if (!TABLES.includes(table)) continue
        if (!Array.isArray(rows) || rows.length === 0) continue

        db.prepare(`DELETE FROM "${table}"`).run()
        if (rows.length === 0) continue

        const columns = Object.keys(rows[0])
        const placeholders = columns.map(() => '?').join(', ')
        const esc = c => `"${c.replace(/"/g, '""')}"`
        const insert = db.prepare(`INSERT INTO "${table}" (${columns.map(esc).join(', ')}) VALUES (${placeholders})`)

        for (const row of rows) {
          insert.run(columns.map(c => row[c] ?? null))
        }
        tablesImported++
      }
    })

    importTx()
    res.json({ success: true, tables_imported: tablesImported })
  } catch (err) { handleError(res, err) }
})

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const parseLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim()); current = ''
      } else { current += ch }
    }
    result.push(current.trim())
    return result
  }
  const headers = parseLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i])
    const row = {}
    headers.forEach((h, j) => { row[h] = vals[j] || null })
    rows.push(row)
  }
  return rows
}

const IMPORT_TABLES = ['finance_transactions', 'tasks', 'habits', 'journal_entries']

router.post('/import-csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file is required' })
    const table = req.body.table
    if (!table || !IMPORT_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table. Allowed: ' + IMPORT_TABLES.join(', ') })
    const csvText = req.file.buffer.toString('utf-8')
    const rows = parseCSV(csvText)
    if (rows.length === 0) return res.status(400).json({ error: 'CSV file is empty or has no data rows' })
    const db = getDatabase()
    const tx = db.transaction(() => {
      for (const row of rows) {
        row.id = uuidv4()
        const columns = Object.keys(row)
        const placeholders = columns.map(() => '?').join(', ')
        const esc = c => `"${c.replace(/"/g, '""')}"`
        db.prepare(`INSERT INTO "${table}" (${columns.map(esc).join(', ')}) VALUES (${placeholders})`).run(columns.map(c => row[c] ?? null))
      }
    })
    tx()
    res.json({ success: true, imported: rows.length })
  } catch (err) { handleError(res, err) }
})

module.exports = router
