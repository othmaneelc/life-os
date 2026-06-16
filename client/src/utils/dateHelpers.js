export function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  if (hour >= 18 && hour < 22) return 'Good evening'
  return 'Good night'
}

export function getFormattedDate(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getTodayStr() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWeekStart() {
  const today = new Date()
  const day = today.getDay()
  const start = new Date(today)
  start.setDate(today.getDate() - day)
  return start.toISOString().split('T')[0]
}

export function getDaysSince(dateStr) {
  const start = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - start) / (1000 * 60 * 60 * 24))
}

export function daysBetween(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  return Math.floor((e - s) / (1000 * 60 * 60 * 24))
}

export function getDaysElapsed(start, end) {
  const total = daysBetween(start, end)
  const elapsed = daysBetween(start, new Date().toISOString().split('T')[0])
  return Math.min(Math.max(elapsed, 0), total)
}

export function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return { h, m }
}

export function timeToMinutes(timeStr) {
  const { h, m } = parseTime(timeStr)
  return h * 60 + m
}

export function formatTimeDisplay(timeStr) {
  const { h, m } = parseTime(timeStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}
