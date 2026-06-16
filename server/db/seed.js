const { run, get, query } = require('./database')
const { v4: uuidv4 } = require('uuid')
const logger = require('../services/logger')

function shouldSeed() {
  try {
    const count = get('SELECT COUNT(*) as count FROM settings')
    return count.count === 0
  } catch (e) {
    return true
  }
}

function seed() {
  if (!shouldSeed()) {
    logger.info('Database already seeded — skipping')
    return
  }
  logger.info('Seeding database...')

  // ─── Settings ────────────────────────────────────────────
  const defaultSettings = [
    ['city', 'Casablanca'],
    ['country', 'Morocco'],
    ['prayer_method', '2'],
    ['obsidian_path', '~/Documents/ObsidianVault'],
    ['user_name', 'Othmane Elcaidi'],
    ['agency_name', 'MIX AGENCI'],
    ['theme', 'dark'],
    ['language', 'en'],
  ]
  for (const [key, value] of defaultSettings) {
    run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value])
  }

  // ─── Habits ──────────────────────────────────────────────
  const habits = [
    { id: 'h1', name: 'Fajr on time', category: 'Faith', frequency: 'daily', sort_order: 1 },
    { id: 'h2', name: 'All 5 prayers', category: 'Faith', frequency: 'daily', sort_order: 2 },
    { id: 'h3', name: 'Quran (min. 1 page)', category: 'Faith', frequency: 'daily', sort_order: 3 },
    { id: 'h4', name: 'Calisthenics training', category: 'Fitness', frequency: 'daily', sort_order: 4 },
    { id: 'h5', name: 'Cold outreach (calls or DMs)', category: 'Agency', frequency: 'weekday', sort_order: 5 },
    { id: 'h6', name: 'NoFap', category: 'Discipline', frequency: 'daily', sort_order: 6 },
    { id: 'h7', name: 'Dopamine detox', category: 'Discipline', frequency: 'daily', sort_order: 7 },
    { id: 'h8', name: 'Read 20 pages', category: 'Learning', frequency: 'daily', sort_order: 8 },
    { id: 'h9', name: 'Daily review (Muhasaba)', category: 'Faith', frequency: 'daily', sort_order: 9 },
    { id: 'h10', name: 'Sleep before 23:00', category: 'Health', frequency: 'daily', sort_order: 10 },
    { id: 'h11', name: 'No phone first 30 min', category: 'Health', frequency: 'daily', sort_order: 11 },
  ]
  for (const h of habits) {
    run('INSERT OR IGNORE INTO habits (id, name, category, frequency, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)',
      [h.id, h.name, h.category, h.frequency, h.sort_order])
  }

  // ─── Habit Logs (last 7 days) ────────────────────────────
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

    for (const h of habits) {
      if (h.frequency === 'weekday' && !isWeekday) continue
      const done = Math.random() > 0.25 ? 1 : 0
      run('INSERT OR IGNORE INTO habit_logs (id, habit_id, date, done) VALUES (?, ?, ?, ?)',
        [uuidv4(), h.id, dateStr, done])
    }
  }

  // ─── Tasks ────────────────────────────────────────────────
  const tasks = [
    { title: 'Prepare CDZ renewal pitch — raise price or repackage offer', category: 'urgent', tag: 'CDZ', priority: 'high', status: 'inprogress' },
    { title: 'Make HVAC cold calls — minimum 5 per day', category: 'urgent', tag: 'HVAC', priority: 'high', status: 'todo' },
    { title: 'Build Hormozi reputation script for lead magnet', category: 'urgent', tag: 'HVAC', priority: 'high', status: 'todo' },
    { title: 'Write CDZ Month 3 report before June 3', category: 'urgent', tag: 'CDZ', priority: 'high', status: 'todo' },
    { title: 'Finish CDZ May content posts in NanoBanana Pro', category: 'business', tag: 'CDZ', priority: 'medium', status: 'inprogress' },
    { title: 'Build CREATE-SOP-REVIEW-POSTING-TEMPLATE PDF', category: 'business', tag: 'Agency', priority: 'medium', status: 'todo' },
    { title: 'Research HVAC lead list — add 50 new contacts', category: 'business', tag: 'HVAC', priority: 'medium', status: 'todo' },
    { title: 'Set up GoHighLevel account + pipeline', category: 'business', tag: 'Agency', priority: 'low', status: 'todo' },
    { title: 'Record a cold call and review it within 24h', category: 'business', tag: 'HVAC', priority: 'medium', status: 'todo' },
    { title: 'Post on personal brand (X or TikTok)', category: 'personal', tag: 'Brand', priority: 'medium', status: 'done' },
    { title: 'Read 20 pages today', category: 'personal', tag: 'Self', priority: 'low', status: 'done' },
    { title: 'Update Substack TechAI newsletter', category: 'personal', tag: 'Brand', priority: 'low', status: 'todo' },
    { title: 'Plan content calendar for personal brand', category: 'personal', tag: 'Brand', priority: 'medium', status: 'todo' },
  ]
  for (const t of tasks) {
    run('INSERT INTO tasks (id, title, category, tag, priority, status, is_top_priority, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), t.title, t.category, t.tag, t.priority, t.status, t.priority === 'high' ? 1 : 0, 0])
  }

  // ─── Schedule Blocks ──────────────────────────────────────
  const blocks = [
    { start: '05:00', end: '05:20', title: 'Fajr', subtitle: '', type: 'Prayer', color: '#34C759' },
    { start: '05:20', end: '05:45', title: 'Quran / Dhikr', subtitle: '', type: 'Faith', color: '#34C759' },
    { start: '05:45', end: '08:00', title: 'Sleep / Rest', subtitle: '', type: 'Rest', color: '#8E8E93' },
    { start: '08:00', end: '09:00', title: 'Calisthenics', subtitle: 'Morning workout', type: 'Training', color: '#FF3B30' },
    { start: '09:00', end: '09:30', title: 'Morning reset', subtitle: 'Shower, get ready, set intentions', type: 'Personal', color: '#8E8E93' },
    { start: '09:30', end: '11:30', title: 'Deep Work Block 1', subtitle: 'CDZ content, posts, reporting', type: 'Work', color: '#0071E3' },
    { start: '11:30', end: '12:00', title: 'Dhuhr', subtitle: '', type: 'Prayer', color: '#34C759' },
    { start: '12:00', end: '13:30', title: 'HVAC Cold Outreach', subtitle: 'Calls + DMs. Log count.', type: 'Agency', color: '#FF9F0A' },
    { start: '13:30', end: '14:30', title: 'Lunch break', subtitle: '', type: 'Rest', color: '#8E8E93' },
    { start: '14:30', end: '16:00', title: 'Deep Work Block 2', subtitle: 'Agency systems, offers, lead magnet', type: 'Work', color: '#0071E3' },
    { start: '16:00', end: '16:30', title: 'Asr', subtitle: '', type: 'Prayer', color: '#34C759' },
    { start: '16:30', end: '18:30', title: 'Content Creation', subtitle: 'TikTok, YouTube, X, Substack', type: 'Brand', color: '#AF52DE' },
    { start: '18:30', end: '19:00', title: 'Maghrib', subtitle: '', type: 'Prayer', color: '#34C759' },
    { start: '19:00', end: '20:00', title: 'Family time / Break', subtitle: '', type: 'Personal', color: '#8E8E93' },
    { start: '20:00', end: '20:30', title: 'Isha', subtitle: '', type: 'Prayer', color: '#34C759' },
    { start: '20:30', end: '21:30', title: 'Learning / Wind down', subtitle: 'Read 20 pages, study, review notes', type: 'Learning', color: '#AF52DE' },
    { start: '21:30', end: '22:00', title: 'Daily Review (Muhasaba)', subtitle: 'Self-accounting, journal', type: 'Reflection', color: '#AF52DE' },
    { start: '22:00', end: '23:00', title: 'Prepare tomorrow', subtitle: 'Plan next day, set priorities', type: 'Planning', color: '#0071E3' },
    { start: '23:00', end: '05:00', title: 'Sleep — hard target', subtitle: '', type: 'Rest', color: '#8E8E93' },
  ]
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    run('INSERT INTO schedule_blocks (id, day_of_week, start_time, end_time, title, subtitle, block_type, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), 'all', b.start, b.end, b.title, b.subtitle, b.type, b.color, i + 1])
  }

  // ─── Journal Entries ──────────────────────────────────────
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const entries = [
    {
      date: twoDaysAgo.toISOString().split('T')[0],
      mood: 4,
      what_happened: 'Solid deep work session on CDZ content. Finished the Instagram carousel draft. Made 8 HVAC calls — 3 pickups, 1 interested. Hit calisthenics PR on pull-ups.',
      gratitude: 'Grateful for another day of health. Thankful for Dr. Zahir trusting me with his brand. Glad I stayed disciplined with Fajr.',
      muhasaba: 'Spent too much time scrolling after Isha. Could have read instead. Need to cut phone time post-Maghrib.',
      tomorrow_intention: 'Finish CDZ report draft. 10 HVAC calls minimum. Read 20 pages before bed.',
      tags: 'work,agency,fitness',
    },
    {
      date: yesterday.toISOString().split('T')[0],
      mood: 3,
      what_happened: 'Tough day — CDZ report took longer than expected. Only 5 HVAC calls (low energy). Did manage to hit the gym and read 15 pages. Fajr was late.',
      gratitude: 'Grateful for the flexibility of freelancing. For my health. For the opportunity to build something real with MIX AGENCI.',
      muhasaba: 'Missed Fajr on time again. Sleep schedule is slipping. Need to be in bed by 22:30 no excuses. Energy was low — probably the late night.',
      tomorrow_intention: 'Fajr on time. 10 HVAC calls. Finish that CDZ report no matter what.',
      tags: 'struggle,faith,agency',
    },
  ]
  for (const e of entries) {
    run('INSERT OR IGNORE INTO journal_entries (id, date, mood, what_happened, gratitude, muhasaba, tomorrow_intention, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), e.date, e.mood, e.what_happened, e.gratitude, e.muhasaba, e.tomorrow_intention, e.tags])
  }

  // ─── Prayers (today — all done on time) ────────────────────
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
  const todayStr = today.toISOString().split('T')[0]
  for (const name of prayers) {
    run('INSERT OR IGNORE INTO prayers (id, date, prayer_name, done, on_time) VALUES (?, ?, ?, 1, 1)',
      [uuidv4(), todayStr, name])
  }

  // ─── CDZ Client ───────────────────────────────────────────
  const clientId = uuidv4()
  run(`INSERT INTO clients (id, name, contact_name, phone1, phone2, email, website, instagram, facebook, address,
    contract_start, contract_end, setup_fee, monthly_retainer, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [clientId, 'Centre Dentaire Zahir (CDZ)', 'Dr. Mohamed Amine Zahir',
      '07 72 15 34 77', '05 22 58 06 33', 'dr.zahir.mohamedamine@gmail.com',
      'https://dr-zahir.vercel.app/', '@centre_dentaire_zahir', 'Centre Dentaire ZAHIR',
      'Etage n°1, N°101 Angle Bd.Qods & Bd.Cadi Ayad, Sidi Maarouf, Casablanca 20150',
      '2026-03-03', '2026-06-03', 2000, 1000, 'active',
      'NanoBanana Pro. Colors: #F9E800 / #C9A84C / #0B5FBF / #080F2A / #00B0E8 / #FFFFFF'])

  // ─── Revenue ──────────────────────────────────────────────
  const revenues = [
    { month: 'March', year: 2026, revenue_mad: 3000, expenses_mad: 0, notes: 'Setup fee + March retainer' },
    { month: 'April', year: 2026, revenue_mad: 1000, expenses_mad: 200, notes: 'April retainer — Canva subscription' },
    { month: 'May', year: 2026, revenue_mad: 1000, expenses_mad: 150, notes: 'May retainer — hosting + tools' },
  ]
  for (const r of revenues) {
    run('INSERT OR IGNORE INTO revenue (id, month, year, revenue_mad, expenses_mad, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), r.month, r.year, r.revenue_mad, r.expenses_mad, r.notes])
  }

  // ─── Prospects ────────────────────────────────────────────
  const prospects = [
    { company_name: 'ClimPro Casablanca', contact_name: 'Youssef Benali', phone: '06 12 34 56 78', state: 'Casablanca', status: 'call_booked', notes: 'Met at HVAC expo. Interested in Instagram management.', next_action: 'Send proposal by Friday' },
    { company_name: 'Atlantic Froid', contact_name: 'Karim Naji', phone: '06 98 76 54 32', state: 'Rabat', status: 'new_lead', notes: 'Cold DM on Instagram. He liked our CDZ work.', next_action: 'Follow up in 3 days' },
    { company_name: 'SOS Climatisation', contact_name: 'Hicham El Fassi', phone: '07 11 22 33 44', state: 'Casablanca', status: 'proposal_sent', notes: 'Sent pricing package. Following up.', next_action: 'Call Thursday morning' },
  ]
  for (const p of prospects) {
    run('INSERT INTO prospects (id, company_name, contact_name, phone, state, status, notes, next_action) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), p.company_name, p.contact_name, p.phone, p.state, p.status, p.notes, p.next_action])
  }

  // ─── Outreach Log ─────────────────────────────────────────
  for (let i = 4; i >= 2; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const dateStr = d.toISOString().split('T')[0]
    run('INSERT OR IGNORE INTO outreach_log (id, date, calls_made, dms_sent, responses, meetings_booked, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), dateStr, 6 + Math.floor(Math.random() * 5), 4 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 3), Math.random() > 0.7 ? 1 : 0, 'Outreach block'])
  }

  // ─── Daily Reviews ────────────────────────────────────────
  const reviews = [
    { date: twoDaysAgo.toISOString().split('T')[0], energy: 4, wins: 'Finished CDZ carousel draft, 8 HVAC calls, pull-up PR', lessons: 'Scrolling after Isha kills productivity. Cut it.', tomorrow_focus: 'CDZ report, 10 calls, 20 pages', completed: 1 },
    { date: yesterday.toISOString().split('T')[0], energy: 3, wins: 'Pushed through low energy day, still got work done', lessons: 'Late sleep = missed Fajr = low energy whole day. Sleep is non-negotiable.', tomorrow_focus: 'Fajr on time, CDZ report done, 10 calls', completed: 1 },
  ]
  for (const r of reviews) {
    run('INSERT OR IGNORE INTO daily_reviews (id, date, energy, wins, lessons, tomorrow_focus, completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), r.date, r.energy, r.wins, r.lessons, r.tomorrow_focus, r.completed])
  }

  // ─── Pomodoro Sessions ────────────────────────────────────
  const pomodoros = [
    { date: twoDaysAgo.toISOString().split('T')[0], task_title: 'CDZ Instagram carousel', duration_min: 25, completed: 1 },
    { date: twoDaysAgo.toISOString().split('T')[0], task_title: 'CDZ Instagram carousel', duration_min: 25, completed: 1 },
    { date: twoDaysAgo.toISOString().split('T')[0], task_title: 'HVAC prospect research', duration_min: 25, completed: 1 },
    { date: yesterday.toISOString().split('T')[0], task_title: 'CDZ Month 3 report', duration_min: 25, completed: 1 },
  ]
  for (const p of pomodoros) {
    run('INSERT INTO pomodoro_sessions (id, date, task_title, duration_min, completed, started_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), p.date, p.task_title, p.duration_min, p.completed, new Date().toISOString()])
  }

  // ─── Finance Transactions ─────────────────────────────────
  const transactions = [
    { date: '2026-05-01', type: 'income', category: 'Retainer', amount: 1000, description: 'CDZ May retainer', client: 'CDZ', is_personal: 0 },
    { date: '2026-05-05', type: 'expense', category: 'Software', amount: 49, description: 'Canva Pro monthly', client: '', is_personal: 0 },
    { date: '2026-05-10', type: 'income', category: 'Freelance', amount: 200, description: 'One-off content edit', client: 'Other', is_personal: 0 },
    { date: '2026-05-12', type: 'expense', category: 'Personal', amount: 120, description: 'Groceries', client: '', is_personal: 1 },
  ]
  for (const t of transactions) {
    run('INSERT INTO finance_transactions (id, date, type, category, amount, description, client, is_personal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), t.date, t.type, t.category, t.amount, t.description, t.client, t.is_personal])
  }

  // ─── Budget Categories ──────────────────────────────────
  const budgetCategories = [
    { name: 'Marketing', monthly_limit: 500, color: '#FF9F0A', icon: 'megaphone' },
    { name: 'Software', monthly_limit: 100, color: '#0071E3', icon: 'monitor' },
    { name: 'Freelance Tools', monthly_limit: 200, color: '#AF52DE', icon: 'wrench' },
    { name: 'Personal', monthly_limit: 300, color: '#34C759', icon: 'user' },
  ]
  for (const bc of budgetCategories) {
    const bcId = uuidv4()
    run('INSERT INTO budget_categories (id, name, monthly_limit, color, icon) VALUES (?, ?, ?, ?, ?)',
      [bcId, bc.name, bc.monthly_limit, bc.color, bc.icon])
    run('INSERT OR IGNORE INTO budget_spending (id, category_id, month, year, spent, alerted) VALUES (?, ?, ?, ?, ?, 0)',
      [uuidv4(), bcId, 'May', 2026, Math.floor(Math.random() * bc.monthly_limit * 0.6)])
  }

  // ─── Goals ────────────────────────────────────────────────
  const goals = [
    {
      id: 'goal-1',
      title: 'Scale MIX AGENCI to $10K/month',
      description: 'Sign 5 HVAC clients, retain CDZ, build content engine',
      timeframe: 'quarterly',
      target_date: '2026-09-01',
      category: 'Business',
      color: '#0071E3',
      steps: [
        'Close 3 HVAC prospects from current pipeline',
        'Build case study from CDZ results',
        'Create lead magnet: HVAC Instagram Audit PDF',
      ],
    },
    {
      id: 'goal-2',
      title: 'Fix sleep & Fajr consistency',
      description: 'Sleep by 22:30, Fajr on time every day for 30 days straight',
      timeframe: 'monthly',
      target_date: '2026-06-30',
      category: 'Faith',
      color: '#34C759',
      steps: [
        'No phone after 21:30',
        'In bed by 22:30',
        '30-day Fajr streak',
      ],
    },
  ]
  for (const g of goals) {
    run('INSERT OR IGNORE INTO goals (id, title, description, timeframe, target_date, category, color, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [g.id, g.title, g.description, g.timeframe, g.target_date, g.category, g.color, 1])
    for (let i = 0; i < g.steps.length; i++) {
      run('INSERT INTO goal_steps (id, goal_id, title, sort_order, done) VALUES (?, ?, ?, ?, 0)',
        [uuidv4(), g.id, g.steps[i], i + 1])
    }
  }

  // ─── Books ────────────────────────────────────────────────
  const books = [
    { title: '$100M Offers', author: 'Alex Hormozi', genre: 'Business', total_pages: 192, current_page: 87, cover_url: '', status: 'reading', sort_order: 1 },
    { title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Development', total_pages: 320, current_page: 0, cover_url: '', status: 'want_to_read', sort_order: 2 },
  ]
  for (const b of books) {
    const bookId = uuidv4()
    run('INSERT INTO books (id, title, author, genre, total_pages, current_page, cover_url, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [bookId, b.title, b.author, b.genre, b.total_pages, b.current_page, b.cover_url, b.status, b.sort_order])
    if (b.status === 'reading') {
      run('INSERT INTO book_notes (id, book_id, chapter, content, type, page) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), bookId, 'Chapter 3', 'The key insight is that you need to stack value — don\'t just offer one thing, offer a transformation.', 'note', 45])
    }
  }

  // ─── Knowledge Base ──────────────────────────────────────
  const kbDocs = [
    { title: 'CDZ Brand Guidelines', content: '## CDZ Brand Identity\n\n**Primary:** #F9E800 (Yellow)\n**Artistic:** #C9A84C (Gold)\n**Royal Blue:** #0B5FBF\n**Deep Navy:** #080F2A\n**Cyan:** #00B0E8\n**White:** #FFFFFF\n\n### Voice & Tone\n- Professional yet warm\n- French & Arabic mix\n- Trust signals: diplomas, experience, technology\n\n### Content Pillars\n1. Before/After transformations\n2. Dental education\n3. Patient testimonials\n4. Behind the scenes\n5. Team spotlights', source_url: '', source_type: 'note' },
    { title: 'HVAC Cold Call Script', content: '## HVAC Cold Call Script\n\n**Opening:** "Bonjour [name], c\'est Othmane de MIX AGENCI. Je vous appelle parce qu\'on a vu que vous faites de la climatisation à Casablanca et j\'ai une idée pour vous amener plus de clients via Instagram."\n\n**Value Prop:** "On a aidé un centre dentaire à Sidi Maarouf à tripler leurs rendez-vous via Instagram en 2 mois."\n\n**Objection Handling:** "Je comprends. Est-ce que je peux vous envoyer un exemple de ce qu\'on a fait?"\n\n**Close:** "Quand est-ce que vous avez 15 minutes pour qu\'on en parle?"', source_url: '', source_type: 'note' },
  ]
  for (const doc of kbDocs) {
    run('INSERT INTO kb_documents (id, title, content, source_url, source_type) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), doc.title, doc.content, doc.source_url, doc.source_type])
  }

  // ─── Event Templates ──────────────────────────────────────
  const templates = [
    { name: 'Deep Work Session', title: 'Deep Work', start_time: '09:30', end_time: '11:30', block_type: 'Work', color: '#0071E3', icon: 'zap', sort_order: 1 },
    { name: 'HVAC Outreach', title: 'HVAC Cold Outreach', start_time: '12:00', end_time: '13:30', block_type: 'Agency', color: '#FF9F0A', icon: 'phone', sort_order: 2 },
    { name: 'Daily Review', title: 'Daily Review (Muhasaba)', start_time: '21:30', end_time: '22:00', block_type: 'Reflection', color: '#AF52DE', icon: 'file-text', sort_order: 3 },
  ]
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i]
    run('INSERT INTO event_templates (id, name, title, start_time, end_time, block_type, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), t.name, t.title, t.start_time, t.end_time, t.block_type, t.color, t.icon, t.sort_order])
  }

  // ─── Notification Settings ────────────────────────────────
  const notifTypes = [
    { type: 'prayer_reminder', enabled: 1, time_offset: 5 },
    { type: 'task_due', enabled: 1, time_offset: 15 },
    { type: 'habit_reminder', enabled: 1, time_offset: 0 },
    { type: 'daily_review', enabled: 1, time_offset: 0 },
    { type: 'daily_briefing', enabled: 1, time_offset: 0 },
    { type: 'weekly_report', enabled: 1, time_offset: 0 },
    { type: 'pattern_alert', enabled: 1, time_offset: 0 },
    { type: 'motivational', enabled: 0, time_offset: 0 },
  ]
  for (const n of notifTypes) {
    run('INSERT OR IGNORE INTO notification_settings (id, type, enabled, time_offset_minutes) VALUES (?, ?, ?, ?)',
      [uuidv4(), n.type, n.enabled, n.time_offset])
  }

  logger.info('Database seeded successfully')
}

module.exports = { seed }
