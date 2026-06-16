import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API = '/api/goals'

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await fetch(API)
      if (!res.ok) throw new Error('Failed to load goals')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAddGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (goal) => {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goal) })
      if (!res.ok) throw new Error('Failed to add goal')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal added') },
    onError: () => toast.error('Failed to add goal'),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) throw new Error('Failed to update goal')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal updated') },
    onError: () => toast.error('Failed to update goal'),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete goal')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Goal deleted') },
    onError: () => toast.error('Failed to delete goal'),
  })
}

export function useAddStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, title }) => {
      const res = await fetch(`${API}/${goalId}/steps`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
      if (!res.ok) throw new Error('Failed to add step')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
    onError: () => toast.error('Failed to add step'),
  })
}

export function useToggleStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, stepId }) => {
      const res = await fetch(`${API}/${goalId}/steps/${stepId}`, { method: 'PUT' })
      if (!res.ok) throw new Error('Failed to toggle step')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
    onError: () => toast.error('Failed to toggle step'),
  })
}

export function useDeleteStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, stepId }) => {
      const res = await fetch(`${API}/${goalId}/steps/${stepId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete step')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
    onError: () => toast.error('Failed to delete step'),
  })
}

export function useLinkHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, habit_id }) => {
      const res = await fetch(`${API}/${goalId}/habits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ habit_id }) })
      if (!res.ok) throw new Error('Failed to link habit')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Habit linked') },
    onError: () => toast.error('Failed to link habit'),
  })
}

export function useUnlinkHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, habitId }) => {
      const res = await fetch(`${API}/${goalId}/habits/${habitId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to unlink habit')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
    onError: () => toast.error('Failed to unlink habit'),
  })
}
