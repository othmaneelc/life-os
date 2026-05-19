import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/knowledge'

export const useKnowledgeStore = create((set, get) => ({
  documents: [],
  searchResults: null,
  aiAnswer: null,

  fetchAll: async () => {
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      set({ documents: await res.json(), searchResults: null })
    } catch { toast.error('Failed to load documents') }
  },

  search: async (query) => {
    if (!query) { set({ searchResults: null, aiAnswer: null }); return }
    try {
      const res = await fetch(`${API}?search=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      set({ searchResults: await res.json() })
    } catch { toast.error('Search failed') }
  },

  add: async (doc) => {
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      toast.success('Document added')
      get().fetchAll()
      return await res.json()
    } catch { toast.error('Failed to add document') }
  },

  update: async (id, updates) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      toast.success('Document updated')
      get().fetchAll()
    } catch { toast.error('Failed to update') }
  },

  remove: async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      set(state => ({ documents: state.documents.filter(d => d.id !== id) }))
      toast.success('Document deleted')
    } catch { toast.error('Failed to delete') }
  },

  askAI: async (question) => {
    try {
      set({ aiAnswer: null })
      const res = await fetch(`${API}/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      set({ aiAnswer: data })
      return data
    } catch { toast.error('AI query failed'); return null }
  },
}))
