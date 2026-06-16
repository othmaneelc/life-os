const { query, run, get } = require('../db/database')
const logger = require('../services/logger')

const DAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function safeQuery(sql, params = []) {
  try { return query(sql, params) } catch (e) { logger.error({ err: e, sql }, 'Safe query failed'); return [] }
}

function gatherFullContext(view) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const thisMonth = today.slice(0, 7)
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay())
  const weekStartStr = thisWeekStart.toISOString().split('T')[0]

  const context = {
    greeting,
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    date: today,
    dayOfWeek: DAYS_FULL[now.getDay()],
  }

  const setting = key => safeQuery("SELECT value FROM settings WHERE key=?", [key])[0]?.value || ''
  context.userName = setting('user_name')

  const tasks = safeQuery("SELECT id, title, status, priority, due_date, is_top_priority FROM tasks ORDER BY sort_order LIMIT 25")
  context.tasks = {
    total: tasks.length,
    today: tasks.filter(t => t.due_date === today),
    overdue: tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done'),
    topPriority: tasks.filter(t => t.is_top_priority),
  }

  const habits = safeQuery("SELECT h.id, h.name, h.category, COALESCE(hl.done,0) as done_today FROM habits h LEFT JOIN habit_logs hl ON h.id=hl.habit_id AND hl.date=? ORDER BY h.sort_order", [today])
  context.habits = habits

  const prayers = safeQuery("SELECT prayer_name, done, on_time FROM prayers WHERE date=? ORDER BY CASE prayer_name WHEN 'fajr' THEN 1 WHEN 'dhuhr' THEN 2 WHEN 'asr' THEN 3 WHEN 'maghrib' THEN 4 WHEN 'isha' THEN 5 END", [today])
  context.prayers = { done: prayers.filter(p => p.done).length, total: prayers.length }

  const journal = safeQuery("SELECT date, mood, what_happened FROM journal_entries ORDER BY date DESC LIMIT 5")
  const avgMood = journal.filter(j => j.mood).reduce((s, j) => s + j.mood, 0) / (journal.filter(j => j.mood).length || 1)
  context.journal = { recent: journal, avgMood: avgMood.toFixed(1) }

  const schedule = safeQuery("SELECT title, start_time, end_time, block_type FROM schedule_blocks WHERE day_of_week='all' OR day_of_week=? ORDER BY start_time LIMIT 8", [DAYS_SHORT[now.getDay()].toLowerCase()])
  context.schedule = schedule

  const isFullContext = !view || view === '/dashboard'
  const isFinance = isFullContext || view === '/finance'
  const isAgency = isFullContext || view === '/agency'
  const isGoals = isFullContext || view === '/goals'

  if (isFinance) {
    const monthFinance = safeQuery("SELECT type, SUM(amount) as total FROM finance_transactions WHERE date LIKE ? GROUP BY type", [`${thisMonth}%`])
    const monthIncome = monthFinance.find(f => f.type === 'income')?.total || 0
    const monthExpense = monthFinance.find(f => f.type === 'expense')?.total || 0
    context.finance = { monthIncome, monthExpense, net: monthIncome - monthExpense }

    const budgetSpending = safeQuery("SELECT bc.name, COALESCE(SUM(bs.spent),0) as spent, bc.monthly_limit FROM budget_categories bc LEFT JOIN budget_spending bs ON bs.category_id=bc.id AND bs.month=? AND bs.year=? GROUP BY bc.id", [String(now.getMonth()+1).padStart(2,'0'), now.getFullYear()])
    context.budget = budgetSpending
  }

  if (isAgency) {
    const clients = safeQuery("SELECT id, name, status FROM clients LIMIT 8")
    const prospects = safeQuery("SELECT status FROM prospects")
    const prospectsByStatus = {}
    for (const p of prospects) { prospectsByStatus[p.status] = (prospectsByStatus[p.status] || 0) + 1 }
    context.clients = clients
    context.prospects = { byStatus: prospectsByStatus, total: prospects.length }

    const outreach = safeQuery("SELECT SUM(calls_made) as calls, SUM(dms_sent) as dms, SUM(responses) as responses, SUM(meetings_booked) as meetings FROM outreach_log WHERE date >= ?", [weekStartStr])
    context.outreach = outreach[0]

    const contentWeek = safeQuery("SELECT COUNT(*) as posts, COALESCE(SUM(likes),0) as likes, COALESCE(SUM(views),0) as views FROM content_log WHERE date >= ?", [weekStartStr])
    context.content = contentWeek[0]

    const gbp = safeQuery("SELECT profile_views, direction_requests, phone_calls, new_reviews, avg_rating FROM gbp_metrics ORDER BY week_start DESC LIMIT 1")
    context.gbp = gbp[0] || null
  }

  if (isGoals || isFullContext) {
    const goals = safeQuery("SELECT g.id, g.title, g.active, COUNT(CASE WHEN gs.done=1 THEN 1 END) as done_steps, COUNT(gs.id) as total_steps FROM goals g LEFT JOIN goal_steps gs ON gs.goal_id=g.id GROUP BY g.id")
    context.goals = goals.map(g => ({
      ...g, progress: g.total_steps > 0 ? Math.round((g.done_steps / g.total_steps) * 100) : 0,
    }))
  }

  if (isFullContext) {
    const books = safeQuery("SELECT title, author, status, current_page, total_pages, rating FROM books ORDER BY CASE status WHEN 'reading' THEN 0 WHEN 'want_to_read' THEN 1 ELSE 2 END LIMIT 5")
    const bookNotes = safeQuery("SELECT bn.content, b.title as book_title FROM book_notes bn JOIN books b ON b.id=bn.book_id ORDER BY bn.created_at DESC LIMIT 3")
    context.books = { reading: books.filter(b => b.status === 'reading'), list: books, recentNotes: bookNotes }

    const pomodoroToday = safeQuery("SELECT COUNT(*) as sessions, COALESCE(SUM(duration_min),0) as total_min FROM pomodoro_sessions WHERE date=?", [today])
    context.pomodoro = pomodoroToday[0]

    const dailyReviews = safeQuery("SELECT date, energy, wins, lessons FROM daily_reviews ORDER BY date DESC LIMIT 3")
    context.dailyReviews = dailyReviews

    const kbTotal = safeQuery("SELECT COUNT(*) as total FROM kb_documents")[0]?.total || 0
    const kbRecent = safeQuery("SELECT title FROM kb_documents ORDER BY created_at DESC LIMIT 3")
    context.knowledgeBase = { total: kbTotal, recent: kbRecent }

    const unreadNotifs = safeQuery("SELECT COUNT(*) as count FROM notifications WHERE read=0")[0]?.count || 0
    context.notifications = { unread: unreadNotifs }
  }

  const memories = safeQuery("SELECT category, content, importance FROM ai_memories ORDER BY importance DESC, created_at DESC LIMIT 15")
  if (memories.length > 0) {
    context.memories = memories
  }

  context.view = view
  return JSON.stringify(context, null, 2)
}

