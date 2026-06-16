import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/pomodoro'

export function usePomodoroStats(start, end) {
  return useQuery({ queryKey: ['pomodoroStats', start, end], queryFn: async () => { const r = await fetch(`${API}/stats?start=${start}&end=${end}`); if (!r.ok) throw new Error(); return r.json() }, enabled: !!start && !!end, staleTime: 60000 })
}

export function useAddPomodoroSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (session) => {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pomodoroStats'] }); toast.success('Pomodoro saved') },
    onError: () => toast.error('Failed to save session'),
  })
}

export const usePomodoroStore = createWithEqualityFn((set, get) => ({
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
}), Object.is)
