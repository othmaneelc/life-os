import { useState, useEffect, useCallback } from 'react'

export function usePrayerTimes(date) {
  const [prayerTimes, setPrayerTimes] = useState(null)
  const [nextPrayer, setNextPrayer] = useState(null)
  const [countdown, setCountdown] = useState('')

  const fetchTimes = useCallback(async () => {
    try {
      const res = await fetch(`/api/prayers/times?date=${date}`)
      const data = await res.json()
      setPrayerTimes(data)
    } catch (err) {
      console.error(err)
    }
  }, [date])

  useEffect(() => {
    fetchTimes()
  }, [fetchTimes])

  useEffect(() => {
    if (!prayerTimes) return
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    function timeToMin(t) {
      if (!t) return 0
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    let next = null
    let nextTime = null
    for (const p of prayers) {
      const t = prayerTimes[p]
      if (t && timeToMin(t) > currentMinutes) {
        next = p
        nextTime = t
        break
      }
    }

    if (next && nextTime) {
      setNextPrayer({ name: next, time: nextTime })
    } else {
      setNextPrayer(null)
    }
  }, [prayerTimes])

  useEffect(() => {
    if (!nextPrayer) return
    const interval = setInterval(() => {
      const now = new Date()
      const [h, m] = nextPrayer.time.split(':').map(Number)
      const target = new Date()
      target.setHours(h, m, 0)
      const diff = target - now
      if (diff <= 0) {
        setCountdown('')
        fetchTimes()
        return
      }
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      setCountdown(`${hours}h ${minutes}min`)
    }, 1000)
    return () => clearInterval(interval)
  }, [nextPrayer, fetchTimes])

  return { prayerTimes, nextPrayer, countdown, refetch: fetchTimes }
}

export function useLiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])
  return time
}
