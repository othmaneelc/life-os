import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/reviews'

export function useTodayReview(date) {
  return useQuery({
    queryKey: ['todayReview', date],
    queryFn: async () => {
      if (!date) return null
      const res = await fetch(`${API}?date=${encodeURIComponent(date)}`)
      if (!res.ok) throw new Error('Failed to load review')
      return res.json()
    },
    enabled: !!date,
    staleTime: 30000,
  })
}

export function useReviewStats(start, end) {
  return useQuery({
    queryKey: ['reviewStats', start, end],
    queryFn: async () => {
      const res = await fetch(`${API}/stats?start=${start}&end=${end}`)
      if (!res.ok) throw new Error('Failed to load review stats')
      return res.json()
    },
    enabled: !!start && !!end,
  })
}

export function useSaveReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (review) => {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review) })
      if (!res.ok) throw new Error('Failed to save review')
      return res.json()
    },
    onSuccess: (_, review) => {
      qc.invalidateQueries({ queryKey: ['todayReview', review?.date || review?.today] })
      qc.invalidateQueries({ queryKey: ['reviews'] })
      toast.success('Review saved')
    },
    onError: () => toast.error('Failed to save review'),
  })
}

export const useReviewStore = createWithEqualityFn((set, get) => ({
  todayReview: null,
  reviews: [],
  stats: null,

  fetchToday: async (date) => {
    try {
      const res = await fetch(`${API}?date=${encodeURIComponent(date)}`)
      if (!res.ok) throw new Error(`Failed to load review: ${res.status}`)
      const r = await res.json()
      set({ todayReview: r })
      return r
    } catch { toast.error('Failed to load review'); return null }
  },

  save: async (review) => {
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review) })
      if (!res.ok) throw new Error(`Failed to load review: ${res.status}`)
      const r = await res.json()
      set({ todayReview: r })
      get().fetchReviews()
      toast.success('Review saved')
      return r
    } catch { toast.error('Failed to save review'); return null }
  },

  fetchReviews: async () => {
    try {
      const res = await fetch(`${API}?limit=30`)
      if (!res.ok) throw new Error(`Failed to load review: ${res.status}`)
      set({ reviews: await res.json() })
    } catch { toast.error('Failed to load reviews') }
  },

  fetchStats: async (start, end) => {
    try {
      const res = await fetch(`${API}/stats?start=${start}&end=${end}`)
      if (!res.ok) throw new Error(`Failed to load review: ${res.status}`)
      set({ stats: await res.json() })
    } catch { toast.error('Failed to load stats') }
  },
}), Object.is)
