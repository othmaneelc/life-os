import { useState, useEffect, useCallback, useRef } from 'react'

const ADHAN_URL = 'https://www.islamcan.com/audio/adhan/azan1.mp3'

let adhanAudio = null
function getAdhanAudio() {
  if (!adhanAudio) {
    adhanAudio = new Audio(ADHAN_URL)
    adhanAudio.preload = 'auto'
  }
  return adhanAudio
}

export function usePrayerTimes(date) {
  const [prayerTimes, setPrayerTimes] = useState(null)
  const [nextPrayer, setNextPrayer] = useState(null)
  const [countdown, setCountdown] = useState('')
  const [location, setLocation] = useState({ city: 'Casablanca', country: 'Morocco', method: 2 })
  const [adhanEnabled, setAdhanEnabled] = useState(true)
  const lastAdhanRef = useRef(null)
  const fetchingRef = useRef(false)

  const fetchTimes = useCallback(async (force) => {
    if (fetchingRef.current && !force) return
    fetchingRef.current = true
    try {
      const d = date || new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/prayers/times?date=${encodeURIComponent(d)}`)
      const data = await res.json()
      setPrayerTimes(data)
      if (data.city) setLocation({ city: data.city, country: data.country, method: data.method })
    } catch (_err) {
      /* silent - server may be offline */
    } finally {
      fetchingRef.current = false
    }
  }, [date])

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()
    fetchTimes()
    fetch('/api/settings', { signal: controller.signal }).then(r => r.json()).then(s => {
      if (mounted) setAdhanEnabled(s.notify_adhan !== '0')
    }).catch(() => {})
    return () => { mounted = false; controller.abort() }
  }, [fetchTimes])

  const checkAdhan = useCallback((prayerName, prayerTimeStr) => {
    if (!prayerTimeStr || !adhanEnabled) return
    const now = new Date()
    const [h, m] = prayerTimeStr.split(':').map(Number)
    if (now.getHours() === h && now.getMinutes() === m && now.getSeconds() < 5) {
      const key = `${new Date().toISOString().split('T')[0]}_${prayerName}`
      if (lastAdhanRef.current !== key) {
        lastAdhanRef.current = key
        try {
          const audio = getAdhanAudio()
          audio.currentTime = 0
          audio.play().catch(() => {})
        } catch (e) {}
      }
    }
  }, [adhanEnabled])

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
      checkAdhan(nextPrayer.name, nextPrayer.time)
      if (diff <= 0) {
        setCountdown('')
        fetchTimes(true)
        return
      }
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`)
      } else {
        const seconds = Math.floor((diff % 60000) / 1000)
        setCountdown(`${minutes}m ${seconds}s`)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [nextPrayer, fetchTimes, checkAdhan])

  return { prayerTimes, nextPrayer, countdown, location, refetch: fetchTimes }
}

export function useLiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])
  return time
}
