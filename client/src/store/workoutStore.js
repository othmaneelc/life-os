import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { extractArray } from '../utils/api'

const API = '/api/workouts'

export const useWorkouts = () => {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const res = await fetch(API)
      if (!res.ok) throw new Error('Failed to load')
      return extractArray(await res.json())
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export const useAddWorkout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to add')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      toast.success('Workout added')
    },
    onError: () => toast.error('Failed to add workout'),
  })
}

export const useUpdateWorkout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to update')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      toast.success('Workout updated')
    },
    onError: () => toast.error('Failed to update workout'),
  })
}

export const useDeleteWorkout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      toast.success('Workout deleted')
    },
    onError: () => toast.error('Failed to delete workout'),
  })
}
