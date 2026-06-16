const { run, query, get } = require('./database')
const logger = require('../services/logger')

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
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  // Identities
  `CREATE TABLE IF NOT EXISTS identities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    focus_areas TEXT DEFAULT '[]',
    accent_color TEXT DEFAULT '#5B5BD6',
    theme TEXT DEFAULT 'dark',
    active INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Notification settings
  `CREATE TABLE IF NOT EXISTS notification_settings (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    enabled INTEGER DEFAULT 1,
    time_offset_minutes INTEGER DEFAULT 0
  )`,
  // Vault
  `CREATE TABLE IF NOT EXISTS vault_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body_encrypted TEXT NOT NULL,
    body_iv TEXT NOT NULL,
    body_tag TEXT NOT NULL,
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS vault_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  // Conversations (persistent AI chat history)
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    action_results TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at)`,
  // AI Long-term Memory
  `CREATE TABLE IF NOT EXISTS ai_memories (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK(category IN ('preference','fact','routine','goal','relationship','event','emotion')),
    content TEXT NOT NULL,
    source TEXT,
    importance INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    last_referenced TEXT,
    reference_count INTEGER DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_memories_category ON ai_memories(category)`,
  `CREATE INDEX IF NOT EXISTS idx_memories_importance ON ai_memories(importance DESC)`,
  // Push subscriptions
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
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
  // Sleep tracking
  `CREATE TABLE IF NOT EXISTS sleep_logs (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    bedtime TEXT,
    wake_time TEXT,
    duration_min INTEGER,
    quality INTEGER CHECK(quality BETWEEN 1 AND 5),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Workouts / Fitness
  `CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    duration_min INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    sets INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,
    weight_kg REAL DEFAULT 0,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
  )`,
  // Travel
  `CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    destination TEXT,
    start_date TEXT,
    end_date TEXT,
    budget REAL DEFAULT 0,
    status TEXT CHECK(status IN ('planned','ongoing','completed','cancelled')) DEFAULT 'planned',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS trip_expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    category TEXT,
    amount REAL NOT NULL,
    description TEXT,
    date TEXT
  )`,
  // Relationships
  `CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    relationship_type TEXT CHECK(relationship_type IN ('family','friend','colleague','mentor','other')) DEFAULT 'other',
    birthday TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    last_contact TEXT,
    importance INTEGER CHECK(importance BETWEEN 1 AND 5) DEFAULT 3,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Voice inbox
  `CREATE TABLE IF NOT EXISTS voice_inbox (
    id TEXT PRIMARY KEY,
    transcript TEXT NOT NULL,
    actions_json TEXT NOT NULL,
    natural_summary TEXT,
    client_date TEXT,
    client_timezone TEXT,
    risk_level TEXT DEFAULT 'low',
    status TEXT DEFAULT 'pending',
    executed_at TEXT,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Webhook audit log
  `CREATE TABLE IF NOT EXISTS webhook_log (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    action TEXT,
    payload_json TEXT,
    status TEXT,
    result_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Debts / Loans
  `CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN ('lent','borrowed')) NOT NULL,
    person_name TEXT NOT NULL,
    amount REAL NOT NULL,
    remaining REAL NOT NULL,
    interest_rate REAL DEFAULT 0,
    due_date TEXT,
    status TEXT CHECK(status IN ('active','paid','written_off')) DEFAULT 'active',
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // CDZ Agency Service Delivery Module
  `CREATE TABLE IF NOT EXISTS cdz_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    topic TEXT,
    content_pillar TEXT CHECK(content_pillar IN ('Education','Trust','Promotion','Engagement','Seasonal')),
    post_type TEXT NOT NULL CHECK(post_type IN ('Carousel','Reel','Single Image','Story')),
    platform TEXT NOT NULL CHECK(platform IN ('Facebook','Instagram','Both')),
    status TEXT NOT NULL DEFAULT 'Idea' CHECK(status IN ('Idea','In Production','Ready for Review','Approved','Posted','Archived')),
    priority TEXT DEFAULT 'Normal' CHECK(priority IN ('Low','Normal','High','Urgent')),
    scheduled_date TEXT,
    posted_date TEXT,
    facebook_caption TEXT,
    instagram_caption TEXT,
    hashtags TEXT,
    design_notes TEXT,
    performance_reach INTEGER DEFAULT 0,
    performance_likes INTEGER DEFAULT 0,
    performance_comments INTEGER DEFAULT 0,
    performance_saves INTEGER DEFAULT 0,
    performance_shares INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS cdz_checklist_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    section TEXT NOT NULL CHECK(section IN ('Research','Design','Caption','Approval','Posting')),
    step_key TEXT NOT NULL,
    step_label TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT,
    FOREIGN KEY (post_id) REFERENCES cdz_posts(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS cdz_comms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('WhatsApp','Meeting','Call','Email')),
    summary TEXT NOT NULL,
    action_item TEXT,
    action_status TEXT DEFAULT 'Pending' CHECK(action_status IN ('Pending','Done','Not Needed')),
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS cdz_monthly_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    fb_views INTEGER DEFAULT 0,
    fb_reach INTEGER DEFAULT 0,
    fb_new_followers INTEGER DEFAULT 0,
    fb_top_post TEXT,
    ig_views INTEGER DEFAULT 0,
    ig_reach INTEGER DEFAULT 0,
    ig_new_followers INTEGER DEFAULT 0,
    ig_saves INTEGER DEFAULT 0,
    ig_top_post TEXT,
    reels_views INTEGER DEFAULT 0,
    reels_shares INTEGER DEFAULT 0,
    total_posts_published INTEGER DEFAULT 0,
    notes TEXT,
    goals_next_month TEXT,
    UNIQUE(month, year)
  )`,
  `CREATE TABLE IF NOT EXISTS cdz_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    content_pillar TEXT,
    post_type TEXT,
    source TEXT,
    priority INTEGER DEFAULT 0,
    converted_to_post INTEGER DEFAULT 0,
    converted_post_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Performance indexes
  `CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id)`,
  `CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date)`,
  `CREATE INDEX IF NOT EXISTS idx_habit_logs_done ON habit_logs(done)`,
  `CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(active)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_is_top_priority ON tasks(is_top_priority)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_tag ON tasks(tag)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)`,
  `ALTER TABLE tasks ADD COLUMN deleted_at TEXT DEFAULT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(date)`,
  `CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(type)`,
  `CREATE INDEX IF NOT EXISTS idx_cdz_posts_status ON cdz_posts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_cdz_posts_scheduled_date ON cdz_posts(scheduled_date)`,
  `CREATE INDEX IF NOT EXISTS idx_content_log_date ON content_log(date)`,
  `CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_blocks_day ON schedule_blocks(day_of_week)`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_sleep_logs_date ON sleep_logs(date)`,
  `CREATE INDEX IF NOT EXISTS idx_voice_inbox_status ON voice_inbox(status)`,
  `CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_date ON pomodoro_sessions(date)`,
  `CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date)`,
  `CREATE TABLE IF NOT EXISTS cdz_checklist_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL CHECK(section IN ('Research','Design','Caption','Approval','Posting')),
    step_key TEXT NOT NULL UNIQUE,
    step_label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  )`,
]