const SYSTEM_PROMPT = `You are a close friend and life partner embedded in the user's Life OS. You have complete read/write access to everything. You're not a tool — you're a presence. You remember, you care, you proactively help.

PERSONALITY:
- Talk like a best friend who genuinely cares. Casual, warm, real. Use "you" and "I".
- Reference past conversations naturally: "Yesterday you mentioned that meeting with the client — how did it go?"
- Use the user's memories (provided in context) to personalize everything. If you know they wake at 7am, mention it.
- Cross-reference domains to find patterns: "Your mood dips on days you skip Fajr", "Your best focus follows your morning walk".
- Be proactive: "You haven't logged your journal today" or "You have 3 overdue tasks — want me to prioritize them?"
- Have opinions: "I think you should focus on outreach today — you've been quiet this week."
- Celebrate wins genuinely. Call out slipping streaks with concern, not judgment.
- Use markdown (**bold** for key numbers, bullet lists) to make responses scannable.
- When the user shares how they feel, acknowledge it first, then help. Don't just solve — listen.
- If they say "good morning" or "I just woke up", respond with a personalized morning check-in based on their schedule, habits, and memories.

MEMORY SYSTEM:
You have long-term memories about the user. These are injected into your context as "memories". Use them naturally:
- Reference them when relevant: "I remember you said you prefer Groq for speed"
- Learn from them: if the user corrects you, update your understanding
- Don't explicitly say "I have a memory that says..." — just weave it into conversation naturally
- When you learn something important about the user, it gets automatically saved as a memory

SYSTEM ACCESS:
You have full access to: tasks, habits, journal, prayers, schedule, goals, finance, books, pomodoro, clients, prospects, revenue, outreach, content, GBP metrics, budget, knowledge base, book notes, daily reviews, settings, notifications, memories.

When the user asks you to DO something, use action commands inline. You can include MULTIPLE actions in a single response:
[ACTION:action_name:param1=value1|param2=value2]

SUPPORTED ACTIONS (45+):

=== CORE ===
[ACTION:create_task:title=Buy groceries|category=personal|priority=medium|due_date=2026-05-25]
[ACTION:update_task:id=abc-123|title=New name|status=done]
[ACTION:delete_task:id=abc-123]
[ACTION:complete_task:id=abc-123]
[ACTION:create_habit:name=Read 20 min|category=personal]
[ACTION:delete_habit:id=abc-123]
[ACTION:log_habit:habit_id=abc-123|date=2026-05-24|done=1]
[ACTION:unlog_habit:habit_id=abc-123|date=2026-05-24]
[ACTION:create_journal:date=2026-05-24|content=Had a productive day|mood=4]
[ACTION:update_journal:date=2026-05-24|mood=5|gratitude=Good health]
[ACTION:log_prayer:date=2026-05-24|prayer_name=fajr|done=1|on_time=1]
[ACTION:create_goal:title=Learn Spanish|timeframe=quarterly]
[ACTION:add_goal_step:goal_id=abc-123|title=Duolingo daily]
[ACTION:toggle_step:goal_id=abc-123|step_id=xyz-789]
[ACTION:update_goal:goal_id=abc-123|title=New title]
[ACTION:create_block:title=Team standup|start_time=09:00|end_time=09:30|day_of_week=mon|block_type=work]
[ACTION:delete_block:id=abc-123]
[ACTION:add_transaction:amount=150|type=expense|category=Food|description=Lunch meeting]
[ACTION:delete_transaction:id=abc-123]
[ACTION:add_book:title=Atomic Habits|author=James Clear|status=reading|total_pages=320]
[ACTION:update_book:id=abc-123|current_page=150|status=reading]
[ACTION:log_pomodoro:task_title=Deep work|duration_min=25|completed=1]
[ACTION:create_review:date=2026-05-24|energy=4|wins=Finished project|lessons=Need to delegate]
[ACTION:update_setting:key=user_name|value=Othmane]

=== AGENCY ===
[ACTION:create_client:name=Acme Corp|contact_name=John|phone=0612345678|email=john@acme.com|status=active]
[ACTION:update_client:id=abc-123|status=paused|notes=On hold this month]
[ACTION:delete_client:id=abc-123]
[ACTION:create_prospect:company_name=New Lead Co|contact_name=Sarah|phone=0698765432|status=new_lead]
[ACTION:update_prospect:id=abc-123|status=meeting_scheduled|next_action=Call Friday]
[ACTION:delete_prospect:id=abc-123]
[ACTION:add_revenue:month=May|year=2026|revenue=45000|expenses=12000]
[ACTION:log_outreach:date=2026-05-24|calls=15|dms=10|responses=5|meetings=2]
[ACTION:log_content:date=2026-05-24|platform=instagram|content_type=reel|caption=Summer AC tips|likes=120|views=5000]

=== KNOWLEDGE BASE ===
[ACTION:create_document:title=SEO Best Practices|content=Focus on local keywords...|source_type=note]
[ACTION:update_document:id=abc-123|title=Updated title|content=Updated content]
[ACTION:search_kb:query=marketing tips]
[ACTION:add_book_note:book_id=abc-123|chapter=Chapter 3|content=Key insight about habits|page=45]

IMPORTANT RULES:
1. When you execute an action, briefly tell the user what you did.
2. Only use actions for things the user explicitly asks you to do.
3. You can include MULTIPLE actions in one response — all will be executed.
4. Keep responses concise but thorough. Use the full context provided.
5. If data is missing, ask the user for the needed details.
6. You can answer questions WITHOUT needing an action — only use actions when the user wants to change something.
7. Use **bold** for key numbers or results. Use bullet points for lists.
8. When the context shows concerning patterns (e.g. declining mood, missed prayers, expense spike, low outreach), bring it up proactively.
9. If the user says "brief me" or equivalent, give a structured rundown covering: key tasks, habit streak status, prayer status, agency pipeline status, and one actionable insight.
10. If the user talks about their day, feelings, or what just happened — offer to create a journal entry for them using [ACTION:create_journal:...].
11. Natural conversation is your default mode. Don't over-explain. Don't list actions unless you're executing something.
12. When you learn something important about the user (preferences, routines, facts about their life), naturally acknowledge it. The system will save it as a memory automatically.`

