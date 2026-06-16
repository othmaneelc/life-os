const { google } = require('googleapis')
const { query, run, get } = require('../db/database')

function generateId() {
  return 'gcal_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8)
}

async function syncEvents(auth, daysBack = 30, daysForward = 90) {
  const calendar = google.calendar({ version: 'v3', auth })
  const now = new Date()
  const timeMin = new Date(now.getTime() - daysBack * 86400000).toISOString()
  const timeMax = new Date(now.getTime() + daysForward * 86400000).toISOString()

  let pageToken = null
  let synced = 0, removed = 0

  // Collect all event IDs we get from Google
  const googleIds = new Set()

  do {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      pageToken,
    })

    const events = response.data.items || []
    for (const event of events) {
      const gId = event.id
      googleIds.add(gId)
      const title = event.summary || '(No title)'
      const description = event.description || ''
      const location = event.location || null
      const start = event.start?.dateTime || event.start?.date
      const end = event.end?.dateTime || event.end?.date
      const isAllDay = !!event.start?.date
      const colorId = event.colorId || null
      const htmlLink = event.htmlLink || null

      const existing = get('SELECT id FROM google_calendar_events WHERE google_event_id = ?', [gId])
      if (existing) {
        run(`UPDATE google_calendar_events SET title=?, description=?, location=?, start_time=?, end_time=?, is_all_day=?, color_id=?, html_link=?, synced_at=datetime('now') WHERE google_event_id=?`,
          [title, description, location, start, end, isAllDay ? 1 : 0, colorId, htmlLink, gId])
      } else {
        run(`INSERT INTO google_calendar_events (id, google_event_id, title, description, location, start_time, end_time, is_all_day, calendar_id, color_id, html_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), gId, title, description, location, start, end, isAllDay ? 1 : 0, 'primary', colorId, htmlLink])
      }
      synced++
    }

    pageToken = response.data.nextPageToken
  } while (pageToken)

  // Remove events that no longer exist on Google Calendar
  const stored = query('SELECT google_event_id FROM google_calendar_events')
  for (const row of stored) {
    if (!googleIds.has(row.google_event_id)) {
      run('DELETE FROM google_calendar_events WHERE google_event_id = ?', [row.google_event_id])
      removed++
    }
  }

  // Update last sync time in settings
  run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    ['google_calendar_last_sync', new Date().toISOString()])

  return { synced, removed }
}

function getSyncedEvents(dateStr) {
  return query(`SELECT * FROM google_calendar_events WHERE date(start_time) = ? ORDER BY start_time`, [dateStr])
}

function getSyncStatus() {
  const lastSync = get('SELECT value FROM settings WHERE key = ?', ['google_calendar_last_sync'])
  return {
    lastSync: lastSync?.value || null,
    eventCount: get('SELECT COUNT(*) as count FROM google_calendar_events')?.count || 0,
  }
}

module.exports = { syncEvents, getSyncedEvents, getSyncStatus }
