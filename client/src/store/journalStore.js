import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/journal'

export function useJournalEntries() {
  return useQuery({ queryKey: ['journalEntries'], queryFn: async () => { const r = await fetch(API); if (!r.ok) throw new Error(); return r.json() }, staleTime: 30000 })
}

export function useJournalEntry(date) {
  return useQuery({ queryKey: ['journalEntry', date], queryFn: async () => { const r = await fetch(`${API}/${date}`); if (!r.ok) throw new Error(); return r.json() }, enabled: !!date })
}

export function useSaveEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry) => {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journalEntries'] }); qc.invalidateQueries({ queryKey: ['journalEntry'] }); toast.success('Entry saved') },
    onError: () => toast.error('Failed to save entry'),
  })
}

export function useDeleteEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['journalEntries'] }); toast.success('Entry deleted') },
    onError: () => toast.error('Failed to delete entry'),
  })
}

export function useUploadPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ entry_date, photo_data, caption }) => {
      const r = await fetch(`${API}/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entry_date, photo_data, caption }) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalPhotos'] }),
    onError: () => toast.error('Failed to upload photo'),
  })
}

export function useDeletePhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => { await fetch(`${API}/photos/${id}`, { method: 'DELETE' }) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journalPhotos'] }),
  })
}

export function useMoodTrend() {
  return useQuery({ queryKey: ['moodTrend'], queryFn: async () => { const r = await fetch(`${API}/mood-trend`); if (!r.ok) throw new Error(); return r.json() }, staleTime: 60000 })
}

export function useJournalPhotos(date) {
  return useQuery({ queryKey: ['journalPhotos', date], queryFn: async () => { const r = await fetch(`${API}/photos/${date}`); if (!r.ok) throw new Error(); return r.json() }, enabled: !!date })
}

export const useJournalStore = createWithEqualityFn((set, get) => ({
  entries: [],
  currentEntry: null,
  loading: false,
  searchResults: null,
  moodTrend: [],
  photos: [],
  aiSummary: null,
  aiSummaryLoading: false,

  fetchEntries: async () => {
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error('Failed to load')
      const entries = await res.json()
      set({ entries })
    } catch {
      toast.error('Could not load journal entries')
    }
  },

  fetchEntry: async (date) => {
    try {
      const res = await fetch(`${API}/${date}`)
      if (!res.ok) throw new Error('Failed to load')
      const entry = await res.json()
      set({ currentEntry: entry })
      return entry
    } catch {
      return null
    }
  },

  saveEntry: async (entry) => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) throw new Error('Failed to save')
      const saved = await res.json()
      set({ currentEntry: saved })
      get().fetchEntries()
      return saved
    } catch {
      toast.error('Failed to save journal entry')
      return null
    }
  },

  searchEntries: async (query) => {
    if (!query) { set({ searchResults: null }); return }
    try {
      const res = await fetch(`${API}?search=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Failed to search')
      const results = await res.json()
      set({ searchResults: results })
    } catch { toast.error('Search failed') }
  },

  deleteEntry: async (id) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' })
      set(state => ({ entries: state.entries.filter(e => e.id !== id) }))
      toast.success('Entry deleted')
    } catch { toast.error('Failed to delete entry') }
  },

  fetchMoodTrend: async () => {
    try {
      const res = await fetch(`${API}/mood-trend`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      set({ moodTrend: data })
    } catch { console.error('fetchMoodTrend failed') }
  },

  fetchPhotos: async (date) => {
    try {
      const res = await fetch(`${API}/photos/${date}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      set({ photos: data })
    } catch { console.error('fetchPhotos failed') }
  },

  uploadPhoto: async (entry_date, photo_data, caption) => {
    try {
      const res = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_date, photo_data, caption }),
      })
      if (!res.ok) throw new Error()
      const photo = await res.json()
      set(state => ({ photos: [...state.photos, photo] }))
      return photo
    } catch { toast.error('Failed to upload photo') }
  },

  deletePhoto: async (id) => {
    try {
      await fetch(`${API}/photos/${id}`, { method: 'DELETE' })
      set(state => ({ photos: state.photos.filter(p => p.id !== id) }))
    } catch { toast.error('Failed to delete photo') }
  },

  fetchAISummary: async (date) => {
    set({ aiSummaryLoading: true })
    try {
      const res = await fetch(`${API}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      set({ aiSummary: data.summary, aiSummaryLoading: false })
    } catch { console.error('fetchAISummary failed'); set({ aiSummaryLoading: false }) }
  },
}), Object.is)

