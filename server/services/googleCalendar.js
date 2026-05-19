const { google } = require('googleapis')

async function getCalendarEvents(auth, dateStr) {
  const calendar = google.calendar({ version: 'v3', auth })
  const startOfDay = new Date(dateStr + 'T00:00:00Z')
  const endOfDay = new Date(dateStr + 'T23:59:59Z')

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (response.data.items || []).map(event => ({
    id: event.id,
    summary: event.summary,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location || null,
    colorId: event.colorId || null,
    htmlLink: event.htmlLink,
  }))
}

async function createCalendarEvent(auth, event) {
  const calendar = google.calendar({ version: 'v3', auth })
  const body = {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
    start: event.allDay
      ? { date: event.date }
      : { dateTime: new Date(`${event.date}T${event.startTime}`).toISOString() },
    end: event.allDay
      ? { date: event.date }
      : { dateTime: new Date(`${event.date}T${event.endTime}`).toISOString() },
  }
  if (event.colorId) body.colorId = event.colorId

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: body,
  })

  return response.data
}

async function updateCalendarEvent(auth, eventId, event) {
  const calendar = google.calendar({ version: 'v3', auth })
  const body = {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
    start: event.allDay
      ? { date: event.date }
      : { dateTime: new Date(`${event.date}T${event.startTime}`).toISOString() },
    end: event.allDay
      ? { date: event.date }
      : { dateTime: new Date(`${event.date}T${event.endTime}`).toISOString() },
  }
  if (event.colorId) body.colorId = event.colorId

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId: eventId,
    resource: body,
  })

  return response.data
}

async function deleteCalendarEvent(auth, eventId) {
  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
  })
}

async function getCalendarEventsRange(auth, startDate, endDate) {
  const calendar = google.calendar({ version: 'v3', auth })
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date(startDate + 'T00:00:00').toISOString(),
    timeMax: new Date(endDate + 'T23:59:59').toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (response.data.items || []).map(event => ({
    google_event_id: event.id,
    title: event.summary || '(No title)',
    start_time: event.start?.dateTime || event.start?.date,
    end_time: event.end?.dateTime || event.end?.date,
    is_all_day: !!(event.start?.date && !event.start?.dateTime),
    location: event.location || null,
    description: event.description || null,
    color_id: event.colorId || null,
  }))
}

module.exports = { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getCalendarEventsRange }
