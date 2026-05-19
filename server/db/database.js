const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '../../data/lifeos.db')
let db = null
let SQL = null

// Write queue to serialize database writes and prevent corruption
let writeQueue = []
let isWriting = false
let saveTimer = null
const SAVE_DEBOUNCE_MS = 100

async function getDatabase() {
  if (db) return db
  SQL = await initSqlJs()
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  db.run('PRAGMA journal_mode=WAL')
  return db
}

async function saveDatabase() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  await fs.promises.writeFile(DB_PATH, buffer)
}

function enqueueSave() {
  if (saveTimer) return
  saveTimer = setTimeout(async () => {
    saveTimer = null
    if (isWriting) {
      enqueueSave()
      return
    }
    isWriting = true
    try {
      await saveDatabase()
    } catch (err) {
      console.error('Database save failed:', err)
    } finally {
      isWriting = false
    }
  }, SAVE_DEBOUNCE_MS)
}

function query(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  db.run(sql, params)
  enqueueSave()
}

function get(sql, params = []) {
  const results = query(sql, params)
  return results.length > 0 ? results[0] : null
}

module.exports = { getDatabase, saveDatabase, query, run, get }
