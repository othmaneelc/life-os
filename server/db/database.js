const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.LIFEOS_DB_PATH || path.join(__dirname, '../../data/lifeos.db')
let db = null

function getDatabase() {
  if (db) return db
  if (global.__lifeos_db) {
    db = global.__lifeos_db
    return db
  }
  if (DB_PATH !== ':memory:') {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }
  db = new Database(DB_PATH)
  if (DB_PATH !== ':memory:') {
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  global.__lifeos_db = db
  return db
}

function query(sql, params = []) {
  return getDatabase().prepare(sql).all(params)
}

function run(sql, params = []) {
  return getDatabase().prepare(sql).run(params)
}

function get(sql, params = []) {
  return getDatabase().prepare(sql).get(params) || null
}

module.exports = { getDatabase, query, run, get }
