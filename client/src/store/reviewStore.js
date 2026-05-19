import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/reviews'

export const useReviewStore = create((set, get) => ({
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
}))
