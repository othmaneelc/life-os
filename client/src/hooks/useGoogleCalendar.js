import { useState, useEffect } from 'react'

export function useGoogleCalendar(date) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      try {
        const res = await fetch(`/api/calendar/events?date=${date}`)
        const data = await res.json()
        if (data.error === 'not_connected') {
          setEvents([])
          setError(null)
        } else {
          setEvents(data.events || [])
          setError(null)
        }
      } catch (err) {
        setError(err.message)
        setEvents([])
      }
      setLoading(false)
    }
    if (date) fetchEvents()
  }, [date])

  return { events, loading, error }
}
