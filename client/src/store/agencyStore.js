import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/agency'

export const useAgencyStore = create((set, get) => ({
  clients: [],
  prospects: [],
  revenues: [],
  outreach: [],
  content: [],
  gbp: [],
  loading: false,

  fetchAll: async () => {
    try {
      const [clientsRes, prospectsRes, revenuesRes, outreachRes, contentRes, gbpRes] = await Promise.all([
        fetch(`${API}/clients`),
        fetch(`${API}/prospects`),
        fetch(`${API}/revenue`),
        fetch(`${API}/outreach`),
        fetch(`${API}/content`),
        fetch(`${API}/gbp`),
      ])
      if (!clientsRes.ok || !prospectsRes.ok || !revenuesRes.ok || !outreachRes.ok || !contentRes.ok || !gbpRes.ok) {
        throw new Error('One or more endpoints failed')
      }
      const [clients, prospects, revenues, outreach, content, gbp] = await Promise.all([
        clientsRes.json(), prospectsRes.json(), revenuesRes.json(),
        outreachRes.json(), contentRes.json(), gbpRes.json(),
      ])
      set({ clients, prospects, revenues, outreach, content, gbp })
    } catch (err) {
      toast.error('Could not load agency data')
    }
  },

  fetchClients: async () => {
    try {
      const res = await fetch(`${API}/clients`)
      if (!res.ok) throw new Error('Failed to load')
      const clients = await res.json()
      set({ clients })
    } catch (err) {
      toast.error('Could not load clients')
    }
  },

  fetchProspects: async () => {
    try {
      const res = await fetch(`${API}/prospects`)
      if (!res.ok) throw new Error('Failed to load')
      const prospects = await res.json()
      set({ prospects })
    } catch (err) {
      toast.error('Could not load prospects')
    }
  },

  fetchRevenue: async () => {
    try {
      const res = await fetch(`${API}/revenue`)
      if (!res.ok) throw new Error('Failed to load')
      const revenues = await res.json()
      set({ revenues })
    } catch (err) {
      toast.error('Could not load revenue data')
    }
  },

  fetchOutreach: async () => {
    try {
      const res = await fetch(`${API}/outreach`)
      if (!res.ok) throw new Error('Failed to load')
      const outreach = await res.json()
      set({ outreach })
    } catch (err) {
      toast.error('Could not load outreach data')
    }
  },

  addProspect: async (prospect) => {
    try {
      const res = await fetch(`${API}/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospect),
      })
      if (!res.ok) throw new Error('Failed to add')
      const p = await res.json()
      set(state => ({ prospects: [p, ...state.prospects] }))
      toast.success('Prospect added')
    } catch (err) {
      toast.error('Failed to add prospect')
    }
  },

  updateProspect: async (id, updates) => {
    try {
      const res = await fetch(`${API}/prospects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      set(state => ({
        prospects: state.prospects.map(p => p.id === id ? updated : p),
      }))
      toast.success('Prospect updated')
    } catch (err) {
      toast.error('Failed to update prospect')
    }
  },

  deleteProspect: async (id) => {
    try {
      const res = await fetch(`${API}/prospects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      set(state => ({ prospects: state.prospects.filter(p => p.id !== id) }))
      toast.success('Prospect deleted')
    } catch (err) {
      toast.error('Failed to delete prospect')
    }
  },

  logOutreach: async (log) => {
    try {
      const res = await fetch(`${API}/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
      if (!res.ok) throw new Error('Failed to log')
      const saved = await res.json()
      get().fetchOutreach()
      toast.success('Outreach logged')
      return saved
    } catch (err) {
      toast.error('Failed to log outreach')
    }
  },

  addRevenue: async (rev) => {
    try {
      const res = await fetch(`${API}/revenue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rev),
      })
      if (!res.ok) throw new Error('Failed to add')
      get().fetchRevenue()
      toast.success('Revenue added')
    } catch (err) {
      toast.error('Failed to add revenue')
    }
  },

  fetchContent: async (client) => {
    try {
      const params = client ? `?client=${encodeURIComponent(client)}` : ''
      const res = await fetch(`${API}/content${params}`)
      if (!res.ok) throw new Error('Failed to load')
      const content = await res.json()
      set({ content })
    } catch (err) {
      toast.error('Could not load content data')
    }
  },

  addContent: async (entry) => {
    try {
      const res = await fetch(`${API}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) throw new Error('Failed to add')
      toast.success('Content logged')
      get().fetchContent()
    } catch (err) {
      toast.error('Failed to log content')
    }
  },

  deleteContent: async (id) => {
    try {
      const res = await fetch(`${API}/content/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      set(state => ({ content: state.content.filter(c => c.id !== id) }))
      toast.success('Content deleted')
    } catch (err) {
      toast.error('Failed to delete content')
    }
  },

  fetchGBP: async () => {
    try {
      const res = await fetch(`${API}/gbp`)
      if (!res.ok) throw new Error('Failed to load')
      const gbp = await res.json()
      set({ gbp })
    } catch (err) {
      toast.error('Could not load GBP data')
    }
  },

  addGBP: async (entry) => {
    try {
      const res = await fetch(`${API}/gbp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) throw new Error('Failed to add')
      toast.success('GBP data logged')
      get().fetchGBP()
    } catch (err) {
      toast.error('Failed to log GBP data')
    }
  },
}))
