import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/habits'

export const useHabitStore = create((set, get) => ({
  habits: [],
  todayHabits: [],
  weekData: null,
  stats: null,
  monthLogs: [],
  loading: false,

  fetchHabits: async () => {
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error('Failed to load')
      const habits = await res.json()
      set({ habits })
    } catch (err) {
      toast.error('Failed to load habits')
    }
  },

  fetchToday: async () => {
    try {
      const res = await fetch(`${API}/today`)
      if (!res.ok) throw new Error('Failed to load')
      const todayHabits = await res.json()
      set({ todayHabits })
    } catch (err) {
      toast.error('Failed to load today habits')
    }
  },

  fetchWeek: async () => {
    try {
      const res = await fetch(`${API}/week`)
      if (!res.ok) throw new Error('Failed to load')
      const weekData = await res.json()
      set({ weekData })
    } catch (err) {
      toast.error('Failed to load week data')
    }
  },

  fetchStats: async () => {
    try {
      const res = await fetch(`${API}/stats`)
      if (!res.ok) throw new Error('Failed to load')
      const stats = await res.json()
      set({ stats })
    } catch (err) {
      toast.error('Failed to load stats')
    }
  },

  fetchMonthLogs: async (monthStart, monthEnd) => {
    try {
      const res = await fetch(`${API}/month?start=${monthStart}&end=${monthEnd}`)
      if (!res.ok) throw new Error('Failed to load month logs')
      const monthLogs = await res.json()
      set({ monthLogs })
    } catch (err) {
      toast.error('Failed to load month data')
    }
  },

  toggleLog: async (habitId, date, done) => {
    try {
      const res = await fetch(`${API}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, date, done }),
      })
      if (!res.ok) throw new Error('Failed to log')
      set(state => ({
        todayHabits: state.todayHabits.map(h =>
          h.id === habitId ? { ...h, done_today: done } : h
        ),
      }))
      const now = new Date(); const y = now.getFullYear(); const m = String(now.getMonth() + 1).padStart(2, '0')
      await Promise.all([get().fetchWeek(), get().fetchStats(), get().fetchMonthLogs(
        y + '-' + m + '-01',
        y + '-' + m + '-' + new Date(y, now.getMonth() + 1, 0).getDate()
      )])
    } catch (err) {
      toast.error('Failed to log habit')
    }
  },

  addHabit: async (name, category, frequency) => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, frequency }),
      })
      if (!res.ok) throw new Error('Failed to add')
      await get().fetchHabits()
      toast.success('Habit added')
    } catch (err) {
      toast.error('Failed to add habit')
    }
  },

  addHabitsBulk: async (templates) => {
    let count = 0
    for (const t of templates) {
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: t.name, category: t.category, frequency: t.frequency }),
        })
        if (res.ok) count++
      } catch { }
    }
    await get().fetchHabits()
    toast.success(`${count} habits added`)
    return count
  },

  updateHabit: async (id, updates) => {
    try {
      const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update')
      await get().fetchHabits()
      toast.success('Habit updated')
    } catch (err) {
      toast.error('Failed to update habit')
    }
  },

  deleteHabit: async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      set(state => ({ habits: state.habits.filter(h => h.id !== id) }))
      toast.success('Habit deleted')
    } catch (err) {
      toast.error('Failed to delete habit')
    }
  },

  reorderHabits: async (order) => {
    try {
      await fetch(`${API}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      })
    } catch (err) {
      toast.error('Failed to save order')
    }
  },
}))


