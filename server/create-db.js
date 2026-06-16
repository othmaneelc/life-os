const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, '../data/lifeos.db')
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

const migrations = [
  `CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT, tag TEXT, priority TEXT CHECK(priority IN ('high','medium','low')), status TEXT CHECK(status IN ('todo','inprogress','done')) DEFAULT 'todo', is_top_priority INTEGER DEFAULT 0, due_date TEXT, notes TEXT, google_task_id TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), completed_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY, date TEXT UNIQUE NOT NULL, mood INTEGER CHECK(mood BETWEEN 1 AND 5), what_happened TEXT, gratitude TEXT, muhasaba TEXT, tomorrow_intention TEXT, tags TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS prayers (id TEXT PRIMARY KEY, date TEXT NOT NULL, prayer_name TEXT CHECK(prayer_name IN ('fajr','dhuhr','asr','maghrib','isha')), scheduled_time TEXT, done INTEGER DEFAULT 0, on_time INTEGER DEFAULT 0, UNIQUE(date, prayer_name))`,
  `CREATE TABLE IF NOT EXISTS prayer_times_cache (date TEXT PRIMARY KEY, fajr TEXT, sunrise TEXT, dhuhr TEXT, asr TEXT, maghrib TEXT, isha TEXT, fetched_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS habits (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, frequency TEXT DEFAULT 'daily', active INTEGER DEFAULT 1, sort_order INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS habit_logs (id TEXT PRIMARY KEY, habit_id TEXT REFERENCES habits(id), date TEXT NOT NULL, done INTEGER DEFAULT 0, note TEXT, logged_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS prospects (id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, company TEXT, status TEXT, source TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS revenue (id TEXT PRIMARY KEY, client_id TEXT, amount REAL, date TEXT, description TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS outreach_log (id TEXT PRIMARY KEY, prospect_id TEXT, type TEXT, content TEXT, date TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS schedule_blocks (id TEXT PRIMARY KEY, title TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, date TEXT, subtitle TEXT, description TEXT, block_type TEXT, color TEXT, day_of_week TEXT, recurrence TEXT, recurrence_end_date TEXT, is_all_day INTEGER DEFAULT 0, google_event_id TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS daily_reviews (id TEXT PRIMARY KEY, date TEXT UNIQUE NOT NULL, morning TEXT, evening TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS pomodoro_sessions (id TEXT PRIMARY KEY, date TEXT, duration INTEGER, task TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS kb_documents (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT, source_url TEXT, source_type TEXT DEFAULT 'note', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS content_log (id TEXT PRIMARY KEY, type TEXT, title TEXT, content TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS gbp_metrics (id TEXT PRIMARY KEY, date TEXT, views INTEGER, searches INTEGER, actions INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS books (id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT, genre TEXT, total_pages INTEGER DEFAULT 0, current_page INTEGER DEFAULT 0, rating REAL, cover_url TEXT, status TEXT CHECK(status IN ('want_to_read','reading','finished')) DEFAULT 'want_to_read', sort_order INTEGER DEFAULT 0, start_date TEXT, finish_date TEXT, notes_summary TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS book_notes (id TEXT PRIMARY KEY, book_id TEXT REFERENCES books(id), chapter TEXT, content TEXT NOT NULL, type TEXT DEFAULT 'note', page INTEGER, created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS event_templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, title TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, block_type TEXT, color TEXT, icon TEXT, sort_order INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, target_value REAL, current_value REAL DEFAULT 0, unit TEXT, deadline TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS finance_transactions (id TEXT PRIMARY KEY, date TEXT NOT NULL, type TEXT CHECK(type IN ('income','expense')), category TEXT NOT NULL, amount REAL NOT NULL, description TEXT, client TEXT, is_personal INTEGER DEFAULT 0, receipt_url TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  `ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0`,
  `ALTER TABLE habits ADD COLUMN sort_order INTEGER DEFAULT 0`,
]

for (const sql of migrations) {
  try { db.exec(sql) } catch (e) {
    if (!e.message.includes('duplicate column')) console.error('Migration error:', e.message)
  }
}

db.close()
console.log('Fresh database created at:', dbPath)
