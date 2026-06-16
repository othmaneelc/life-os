import { useQuery } from '@tanstack/react-query'

const API = '/api/weekly'

export function useWeeklyReview() {
  return useQuery({
    queryKey: ['weekly-review'],
    queryFn: async () => {
      const res = await fetch(`${API}/current`)
      if (!res.ok) throw new Error('Failed to load weekly review')
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
