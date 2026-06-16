const { getDatabase, run, query } = require('./db/database')
const { runMigrations } = require('./db/migrations')
const { seed } = require('./db/seed')

try {
  getDatabase()
  runMigrations()
  seed()
  // Verify seed worked
  const tables = ['settings','habits','habit_logs','tasks','schedule_blocks','journal_entries','prayers','clients','revenue','prospects','outreach_log','daily_reviews','pomodoro_sessions','finance_transactions','budget_categories','budget_spending','goals','goal_steps','books','book_notes','kb_documents','event_templates','notification_settings']
  for (const t of tables) {
    const c = query(`SELECT COUNT(*) as c FROM ${t}`)[0].c
    console.log(`  ${t}: ${c}`)
  }
  console.log('✓ Database seeded successfully')
} catch (err) {
  console.error('✗ Seed failed:', err.message)
  console.error(err.stack)
  process.exit(1)
}
