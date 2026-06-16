import { useQuery } from '@tanstack/react-query'

const API = '/api/reports'

export function useAnalytics(start, end) {
  return useQuery({
    queryKey: ['analytics', start, end],
    queryFn: async () => {
      const res = await fetch(`${API}/week?start=${start}&end=${end}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      return await res.json()
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 120 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
  })
}
