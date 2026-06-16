import { BLOCK_COLORS } from './constants'

export function parseNaturalLanguage(input) {
  if (!input || input.trim().length < 2) return null
  let text = input.trim()
  const result = { title: text }

  // Date patterns
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayNamesShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

  // Next weekday: "next monday", "next mon"
  const nextDayMatch = text.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i)
  if (nextDayMatch) {
    const targetDay = dayNames.findIndex(d => d.startsWith(nextDayMatch[1].toLowerCase().slice(0, 3)))
    if (targetDay >= 0) {
      const daysUntil = (targetDay - today.getDay() + 7) % 7 || 7
      const d = new Date(today)
      d.setDate(d.getDate() + daysUntil)
      result.date = d.toISOString().split('T')[0]
    }
  }

  // "next week" — next monday + 7 days
  const nextWeekMatch = text.match(/\bnext\s+week\b/i)
  if (nextWeekMatch && !result.date) {
    const d = new Date(today)
    d.setDate(d.getDate() + (7 - today.getDay()) + 1)
    result.date = d.toISOString().split('T')[0]
  }

  // "this week" — next coming weekday or today
  const thisWeekMatch = text.match(/\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
  if (thisWeekMatch && !result.date) {
    const targetDay = dayNames.findIndex(d => d.startsWith(thisWeekMatch[1].toLowerCase().slice(0, 3)))
    if (targetDay >= 0) {
      const daysUntil = (targetDay - today.getDay() + 7) % 7
      const d = new Date(today)
      d.setDate(d.getDate() + daysUntil)
      result.date = d.toISOString().split('T')[0]
    }
  }

  // "tomorrow"
  if (/\btomorrow\b/i.test(text) && !result.date) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    result.date = d.toISOString().split('T')[0]
  }

  // "in X hours/minutes" — relative time
  const inMatch = text.match(/\bin\s+(\d+)\s*(hour|hr|minute|min)s?\b/i)
  if (inMatch) {
    const now = new Date()
    const amount = parseInt(inMatch[1])
    const unit = inMatch[2].toLowerCase()
    if (unit.startsWith('hour') || unit === 'hr') {
      now.setHours(now.getHours() + amount)
    } else {
      now.setMinutes(now.getMinutes() + amount)
    }
    result.start_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    now.setHours(now.getHours() + 1)
    result.end_time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (!result.date) result.date = today.toISOString().split('T')[0]
  }

  // "at HH:MM" — time
  const atTimeMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?\b/i)
  if (atTimeMatch && !result.start_time) {
    let h = parseInt(atTimeMatch[1])
    const m = atTimeMatch[2] ? parseInt(atTimeMatch[2]) : 0
    if (atTimeMatch[3]?.toLowerCase() === 'pm' && h !== 12) h += 12
    if (atTimeMatch[3]?.toLowerCase() === 'am' && h === 12) h = 0
    result.start_time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const endH = h + 1 > 23 ? 23 : h + 1
    result.end_time = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // Time range: "HH:MMam to HH:MMpm", "3pm-4pm", "3pm to 4pm"
  const timeRangeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  if (!result.start_time || text.includes('-') || text.includes('–') || text.includes(' to ')) {
    const rangeMatch = text.match(timeRangeRegex)
    if (rangeMatch) {
      let startH = parseInt(rangeMatch[1])
      const startM = rangeMatch[2] ? parseInt(rangeMatch[2]) : 0
      let endH = parseInt(rangeMatch[4])
      const endM = rangeMatch[5] ? parseInt(rangeMatch[5]) : 0

      if (rangeMatch[3]?.toLowerCase() === 'pm' && startH !== 12) startH += 12
      if (rangeMatch[3]?.toLowerCase() === 'am' && startH === 12) startH = 0
      if (rangeMatch[6]?.toLowerCase() === 'pm' && endH !== 12) endH += 12
      if (rangeMatch[6]?.toLowerCase() === 'am' && endH === 12) endH = 0

      result.start_time = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
      result.end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      text = text.replace(rangeMatch[0], '')
    }
  }

  // Clean up title: remove date/time keywords
  const cleanupPatterns = [
    /\b(today|tomorrow|next\s+\w+|this\s+\w+|in\s+\d+\s*(hour|hr|minute|min)s?)\b/gi,
    /\b(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)?\s*[-–to]+\s*\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi,
    /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi,
  ]
  cleanupPatterns.forEach(p => { text = text.replace(p, '') })
  text = text.replace(/\s+/g, ' ').trim()
  if (text) result.title = text

  // Set default date if not set
  if (!result.date) result.date = dateStr

  // Detect block type from keywords
  for (const [type, keywords] of Object.entries({
    Work: ['meeting', 'work', 'call', 'review', 'presentation', 'standup', 'sprint', 'client', 'interview', 'brainstorm', 'sync', 'deploy', 'code', 'dev', 'sprint'],
    Prayer: ['prayer', 'salah', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'quran', 'dua', 'wudu', 'tahajjud', 'dhikr'],
    Training: ['workout', 'gym', 'run', 'exercise', 'training', 'yoga', 'pilates', 'swim', 'bike', 'cardio', 'stretch', 'walk', 'jog', 'lift'],
    Learning: ['study', 'learn', 'read', 'course', 'research', 'lecture', 'tutorial', 'class', 'lesson', 'workshop', 'seminar', 'webinar', 'book', 'article'],
    Rest: ['break', 'rest', 'nap', 'relax', 'lunch', 'dinner', 'breakfast', 'snack', 'tea', 'coffee', 'meditate', 'breathe'],
    Planning: ['plan', 'review', 'retro', 'organize', 'tidy', 'clean', 'inbox', 'email', 'respond', 'admin', 'billing'],
    Personal: ['doctor', 'dentist', 'hair', 'bank', 'shopping', 'groceries', 'errand', 'appointment', 'call mom', 'call dad', 'family', 'friend'],
  })) {
    if (keywords.some(k => input.toLowerCase().includes(k))) {
      result.block_type = type
      result.color = BLOCK_COLORS[type]
      break
    }
  }

  return result
}

export function timeToMin(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minToTime(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function formatDateStr(d) {
  return d.toISOString().split('T')[0]
}

export function getRecurrenceDates(startDate, recurrence, endDate) {
  const dates = []
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date(start)
  end.setMonth(end.getMonth() + 3)

  const current = new Date(start)
  while (current <= end) {
    dates.push(formatDateStr(current))
    if (recurrence === 'daily') current.setDate(current.getDate() + 1)
    else if (recurrence === 'weekly') current.setDate(current.getDate() + 7)
    else if (recurrence === 'monthly') current.setMonth(current.getMonth() + 1)
    else if (recurrence === 'weekdays') {
      current.setDate(current.getDate() + 1)
      while (current.getDay() === 0 || current.getDay() === 6) current.setDate(current.getDate() + 1)
    } else if (recurrence === 'weekends') {
      current.setDate(current.getDate() + 1)
      while (current.getDay() !== 0 && current.getDay() !== 6) current.setDate(current.getDate() + 1)
    } else break
  }
  return dates
}

export function isTimeInRange(time, start, end) {
  const t = time.getHours() * 60 + time.getMinutes()
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return t >= sh * 60 + sm && t < eh * 60 + em
}
