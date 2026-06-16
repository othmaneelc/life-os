import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/prayers'

export function useTodayPrayers() {
  return useQuery({ queryKey: ['todayPrayers'], queryFn: async () => { const r = await fetch(`${API}/today`); if (!r.ok) throw new Error(); return r.json() }, staleTime: 15000 })
}

export function useFajrStreak() {
  return useQuery({ queryKey: ['fajrStreak'], queryFn: async () => { const r = await fetch(`${API}/fajr-streak`); if (!r.ok) throw new Error(); const d = await r.json(); return d.streak }, staleTime: 30000 })
}

export function usePrayerStats(start, end) {
  return useQuery({ queryKey: ['prayerStats', start, end], queryFn: async () => { const r = await fetch(`${API}/stats?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`); if (!r.ok) throw new Error(); return r.json() }, enabled: !!start && !!end, staleTime: 60000 })
}

export function useHeatmap(start, end) {
  return useQuery({ queryKey: ['heatmap', start, end], queryFn: async () => { const r = await fetch(`${API}/heatmap?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`); if (!r.ok) throw new Error(); return r.json() }, enabled: !!start && !!end, staleTime: 60000 })
}

export function useMonthlyStats(year, month) {
  return useQuery({
    queryKey: ['monthlyStats', year, month],
    queryFn: async () => {
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const end = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`
      const r = await fetch(`${API}/stats?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      if (!r.ok) throw new Error()
      return r.json()
    },
    enabled: year != null && month != null,
    staleTime: 60000,
  })
}

export const usePrayerStore = createWithEqualityFn((set, get) => ({
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
}), Object.is)
