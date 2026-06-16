import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const API = '/api/vault'

export function useVaultStatus() {
  return useQuery({
    queryKey: ['vault-status'],
    queryFn: async () => {
      const res = await fetch(`${API}/status`)
      if (!res.ok) throw new Error('Failed to check vault status')
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useVaultEntries() {
  return useQuery({
    queryKey: ['vault-entries'],
    queryFn: async () => {
      const res = await fetch(`${API}/entries`)
      if (!res.ok) throw new Error('Failed to load vault entries')
      return await res.json()
    },
    staleTime: 60 * 1000,
  })
}

export function useVaultEntry(id) {
  return useQuery({
    queryKey: ['vault-entry', id],
    queryFn: async () => {
      const res = await fetch(`${API}/entries/${id}`)
      if (!res.ok) throw new Error('Failed to load entry')
      return await res.json()
    },
    enabled: !!id,
  })
}

export function useSetupVault() {
  return useMutation({
    mutationFn: async (password) => {
      const res = await fetch(`${API}/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      return await res.json()
    },
  })
}

export function useUnlockVault() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (password) => {
      const res = await fetch(`${API}/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return await res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault-entries'] }) },
  })
}

export function useResetVault() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/reset`, { method: 'POST' })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      return await res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault-status'] }) },
  })
}

export function useLockVault() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/lock`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to lock')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault-entries'] }) },
  })
}

export function useCreateEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, body }) => {
      const res = await fetch(`${API}/entries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body }) })
      if (!res.ok) throw new Error('Failed to create entry')
      return await res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault-entries'] }) },
  })
}

export function useUpdateEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`${API}/entries/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to update entry')
      return await res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault-entries'] }); qc.invalidateQueries({ queryKey: ['vault-entry'] }) },
  })
}

export function useDeleteEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete entry')
      return await res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vault-entries'] }) },
  })
}
