import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API = '/api/agents'

export const useAgentStore = createWithEqualityFn((set) => ({
  logs: [],

  setLogs: (logs) => set({ logs }),
}), Object.is)

export const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch(API)
      if (!res.ok) throw new Error('Failed to load agents')
      const data = await res.json()
      return data.success ? data.agents : []
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export const useCreateAgent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (agent) => {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(agent) })
      if (!res.ok) throw new Error('Failed to create agent')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export const useUpdateAgent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) throw new Error('Failed to update agent')
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export const useDeleteAgent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete agent')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export const useRunAgent = () => {
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}/run`, { method: 'POST' })
      return await res.json()
    },
  })
}

export const useToggleAgent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}/toggle`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to toggle')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export const useAgentLogs = (agentId) => {
  return useQuery({
    queryKey: ['agentLogs', agentId],
    queryFn: async () => {
      const res = await fetch(`${API}/${agentId}/logs`)
      if (!res.ok) throw new Error('Failed to load logs')
      const data = await res.json()
      return data.success ? data.logs : []
    },
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!agentId,
  })
}
