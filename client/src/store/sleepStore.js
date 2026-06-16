import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { extractArray } from '../utils/api'

const API = '/api/sleep'

export const useSleepLogs = () => {
  return useQuery({
    queryKey: ['sleepLogs'],
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

export const useCurrentSleep = () => {
  return useQuery({
    queryKey: ['sleepCurrent'],
    queryFn: async () => {
      const res = await fetch(`${API}/current`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      return data || null
    },
    staleTime: 30 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export const useLogSleep = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepLogs'] })
      queryClient.invalidateQueries({ queryKey: ['sleepCurrent'] })
      toast.success('Sleep log saved')
    },
    onError: () => {
      toast.error('Failed to save sleep log')
    }
  })
}

export const useDeleteSleep = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepLogs'] })
      queryClient.invalidateQueries({ queryKey: ['sleepCurrent'] })
      toast.success('Sleep log deleted')
    },
    onError: () => {
      toast.error('Failed to delete sleep log')
    }
  })
}
