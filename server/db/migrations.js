const { run } = require('./database')

const migrations = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT CHECK(category IN ('urgent','business','personal')),
    tag TEXT,
    priority TEXT CHECK(priority IN ('high','medium','low')),
    status TEXT CHECK(status IN ('todo','inprogress','done')) DEFAULT 'todo',
    is_top_priority INTEGER DEFAULT 0,
    due_date TEXT,
    notes TEXT,
    google_task_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    mood INTEGER CHECK(mood BETWEEN 1 AND 5),
    what_happened TEXT,
    gratitude TEXT,
    muhasaba TEXT,
    tomorrow_intention TEXT,
    tags TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS prayers (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    prayer_name TEXT CHECK(prayer_name IN ('fajr','dhuhr','asr','maghrib','isha')),
    scheduled_time TEXT,
    done INTEGER DEFAULT 0,
    on_time INTEGER DEFAULT 0,
    UNIQUE(date, prayer_name)
  )`,
  `CREATE TABLE IF NOT EXISTS prayer_times_cache (
    date TEXT PRIMARY KEY,
    fajr TEXT, sunrise TEXT, dhuhr TEXT, asr TEXT,
    maghrib TEXT, isha TEXT, fetched_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    frequency TEXT DEFAULT 'daily',
    active INTEGER DEFAULT 1,
    sort_order INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    habit_id TEXT REFERENCES habits(id),
    date TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    note TEXT,
    logged_at TEXT DEFAULT (datetime('now')),
    UNIQUE(habit_id, date)
  )`,
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone1 TEXT, phone2 TEXT,
    email TEXT, website TEXT,
    instagram TEXT, facebook TEXT,
    address TEXT,
    contract_start TEXT, contract_end TEXT,
    setup_fee REAL, monthly_retainer REAL,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS prospects (
    id TEXT PRIMARY KEY,
    company_name TEXT,
    contact_name TEXT,
    phone TEXT, state TEXT,
    status TEXT DEFAULT 'new_lead',
    last_contact TEXT,
    notes TEXT, next_action TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS revenue (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    revenue_mad REAL DEFAULT 0,
    expenses_mad REAL DEFAULT 0,
    notes TEXT,
    UNIQUE(month, year)
  )`,
  `CREATE TABLE IF NOT EXISTS outreach_log (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    calls_made INTEGER DEFAULT 0,
    dms_sent INTEGER DEFAULT 0,
    responses INTEGER DEFAULT 0,
    meetings_booked INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(date)
  )`,
  `CREATE TABLE IF NOT EXISTS schedule_blocks (
    id TEXT PRIMARY KEY,
    day_of_week TEXT DEFAULT 'all',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    block_type TEXT,
    color TEXT,
    sort_order INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS content_log (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    platform TEXT CHECK(platform IN ('instagram','tiktok','youtube','x','facebook')),
    content_type TEXT CHECK(content_type IN ('post','reel','short','story','carousel')),
    client TEXT,
    caption TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    link TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS gbp_metrics (
    id TEXT PRIMARY KEY,
    week_start TEXT NOT NULL,
    profile_views INTEGER DEFAULT 0,
    direction_requests INTEGER DEFAULT 0,
    phone_calls INTEGER DEFAULT 0,
    new_reviews INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0,
    posts_published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(week_start)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_reviews (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    energy INTEGER CHECK(energy BETWEEN 1 AND 5),
    wins TEXT,
    lessons TEXT,
    tomorrow_focus TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    task_title TEXT,
    duration_min INTEGER DEFAULT 25,
    completed INTEGER DEFAULT 0,
    started_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS kb_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    source_url TEXT,
    source_type TEXT DEFAULT 'note',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS kb_fts USING fts5(title, content, content=kb_documents, content_rowid=rowid)`,
  `ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0`,
  `ALTER TABLE habits ADD COLUMN sort_order INTEGER DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS finance_transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    type TEXT CHECK(type IN ('income','expense')),
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    client TEXT,
    is_personal INTEGER DEFAULT 0,
    receipt_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS budget_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    monthly_limit REAL NOT NULL,
    color TEXT DEFAULT '#0071E3',
    icon TEXT,
    active INTEGER DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS budget_spending (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES budget_categories(id),
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    spent REAL DEFAULT 0,
    alerted INTEGER DEFAULT 0,
    UNIQUE(category_id, month, year)
  )`,
  // Goals
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    timeframe TEXT DEFAULT 'monthly',
    target_date TEXT,
    category TEXT,
    color TEXT DEFAULT '#0071E3',
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS goal_steps (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id),
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS goal_habits (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id),
    habit_id TEXT NOT NULL REFERENCES habits(id)
  )`,
  // Books
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    genre TEXT,
    status TEXT DEFAULT 'want_to_read',
    total_pages INTEGER DEFAULT 0,
    current_page INTEGER DEFAULT 0,
    rating INTEGER,
    cover_url TEXT,
    start_date TEXT,
    finish_date TEXT,
    notes_summary TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS book_notes (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id),
    chapter TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'note',
    page INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Notification settings
  `CREATE TABLE IF NOT EXISTS notification_settings (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    enabled INTEGER DEFAULT 1,
    time_offset_minutes INTEGER DEFAULT 0
  )`,
  // Google Calendar sync
  `CREATE TABLE IF NOT EXISTS google_calendar_events (
    id TEXT PRIMARY KEY,
    google_event_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_all_day INTEGER DEFAULT 0,
    calendar_id TEXT DEFAULT 'primary',
    color_id TEXT,
    html_link TEXT,
    synced_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `ALTER TABLE schedule_blocks ADD COLUMN date TEXT`,
  `ALTER TABLE schedule_blocks ADD COLUMN recurrence TEXT`,
  `ALTER TABLE schedule_blocks ADD COLUMN recurrence_end_date TEXT`,
  `ALTER TABLE schedule_blocks ADD COLUMN is_all_day INTEGER DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS journal_photos (
    id TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL REFERENCES journal_entries(date),
    photo_data TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `ALTER TABLE journal_entries ADD COLUMN prompts_answered TEXT`,
  `CREATE TABLE IF NOT EXISTS event_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    block_type TEXT,
    color TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0
  )`,
]

async function runMigrations() {
  for (const sql of migrations) {
    try {
      run(sql)
    } catch (e) {
      // Only silently skip ALTER TABLE ADD COLUMN failures (column already exists)
      if (e.message && e.message.includes('duplicate column')) continue
      console.error('Migration error:', e.message, '| SQL:', sql.substring(0, 80))
    }
  }
}

module.exports = { runMigrations }
