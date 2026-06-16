import { describe, it, expect } from 'vitest'

// Extract classifyRisk from voiceStore.js logic for testing
function classifyRisk(actions) {
  const FINANCIAL_ACTIONS = new Set(['add_expense', 'add_income', 'add_transaction'])
  const HIGH_RISK_THRESHOLD = 500
  return actions.some(a =>
    FINANCIAL_ACTIONS.has(a.action) && (a.params?.amount || 0) >= HIGH_RISK_THRESHOLD
  ) ? 'high' : 'low'
}

// Week filter logic from journalStore (extracted for testing)
function fmtLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekFilter(entryDate, referenceDate = new Date()) {
  const start = new Date(referenceDate)
  start.setDate(referenceDate.getDate() - referenceDate.getDay())
  const end = new Date(referenceDate)
  end.setDate(referenceDate.getDate() + (6 - referenceDate.getDay()))
  return entryDate >= fmtLocal(start) && entryDate <= fmtLocal(end)
}

// Local-date-safe comparison: builds dates from YYYY-MM-DD strings in local tz
function localDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

describe('classifyRisk', () => {
  it('returns low for empty actions', () => {
    expect(classifyRisk([])).toBe('low')
  })

  it('returns low for non-financial actions', () => {
    expect(classifyRisk([{ action: 'create_task', params: {} }])).toBe('low')
  })

  it('returns low for small financial actions', () => {
    expect(classifyRisk([{ action: 'add_expense', params: { amount: 50 } }])).toBe('low')
  })

  it('returns high for large expenses', () => {
    expect(classifyRisk([{ action: 'add_expense', params: { amount: 500 } }])).toBe('high')
  })

  it('returns high for large income', () => {
    expect(classifyRisk([{ action: 'add_income', params: { amount: 1000 } }])).toBe('high')
  })

  it('returns high for large transactions', () => {
    expect(classifyRisk([{ action: 'add_transaction', params: { amount: 750 } }])).toBe('high')
  })
})

describe('weekFilter', () => {
  it('includes dates within the computed week range', () => {
    const ref = localDateStr('2026-05-22')
    const start = new Date(ref)
    start.setDate(ref.getDate() - ref.getDay())
    const end = new Date(ref)
    end.setDate(ref.getDate() + (6 - ref.getDay()))
    const startStr = fmtLocal(start)
    const endStr = fmtLocal(end)
    // The ref date itself must be in range
    expect(weekFilter('2026-05-22', ref)).toBe(true)
    // The week start and end must be in range
    expect(weekFilter(startStr, ref)).toBe(true)
    expect(weekFilter(endStr, ref)).toBe(true)
  })

  it('excludes dates outside the computed week range', () => {
    const ref = localDateStr('2026-05-22')
    const start = new Date(ref)
    start.setDate(ref.getDate() - ref.getDay())
    const end = new Date(ref)
    end.setDate(ref.getDate() + (6 - ref.getDay()))
    const startStr = fmtLocal(start)
    const endStr = fmtLocal(end)
    // Day before start must be excluded
    const before = new Date(start)
    before.setDate(start.getDate() - 1)
    expect(weekFilter(fmtLocal(before), ref)).toBe(false)
    // Day after end must be excluded
    const after = new Date(end)
    after.setDate(end.getDate() + 1)
    expect(weekFilter(fmtLocal(after), ref)).toBe(false)
  })
})

// --- sortByPriorityAndDate (extracted from taskStore) ---

function sortByPriorityAndDate(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.priority === 1 && b.priority !== 1) return -1
    if (a.priority !== 1 && b.priority === 1) return 1
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })
}

describe('sortByPriorityAndDate', () => {
  it('tasks sorted by priority — priority 1 comes first', () => {
    const tasks = [
      { priority: 2, created_at: '2026-05-25' },
      { priority: 1, created_at: '2026-05-24' },
      { priority: 3, created_at: '2026-05-23' },
    ]
    const result = sortByPriorityAndDate(tasks)
    expect(result[0].priority).toBe(1)
    expect(result[1].priority).toBe(2)
    expect(result[2].priority).toBe(3)
  })

  it('when no priority 1, newer tasks come first', () => {
    const tasks = [
      { priority: 2, created_at: '2026-05-23' },
      { priority: 3, created_at: '2026-05-25' },
      { priority: 2, created_at: '2026-05-24' },
    ]
    const result = sortByPriorityAndDate(tasks)
    expect(result[0].created_at).toBe('2026-05-25')
    expect(result[1].created_at).toBe('2026-05-24')
    expect(result[2].created_at).toBe('2026-05-23')
  })

  it('created_at desc sorts correctly among same priority', () => {
    const tasks = [
      { priority: 2, created_at: '2026-05-22' },
      { priority: 2, created_at: '2026-05-25' },
      { priority: 2, created_at: '2026-05-23' },
    ]
    const result = sortByPriorityAndDate(tasks)
    expect(result[0].created_at).toBe('2026-05-25')
    expect(result[1].created_at).toBe('2026-05-23')
    expect(result[2].created_at).toBe('2026-05-22')
  })
})

// --- computeStreaks (extracted from habitStore) ---

function computeStreaks(logs, todayRef = new Date()) {
  const sorted = [...(logs || [])]
    .filter(l => l.done)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  let streak = 0
  const today = new Date(todayRef)
  today.setHours(0, 0, 0, 0)

  const latest = sorted[0]
  if (!latest) return 0

  const latestDate = new Date(latest.date + 'T00:00:00')
  const diff = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24))
  if (diff > 1) return 0

  streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const curr = new Date(sorted[i].date + 'T00:00:00')
    const prev = new Date(sorted[i - 1].date + 'T00:00:00')
    const dayDiff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24))
    if (dayDiff === 1) streak++
    else break
  }
  return streak
}

describe('computeStreaks', () => {
  const today = new Date(2026, 4, 25) // May 25, 2026

  it('returns 0 when no logs exist', () => {
    expect(computeStreaks([], today)).toBe(0)
    expect(computeStreaks(null, today)).toBe(0)
  })

  it('returns 0 when latest log is more than 1 day old', () => {
    const logs = [
      { date: '2026-05-20', done: true },
    ]
    expect(computeStreaks(logs, today)).toBe(0)
  })

  it('counts consecutive days correctly (3-day streak: May 23, 24, 25)', () => {
    const logs = [
      { date: '2026-05-25', done: true },
      { date: '2026-05-24', done: true },
      { date: '2026-05-23', done: true },
    ]
    expect(computeStreaks(logs, today)).toBe(3)
  })

  it('breaks streak when there is a gap', () => {
    const logs = [
      { date: '2026-05-25', done: true },
      { date: '2026-05-24', done: true },
      { date: '2026-05-21', done: true },
      { date: '2026-05-20', done: true },
    ]
    expect(computeStreaks(logs, today)).toBe(2)
  })

  it('streak of 1 when only today is logged', () => {
    const logs = [
      { date: '2026-05-25', done: true },
    ]
    expect(computeStreaks(logs, today)).toBe(1)
  })
})
