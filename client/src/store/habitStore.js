import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/habits'

export function useHabits() {
  return useQuery({ queryKey: ['habits'], queryFn: async () => { const r = await fetch(API); if (!r.ok) throw new Error(); return r.json() }, staleTime: 30000 })
}

export function useTodayHabits() {
  return useQuery({ queryKey: ['todayHabits'], queryFn: async () => { const r = await fetch(`${API}/today`); if (!r.ok) throw new Error(); return r.json() }, staleTime: 15000 })
}

export function useHabitWeek() {
  return useQuery({ queryKey: ['habitWeek'], queryFn: async () => { const r = await fetch(`${API}/week`); if (!r.ok) throw new Error(); return r.json() }, staleTime: 30000 })
}

export function useHabitStats() {
  return useQuery({ queryKey: ['habitStats'], queryFn: async () => { const r = await fetch(`${API}/stats`); if (!r.ok) throw new Error(); return r.json() }, staleTime: 60000 })
}

export function useHabitMonthLogs(start, end) {
  return useQuery({ queryKey: ['habitMonthLogs', start, end], queryFn: async () => { const r = await fetch(`${API}/month?start=${start}&end=${end}`); if (!r.ok) throw new Error(); return r.json() }, enabled: !!start && !!end })
}

export function useToggleHabitLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ habitId, date, done }) => {
      const r = await fetch(`${API}/log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ habit_id: habitId, date, done }) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onMutate: async ({ habitId, date, done }) => {
      await qc.cancelQueries({ queryKey: ['todayHabits'] })
      await qc.cancelQueries({ queryKey: ['habitWeek'] })
      await qc.cancelQueries({ queryKey: ['habitStats'] })
      const previousTodayHabits = qc.getQueryData(['todayHabits'])
      const previousHabitWeek = qc.getQueryData(['habitWeek'])
      if (previousTodayHabits) {
        qc.setQueryData(['todayHabits'], (old) => old.map(h => h.id === habitId ? { ...h, done_today: done } : h))
      }
      if (previousHabitWeek) {
        qc.setQueryData(['habitWeek'], (old) => ({
          ...old,
          habits: old.habits.map(h => {
            if (h.id !== habitId) return h
            const existing = h.logs?.find(l => l.date === date)
            if (done) {
              const entry = { date, done: true }
              return { ...h, logs: existing ? h.logs.map(l => l.date === date ? entry : l) : [...(h.logs || []), entry] }
            }
            return { ...h, logs: h.logs?.filter(l => l.date !== date) || [] }
          })
        }))
      }
      return { previousTodayHabits, previousHabitWeek }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTodayHabits) qc.setQueryData(['todayHabits'], context.previousTodayHabits)
      if (context?.previousHabitWeek) qc.setQueryData(['habitWeek'], context.previousHabitWeek)
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['todayHabits'] }); qc.invalidateQueries({ queryKey: ['habitWeek'] }); qc.invalidateQueries({ queryKey: ['habitStats'] }); qc.invalidateQueries({ queryKey: ['habitMonthLogs'] }) },
  })
}

export function useAddHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, category, frequency }) => {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category, frequency }) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit added') },
    onError: () => toast.error('Failed to add habit'),
  })
}

export function useAddHabitsBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (templates) => {
      let count = 0
      for (const t of templates) {
        try {
          const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: t.name, category: t.category, frequency: t.frequency }) })
          if (r.ok) count++
        } catch {}
      }
      return count
    },
    onSuccess: (count) => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success(`${count} habits added`) },
    onError: () => toast.error('Failed to add habits'),
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const r = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit updated') },
    onError: () => toast.error('Failed to update habit'),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Habit deleted') },
    onError: () => toast.error('Failed to delete habit'),
  })
}

export function useReorderHabits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (order) => {
      const r = await fetch(`${API}/reorder`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }) })
      if (!r.ok) throw new Error()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export const useHabitStore = createWithEqualityFn((set, get) => ({
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
      const res = await fetch(`${API}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      })
      if (!res.ok) throw new Error()
    } catch (err) {
      toast.error('Failed to save order')
    }
  },
}), Object.is)


