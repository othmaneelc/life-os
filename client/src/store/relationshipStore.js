import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { extractArray } from '../utils/api'

const API = '/api/relationships'

export const useRelationships = (type = 'all') => {
  return useQuery({
    queryKey: ['relationships', type],
    queryFn: async () => {
      const params = type && type !== 'all' ? `?type=${type}` : ''
      const res = await fetch(`${API}${params}`)
      if (!res.ok) throw new Error('Failed to load')
      return extractArray(await res.json())
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export const useAddRelationship = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to add')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] })
      toast.success('Relationship added')
    },
    onError: () => toast.error('Failed to add relationship'),
  })
}

export const useUpdateRelationship = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) throw new Error('Failed to update')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] })
      toast.success('Relationship updated')
    },
    onError: () => toast.error('Failed to update relationship'),
  })
}

export const useDeleteRelationship = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships'] })
      toast.success('Relationship deleted')
    },
    onError: () => toast.error('Failed to delete relationship'),
  })
}
