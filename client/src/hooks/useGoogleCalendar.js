import { useState, useEffect } from 'react'

export function useGoogleCalendar(date) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!date) return
    const abortController = new AbortController()
    let cancelled = false
    async function fetchEvents() {
      setLoading(true)
      try {
        const res = await fetch(`/api/calendar/events?date=${date}`, { signal: abortController.signal })
        if (cancelled) return
        const data = await res.json()
        if (cancelled) return
        if (data.error === 'not_connected') {
          setEvents([])
          setError(null)
        } else {
          setEvents(data.events || [])
          setError(null)
        }
      } catch (err) {
        if (cancelled) return
        setError(err.message)
        setEvents([])
      }
      setLoading(false)
    }
    fetchEvents()
    return () => { cancelled = true; abortController.abort() }
  }, [date])

  return { events, loading, error }
}
