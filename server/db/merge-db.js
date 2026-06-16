const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const OLD_DB = path.join(__dirname, '../../data/lifeos.db')
const freshPath = OLD_DB + '.fresh'
fs.renameSync(OLD_DB, freshPath)

const oldDb = new Database(freshPath)
const newDb = new Database(OLD_DB)
newDb.pragma('journal_mode = WAL')

const tables = oldDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()

for (const { name } of tables) {
  const rows = oldDb.prepare(`SELECT * FROM "${name}"`).all()
  if (rows.length === 0) continue
  const cols = Object.keys(rows[0])
  const placeholders = cols.map(() => '?').join(',')
  const insert = newDb.prepare(`INSERT OR IGNORE INTO "${name}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`)
  const insertMany = newDb.transaction((rows) => { for (const r of rows) insert.run(Object.values(r)) })
  insertMany(rows)
  console.log(`  ${name}: ${rows.length} rows`)
}

// Delete OAuth tokens from settings
newDb.prepare("DELETE FROM settings WHERE key IN ('google_client_id','google_client_secret','google_refresh_token','google_access_token','access_token','refresh_token')").run()
console.log('  settings: sanitized (OAuth tokens removed)')

oldDb.close()
newDb.close()
fs.unlinkSync(freshPath)
console.log('Done — sanitized database saved at', OLD_DB)
