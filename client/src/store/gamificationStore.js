import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const useGamificationStore = createWithEqualityFn((set) => ({
  totalXp: 0,
  level: 1,
  xpForNextLevel: 100,
  xpProgress: 0,
  achievements: [],
  loading: false,
  showLevelUp: false,
  levelUpData: null,

  dismissLevelUp: () => set({ showLevelUp: false, levelUpData: null }),
  setLocal: (data) => set(data),
}), Object.is)

export const useGamificationStats = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null
  return useQuery({
    queryKey: ['gamificationStats'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/stats')
      if (res.status === 401) return null
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (data.success) {
        return {
          totalXp: data.total_xp || 0,
          level: data.level || 1,
          xpForNextLevel: data.xp_for_next_level || 100,
          xpProgress: data.xp_progress || 0,
          achievements: data.achievements || [],
          stats: data.stats || null,
        }
      }
      return null
    },
    enabled: !!token,
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}

export const useGamificationLeaderboard = () => {
  return useQuery({
    queryKey: ['gamificationLeaderboard'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/leaderboard')
      if (res.status === 401) return null
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
