import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/pomodoro'

export const usePomodoroStore = create((set, get) => ({
  sessions: [],
  todaySessions: [],
  stats: null,
  timer: { running: false, remaining: 1500, taskTitle: '' },

  fetchToday: async (date) => {
    try {
      const res = await fetch(`${API}?date=${date}`)
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      set({ todaySessions: await res.json() })
    } catch { toast.error('Failed to load sessions') }
  },

  addSession: async (session) => {
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      await get().fetchToday(session.date || new Date().toISOString().split('T')[0])
      toast.success('Pomodoro saved')
      return await res.json()
    } catch { toast.error('Failed to save session') }
  },

  completeSession: async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: true }) })
      await get().fetchToday(new Date().toISOString().split('T')[0])
      toast.success('Session completed')
    } catch { toast.error('Failed to update session') }
  },

  fetchStats: async (start, end) => {
    try {
      const res = await fetch(`${API}/stats?start=${start}&end=${end}`)
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      set({ stats: await res.json() })
    } catch { toast.error('Failed to load stats') }
  },
}))
