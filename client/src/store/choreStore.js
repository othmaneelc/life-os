import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const TASKS_API = '/api/tasks'
const CHORES_API = '/api/chores'

export const useChores = () => {
  return useQuery({
    queryKey: ['chores'],
    queryFn: async () => {
      const res = await fetch(`${TASKS_API}?category=schedule`)
      if (!res.ok) throw new Error('Failed to load chores')
      const data = await res.json()
      return Array.isArray(data) ? data : (data.value || [])
    },
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export const useChoreStats = (tasks) => {
  if (!tasks) return { total: 0, done: 0, inprogress: 0 }
  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const inprogress = tasks.filter(t => t.status === 'inprogress').length
  return { total, done, inprogress }
}

export const useToggleChore = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, currentStatus }) => {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done'
      const res = await fetch(`${TASKS_API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return { id, newStatus }
    },
    onSuccess: ({ newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      toast.success(newStatus === 'done' ? 'Chore completed!' : 'Chore reopened')
    },
    onError: () => toast.error('Failed to update chore'),
  })
}

export const useDeleteChore = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${TASKS_API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      toast.success('Chore deleted')
    },
    onError: () => toast.error('Failed to delete chore'),
  })
}

export const useGenerateChores = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${CHORES_API}/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chores'] })
      toast.success(`Generated ${data.generated} chores`)
    },
    onError: (err) => toast.error(err.message),
  })
}