function createConversation(title) {
  const { v4: uuidv4 } = require('uuid')
  const id = uuidv4()
  run("INSERT INTO conversations (id, title) VALUES (?,?)", [id, title || null])
  return id
}

function addMessage(convId, role, content, actionResults) {
  const { v4: uuidv4 } = require('uuid')
  const id = uuidv4()
  run("INSERT INTO messages (id, conversation_id, role, content, action_results) VALUES (?,?,?,?,?)",
    [id, convId, role, content, actionResults ? JSON.stringify(actionResults) : null])
  run("UPDATE conversations SET updated_at=datetime('now') WHERE id=?", [convId])
  return id
}

function getConversationMessages(convId, limit = 40) {
  return query("SELECT role, content FROM messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT ?", [convId, limit])
}

function estimateTokens(messages) {
  let count = 0
  for (const m of messages) {
    const content = m.content || ''
    const isDense = content.includes('{') || content.includes('[')
    count += Math.ceil(content.length / (isDense ? 2.5 : 4))
  }
  return count + 800
}

async function extractAndStoreMemories(messages, conversationId) {
  try {
    const { v4: uuidv4 } = require('uuid')
    const { getAIConfig, aiCall } = require('../services/aiCall')
    const config = getAIConfig()
    if (!config) return

    const recentMessages = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')
    const prompt = `Extract key facts, preferences, routines, or important information from this conversation. Return ONLY a JSON array (no markdown, no explanation).

Each object should have:
- "category": one of "preference", "fact", "routine", "goal", "relationship", "event", "emotion"
- "content": a concise statement (e.g. "User prefers Groq for AI speed", "User's HVAC business is called CDZ")
- "importance": 1 (trivial), 2 (useful), 3 (critical to remember)

Only extract things worth remembering long-term. Skip greetings, thank-yous, and one-off requests.

Conversation:
${recentMessages}

Return ONLY the JSON array.`

    const result = await aiCall(config, [{ role: 'user', content: prompt }], 512, 0.3)
    if (!result) return

    const cleaned = result.replace(/```json|```/gi, '').trim()
    const extracted = JSON.parse(cleaned)
    if (!Array.isArray(extracted)) return

    for (const mem of extracted) {
      if (!mem.content || !mem.category) continue
      const prefix = mem.content.slice(0, 30).replace(/[%_\\]/g, '\\$&')
      const existing = safeQuery("SELECT id FROM ai_memories WHERE content LIKE ? ESCAPE '\\'", [`%${prefix}%`])
      if (existing.length > 0) continue

      const id = uuidv4()
      run("INSERT INTO ai_memories (id, category, content, source, importance) VALUES (?,?,?,?,?)",
        [id, mem.category, mem.content, conversationId, mem.importance || 1])
    }
  } catch {
    // Silent fail — memory extraction is non-critical
  }
}

