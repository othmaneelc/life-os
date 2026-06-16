import { useQuery } from '@tanstack/react-query'

export function usePatterns() {
  return useQuery({
    queryKey: ['patterns'],
    queryFn: async () => {
      const res = await fetch('/api/patterns')
      if (!res.ok) throw new Error('Failed to load patterns')
      return await res.json()
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
