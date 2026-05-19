import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/journal'

export const useJournalStore = create((set, get) => ({
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
      const data = await res.json()
      set({ moodTrend: data })
    } catch {}
  },

  fetchPhotos: async (date) => {
    try {
      const res = await fetch(`${API}/photos/${date}`)
      const data = await res.json()
      set({ photos: data })
    } catch {}
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
      const data = await res.json()
      set({ aiSummary: data.summary, aiSummaryLoading: false })
    } catch { set({ aiSummaryLoading: false }) }
  },
}))