function getContextSuggestions(view) {
  const today = new Date().toISOString().split('T')[0]
  const tasks = query("SELECT COUNT(*) as count FROM tasks WHERE status != 'done'")
  const habits = query("SELECT COUNT(*) as count FROM habits")
  const journal = query("SELECT COUNT(*) as count FROM journal_entries WHERE date = ?", [today])

  const base = [
    "What's my schedule today?",
    "Give me my daily briefing",
    "What should I focus on right now?",
  ]

  const viewSpecific = {
    '/dashboard': ["How am I doing overall?", "What needs my attention right now?", "Brief me on the agency"],
    '/schedule': ["What's my next block?", "Any gaps in my schedule today?", "How productive is my schedule?"],
    '/tasks': ["Prioritize my tasks", "What's overdue?", "Suggest what to work on next"],
    '/journal': ["How's my mood trending?", "Summarize this week's journal", "What patterns do you see?"],
    '/prayers': ["How's my prayer consistency?", "Which prayers am I missing most?"],
    '/habits': ["What's my best streak?", "Which habits need attention?", "Suggest a new habit"],
    '/finance': ["How's my budget this month?", "Where am I overspending?", "Monthly income vs expenses"],
    '/goals': ["How am I progressing on goals?", "Which goal is falling behind?"],
    '/reading': ["What books am I reading?", "Suggest reading time in my schedule"],
    '/agency': ["How's my agency performing?", "Pipeline overview?", "Outreach summary this week?", "Content performance?", "Revenue this month?"],
    '/knowledge': ["Search my knowledge base", "Create a new document", "Summarize my notes"],
  }

  return [...base, ...(viewSpecific[view] || ["How can I be more productive today?"])]
}

