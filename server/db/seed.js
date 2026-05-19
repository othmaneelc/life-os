const { run, get, query } = require('./database')
const { v4: uuidv4 } = require('uuid')

function shouldSeed() {
  const count = get('SELECT COUNT(*) as count FROM settings')
  return count.count === 0
}

function seed() {
  if (!shouldSeed()) return

  const id = (p) => p

  // Settings
  const defaultSettings = [
    ['city', 'Casablanca'],
    ['country', 'Morocco'],
    ['prayer_method', '2'],
    ['obsidian_path', '~/Documents/ObsidianVault'],
    ['user_name', 'Othmane Elcaidi'],
    ['agency_name', 'MIX AGENCI'],
  ]
  for (const [key, value] of defaultSettings) {
    run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value])
  }

  // Habits
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

  // Tasks
  const tasks = [
    { title: 'Prepare CDZ renewal pitch — raise price or repackage offer', category: 'urgent', tag: 'CDZ', priority: 'high' },
    { title: 'Make HVAC cold calls — minimum 5 per day', category: 'urgent', tag: 'HVAC', priority: 'high' },
    { title: 'Build Hormozi reputation script for lead magnet', category: 'urgent', tag: 'HVAC', priority: 'high' },
    { title: 'Write CDZ Month 3 report before June 3', category: 'urgent', tag: 'CDZ', priority: 'high' },
    { title: 'Finish CDZ May content posts in NanoBanana Pro', category: 'business', tag: 'CDZ', priority: 'medium' },
    { title: 'Build "CREATE-SOP-REVIEW-POSTING-TEMPLATE" PDF', category: 'business', tag: 'Agency', priority: 'medium' },
    { title: 'Research HVAC lead list — add 50 new contacts', category: 'business', tag: 'HVAC', priority: 'medium' },
    { title: 'Set up GoHighLevel account + pipeline', category: 'business', tag: 'Agency', priority: 'low' },
    { title: 'Record a cold call and review it within 24h', category: 'business', tag: 'HVAC', priority: 'medium' },
    { title: 'Post on personal brand (X or TikTok)', category: 'personal', tag: 'Brand', priority: 'medium' },
    { title: 'Read 20 pages today', category: 'personal', tag: 'Self', priority: 'low' },
    { title: 'Update Substack TechAI newsletter', category: 'personal', tag: 'Brand', priority: 'low' },
    { title: 'Plan content calendar for personal brand', category: 'personal', tag: 'Brand', priority: 'medium' },
  ]
  for (const t of tasks) {
    run('INSERT INTO tasks (id, title, category, tag, priority, status) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), t.title, t.category, t.tag, t.priority, 'todo'])
  }

  // CDZ Client
  run(`INSERT INTO clients (id, name, contact_name, phone1, phone2, email, website, instagram, facebook, address,
    contract_start, contract_end, setup_fee, monthly_retainer, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), 'Centre Dentaire Zahir (CDZ)', 'Dr. Mohamed Amine Zahir',
      '07 72 15 34 77', '05 22 58 06 33', 'dr.zahir.mohamedamine@gmail.com',
      'https://dr-zahir.vercel.app/', '@centre_dentaire_zahir', 'Centre Dentaire ZAHIR',
      'Etage n°1, N°101 Angle Bd.Qods & Bd.Cadi Ayad, Sidi Maarouf, Casablanca 20150',
      '2026-03-03', '2026-06-03', 2000, 1000, 'active',
      'NanoBanana Pro. Primary: #F9E800. Artistic: #C9A84C. Brand: Royal Blue #0B5FBF, Deep Navy #080F2A, Cyan #00B0E8, White #FFFFFF'])

  // Revenue
  const revenues = [
    { month: 'March', year: 2026, revenue_mad: 3000, expenses_mad: 0, notes: 'Setup fee + March retainer' },
    { month: 'April', year: 2026, revenue_mad: 1000, expenses_mad: 0, notes: 'April retainer' },
    { month: 'May', year: 2026, revenue_mad: 1000, expenses_mad: 0, notes: 'May retainer' },
  ]
  for (const r of revenues) {
    run('INSERT INTO revenue (id, month, year, revenue_mad, expenses_mad, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), r.month, r.year, r.revenue_mad, r.expenses_mad, r.notes])
  }

  // Schedule blocks
  const blocks = [
    { start: '05:00', end: '05:20', title: 'Fajr', subtitle: '', type: 'Prayer', color: '#34C759' },
    { start: '05:20', end: '05:45', title: 'Quran / Dhikr', subtitle: '', type: 'Faith', color: '#34C759' },
    { start: '05:45', end: '08:00', title: 'Sleep / Rest', subtitle: '', type: 'Rest', color: '#8E8E93' },
    { start: '08:00', end: '09:00', title: 'Calisthenics', subtitle: 'Morning workout', type: 'Training', color: '#FF3B30' },
    { start: '09:00', end: '09:30', title: 'Morning reset', subtitle: 'Shower, get ready, set intentions', type: 'Personal', color: '#8E8E93' },
    { start: '09:30', end: '11:30', title: 'Deep Work Block 1', subtitle: 'CDZ content, posts, reporting', type: 'Work', color: '#0071E3' },
    { start: '11:30', end: '12:00', title: 'Dhuhr', subtitle: '', type: 'Prayer', color: '#34C759' },
    { start: '12:00', end: '13:30', title: 'HVAC Cold Outreach', subtitle: 'Calls + DMs. Log count. US morning = your afternoon.', type: 'Agency', color: '#FF9F0A' },
    { start: '13:30', end: '14:30', title: 'Lunch break', subtitle: '', type: 'Rest', color: '#8E8E93' },
    { start: '14:30', end: '16:00', title: 'Deep Work Block 2', subtitle: 'Agency systems, offers, lead magnet, sales prep', type: 'Work', color: '#0071E3' },
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
}

module.exports = { seed }