function ensureColumn(table, column, definition) {
  const cols = query('PRAGMA table_info(' + table + ')')
  if (!cols.find(c => c.name === column)) {
    run('ALTER TABLE ' + table + ' ADD COLUMN ' + definition)
  }
}

function runMigrations() {
  for (const sql of migrations) {
    try {
      run(sql)
    } catch (e) {
      if (e.message && e.message.includes('duplicate column')) continue
      logger.error({ err: e.message, sql: sql.substring(0, 80) }, 'Migration error')
    }
  }

  // Safely add columns that may be missing on older databases
  ensureColumn('tasks', 'sort_order', 'sort_order INTEGER DEFAULT 0')
  ensureColumn('habits', 'sort_order', 'sort_order INTEGER DEFAULT 0')
  ensureColumn('schedule_blocks', 'date', 'date TEXT')
  ensureColumn('schedule_blocks', 'recurrence', 'recurrence TEXT')
  ensureColumn('schedule_blocks', 'recurrence_end_date', 'recurrence_end_date TEXT')
  ensureColumn('schedule_blocks', 'is_all_day', 'is_all_day INTEGER DEFAULT 0')
  ensureColumn('journal_entries', 'prompts_answered', 'prompts_answered TEXT')
  ensureColumn('clients', 'contact_name', 'contact_name TEXT')
  ensureColumn('tasks', 'source', "source TEXT DEFAULT 'manual'")
  ensureColumn('tasks', 'recurrence', "recurrence TEXT")
  ensureColumn('finance_transactions', 'source', "source TEXT DEFAULT 'manual'")
  ensureColumn('workouts', 'source', "source TEXT DEFAULT 'manual'")

  // CDZ checklist template seed (once)
  const templateCount = get("SELECT COUNT(*) as cnt FROM cdz_checklist_templates")
  if (!templateCount || templateCount.cnt === 0) {
    const templates = [
      ['Research','topic_confirmed','Topic confirmed and fits a CDZ content pillar',1],
      ['Research','audience_identified','Target audience identified',2],
      ['Research','hook_written','Hook written — first line must stop the scroll',3],
      ['Research','core_message','Core message defined',4],
      ['Research','reference_notes','Reference posts or inspiration noted',5],
      ['Research','competitor_checked','Competitor content checked for this topic',6],
      ['Design','brief_written','Design brief written',7],
      ['Design','first_draft','First draft generated in NanoBanana Pro',8],
      ['Design','logo_present','CDZ logo present (not AI-generated)',9],
      ['Design','gold_accent_used','Gold accent #C9A84C used as primary color',10],
      ['Design','french_only','All text is in French only',11],
      ['Design','content_appropriate','Content is appropriate',12],
      ['Design','font_hierarchy','Font hierarchy is clear',13],
      ['Design','dimensions_correct','Dimensions correct',14],
      ['Design','revisions_done','Revisions complete',15],
      ['Design','final_exported','Final design exported and saved',16],
      ['Caption','fb_caption','Facebook caption written (long-form)',17],
      ['Caption','ig_caption','Instagram caption written (short + CTA)',18],
      ['Caption','captions_french','Both captions are in French only',19],
      ['Caption','hashtags_added','Hashtags added: 15 for IG, 5-7 for FB',20],
      ['Caption','hashtag_mix','Hashtags mix: broad + local + branded',21],
      ['Caption','spelling_checked','Caption reviewed — no spelling errors',22],
      ['Approval','sent_to_client','Post package sent to Dr. Zahir via WhatsApp',23],
      ['Approval','client_acknowledged','Dr. Zahir acknowledged receipt',24],
      ['Approval','feedback_received','Feedback received (note in comms log)',25],
      ['Approval','revisions_applied','Revisions applied if requested',26],
      ['Approval','final_approval','Final approval confirmed — status to Approved',27],
      ['Posting','scheduled_meta','Scheduled in Meta Business Suite',28],
      ['Posting','published_on_date','Published on scheduled date',29],
      ['Posting','status_updated','Status changed to Posted',30],
      ['Posting','perf_24h','24h performance check done',31],
      ['Posting','perf_logged','Performance numbers logged',32],
      ['Posting','top_content_noted','Top-performing content noted for strategy',33],
    ]
    for (const t of templates) {
      run(`INSERT OR IGNORE INTO cdz_checklist_templates (section,step_key,step_label,sort_order) VALUES (?,?,?,?)`, t)
    }
  }

  // CDZ historical seed (once)
  const seedCheck = get("SELECT COUNT(*) as cnt FROM cdz_monthly_results")
  if (!seedCheck || seedCheck.cnt === 0) {
    const seedData = [
      { month: 3, year: 2026, fb_views: 2860, ig_views: 4868, ig_new_followers: 16, total_posts_published: 8, notes: 'Month 1 — Contract start. Foundation phase.' },
      { month: 4, year: 2026, fb_views: 2860, ig_views: 4868, ig_new_followers: 16, total_posts_published: 9, notes: 'Month 2 — Consistency phase. No ads.' },
      { month: 5, year: 2026, fb_views: 2860, ig_views: 4868, ig_new_followers: 15, total_posts_published: 9, notes: 'Month 3 — Organic only. Contract renewal month.' },
    ]
    for (const d of seedData) {
      run(`INSERT OR IGNORE INTO cdz_monthly_results (month,year,fb_views,ig_views,ig_new_followers,total_posts_published,notes) VALUES (?,?,?,?,?,?,?)`,
        [d.month, d.year, d.fb_views, d.ig_views, d.ig_new_followers, d.total_posts_published, d.notes])
    }
  }
}

module.exports = { runMigrations }