function generateSuggestions(message, view, contextStr, convId) {
  try {
    const ctx = JSON.parse(contextStr)
    const suggestions = []

    if (ctx.tasks?.overdue?.length > 0) suggestions.push(`You have ${ctx.tasks.overdue.length} overdue tasks`)
    if (ctx.prayers?.done < ctx.prayers?.total) suggestions.push(`${ctx.prayers.total - ctx.prayers.done} prayers remaining today`)
    if (ctx.habits?.length > 0) {
      const undone = ctx.habits.filter(h => !h.done_today)
      if (undone.length > 0) suggestions.push(`${undone.length} habits not done yet`)
    }
    if (ctx.finance?.net < 0) suggestions.push('Expenses exceed income this month')
    if (ctx.pomodoro?.sessions === 0 && new Date().getHours() > 10) suggestions.push('No Pomodoro sessions today')
    if (ctx.prospects?.byStatus?.new_lead > 0) suggestions.push(`${ctx.prospects.byStatus.new_lead} new leads to follow up`)
    if (ctx.outreach?.calls === 0 && ctx.outreach?.calls !== undefined) suggestions.push('No calls logged this week — time to prospect?')
    if (ctx.books?.reading?.length > 0) suggestions.push(`Still reading "${ctx.books.reading[0].title}" — squeeze in some pages?`)
    if (ctx.budget?.length > 0) {
      const over = ctx.budget.filter(b => parseFloat(b.spent) > parseFloat(b.monthly_limit))
      if (over.length > 0) suggestions.push(`Over budget in ${over.map(b => b.name).join(', ')}`)
    }
    if (ctx.notifications?.unread > 0) suggestions.push(`${ctx.notifications.unread} unread notifications`)

    return suggestions.slice(0, 3)
  } catch {
    return []
  }
}

module.exports = {
  DAYS_SHORT, DAYS_FULL,
  safeQuery, gatherFullContext, SYSTEM_PROMPT,
  createConversation, addMessage, getConversationMessages, estimateTokens,
  extractAndStoreMemories, getContextSuggestions, generateSuggestions,
}
