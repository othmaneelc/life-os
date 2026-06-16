import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useThemeStore } from './themeStore'

const API = '/api/identities'

export function useIdentities() {
  return useQuery({
    queryKey: ['identities'],
    queryFn: async () => {
      const res = await fetch(API)
      if (!res.ok) throw new Error('Failed to load identities')
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateIdentity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to create identity')
      return await res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identities'] }),
  })
}

export function useUpdateIdentity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to update identity')
      return await res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identities'] }),
  })
}

export function useDeleteIdentity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete identity')
      return await res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identities'] }),
  })
}

export function useSwitchIdentity() {
  const qc = useQueryClient()
  const setTheme = useThemeStore(s => s.setTheme)
  const setAccent = useThemeStore(s => s.setAccent)

  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/switch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error('Failed to switch identity')
      return await res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['identities'] })
      if (data.active?.theme) setTheme(data.active.theme)
      if (data.active?.accent_color) setAccent(data.active.accent_color)
    },
  })
}
