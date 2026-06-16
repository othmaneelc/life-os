import { useQuery } from '@tanstack/react-query'

async function fetchSettings() {
  const res = await fetch('/api/settings')
  if (res.status === 401) return null
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export function useSettings() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null
  return useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
