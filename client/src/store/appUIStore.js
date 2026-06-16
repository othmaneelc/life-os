import { createWithEqualityFn } from 'zustand/traditional'

export const useAppUIStore = createWithEqualityFn((set) => ({
  focusOpen: false,
  gamificationOpen: false,
  quickAddOpen: false,
  dailyReviewOpen: false,
  voiceRecordingActive: false,
  searchOpen: false,

  toggleFocus: () => set(s => ({ focusOpen: !s.focusOpen })),
  setFocusOpen: (v) => set({ focusOpen: v }),

  toggleGamification: () => set(s => ({ gamificationOpen: !s.gamificationOpen })),
  setGamificationOpen: (v) => set({ gamificationOpen: v }),

  openQuickAdd: () => set({ quickAddOpen: true }),
  setQuickAddOpen: (v) => set({ quickAddOpen: v }),

  openDailyReview: () => set({ dailyReviewOpen: true }),
  setDailyReviewOpen: (v) => set({ dailyReviewOpen: v }),

  setVoiceRecording: (v) => set({ voiceRecordingActive: v }),

  openSearch: () => set({ searchOpen: true }),
  setSearchOpen: (v) => set({ searchOpen: v }),
}), Object.is)
