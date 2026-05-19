import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/prayers'

export const usePrayerStore = create((set, get) => ({
  prayerTimes: null,
  todayPrayers: [],
  fajrStreak: 0,
  stats: null,
  heatmap: [],

  fetchPrayerTimes: async (date) => {
    try {
      const res = await fetch(`${API}/times?date=${encodeURIComponent(date)}`)
      if (!res.ok) throw new Error('Failed to load')
      const times = await res.json()
      set({ prayerTimes: times })
    } catch (err) {
      toast.error('Could not fetch prayer times')
    }
  },

  fetchTodayPrayers: async () => {
    try {
      const res = await fetch(`${API}/today`)
      if (!res.ok) throw new Error('Failed to load')
      const prayers = await res.json()
      set({ todayPrayers: prayers })
    } catch (err) {
      toast.error('Could not load prayers')
    }
  },

  fetchFajrStreak: async () => {
    try {
      const res = await fetch(`${API}/fajr-streak`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      set({ fajrStreak: data.streak })
    } catch (err) {
      toast.error('Could not load streak')
    }
  },

  fetchStats: async (start, end) => {
    try {
      const res = await fetch(`${API}/stats?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      if (!res.ok) throw new Error('Failed to load')
      const stats = await res.json()
      set({ stats })
    } catch (err) {
      toast.error('Could not load prayer stats')
    }
  },

  fetchHeatmap: async (start, end) => {
    try {
      const res = await fetch(`${API}/heatmap?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      if (!res.ok) throw new Error('Failed to load')
      const heatmap = await res.json()
      set({ heatmap })
    } catch (err) {
      toast.error('Could not load heatmap')
    }
  },

  togglePrayer: async (date, prayerName, done) => {
    try {
      const res = await fetch(`${API}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, prayer_name: prayerName, done }),
      })
      if (!res.ok) throw new Error('Failed to toggle')
      get().fetchTodayPrayers()
      get().fetchFajrStreak()
      toast.success(done ? 'Prayer marked done' : 'Prayer unmarked')
    } catch (err) {
      toast.error('Failed to update prayer')
    }
  },
}))
