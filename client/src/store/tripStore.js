import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { extractArray } from '../utils/api'

const API = '/api/trips'

export const useTrips = () => {
  return useQuery({
    queryKey: ['trips'],
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

export const useTrip = (id) => {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const res = await fetch(`${API}/${id}`)
      if (!res.ok) throw new Error('Failed to load')
      return await res.json()
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export const useAddTrip = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to add')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      toast.success('Trip added')
    },
    onError: () => toast.error('Failed to add trip'),
  })
}

export const useUpdateTrip = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) throw new Error('Failed to update')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      toast.success('Trip updated')
    },
    onError: () => toast.error('Failed to update trip'),
  })
}

export const useDeleteTrip = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      toast.success('Trip deleted')
    },
    onError: () => toast.error('Failed to delete trip'),
  })
}

export const useAddTripExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tripId, data }) => {
      const res = await fetch(`${API}/${tripId}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to add expense')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      toast.success('Expense added')
    },
    onError: () => toast.error('Failed to add expense'),
  })
}

export const useDeleteTripExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tripId, expenseId }) => {
      const res = await fetch(`${API}/${tripId}/expenses/${expenseId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip'] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      toast.success('Expense deleted')
    },
    onError: () => toast.error('Failed to delete expense'),
  })
}
