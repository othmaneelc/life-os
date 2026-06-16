const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const BACKUP_DIR = path.join(__dirname, '../../data/backups')
const DB_PATH = path.join(__dirname, '../../data/lifeos.db')

const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).sort().reverse()
if (backups.length === 0) { console.log('No backups found'); process.exit(0) }

const latest = backups[0]
console.log('Restoring from:', latest)

const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, latest), 'utf-8'))

// Sanitize: remove OAuth tokens from settings
const secretKeys = ['google_client_id','google_client_secret','google_refresh_token','google_access_token','access_token','refresh_token']
if (data.settings) {
  const before = data.settings.length
  data.settings = data.settings.filter(s => !secretKeys.includes(s.key))
  console.log(`  settings: ${before} → ${data.settings.length} rows (${before - data.settings.length} secrets removed)`)
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)

let total = 0
for (const [table, rows] of Object.entries(data)) {
  if (!existingTables.includes(table)) { console.log(`  ${table}: table missing, skipping`); continue }
  if (rows.length === 0) continue

  // Get columns that actually exist in the current table
  const tableInfo = db.prepare(`PRAGMA table_info("${table}")`).all()
  const validCols = tableInfo.map(c => c.name)

  // Filter rows to only valid columns, skip rows that don't intersect
  const validRows = rows.map(r => {
    const filtered = {}
    for (const [k, v] of Object.entries(r)) {
      if (validCols.includes(k)) filtered[k] = v
    }
    return filtered
  }).filter(r => Object.keys(r).length > 0)

  if (validRows.length === 0) continue

  const cols = Object.keys(validRows[0])
  const placeholders = cols.map(() => '?').join(',')
  const quotedCols = cols.map(c => `"${c}"`).join(',')

  const del = db.prepare(`DELETE FROM "${table}"`)
  const insert = db.prepare(`INSERT INTO "${table}" (${quotedCols}) VALUES (${placeholders})`)

  const tx = db.transaction((rows) => {
    del.run()
    for (const r of rows) insert.run(Object.values(r))
  })

  tx(validRows)
  const skipped = rows.length - validRows.length
  console.log(`  ${table}: ${validRows.length} rows${skipped > 0 ? ` (${skipped} skipped - column mismatch)` : ''}`)
  total += validRows.length
}

db.close()
console.log(`\nDone — restored ${total} rows across ${Object.keys(data).length} tables`)
