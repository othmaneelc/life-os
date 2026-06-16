import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/schedule'

export const useScheduleStore = createWithEqualityFn((set) => ({
  viewMode: 'week',
  selectedDate: new Date(),
  showModal: false,
  editingBlock: null,
  showMiniCal: false,
  searchQuery: '',
  syncToGoogle: true,
  showDetails: null,
  dragResize: null,
  naturalInput: '',
  loading: true,

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedDate: (d) => set({ selectedDate: d }),
  setShowModal: (v) => set({ showModal: v }),
  setEditingBlock: (b) => set({ editingBlock: b }),
  setShowMiniCal: (v) => set({ showMiniCal: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSyncToGoogle: (v) => set({ syncToGoogle: v }),
  setShowDetails: (d) => set({ showDetails: d }),
  setDragResize: (d) => set({ dragResize: d }),
  setNaturalInput: (v) => set({ naturalInput: v }),
  setLoading: (v) => set({ loading: v }),

  navigate: (dir) => set((s) => {
    const d = new Date(s.selectedDate)
    if (s.viewMode === 'day') d.setDate(d.getDate() + dir)
    else if (s.viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else if (s.viewMode === 'month') d.setMonth(d.getMonth() + dir)
    return { selectedDate: d }
  }),

  goToday: () => set({ selectedDate: new Date() }),

  openNewEvent: () => set({ editingBlock: null, naturalInput: '', showModal: true }),
  openEditEvent: (block) => set({ editingBlock: block, showModal: true }),
  closeModal: () => set({ showModal: false, editingBlock: null, naturalInput: '' }),
  openDetails: (event) => set({ showDetails: event }),
  closeDetails: () => set({ showDetails: null }),
}), Object.is)

export function useScheduleBlocks() {
  return useQuery({
    queryKey: ['scheduleBlocks'],
    queryFn: async () => {
      const res = await fetch(API)
      if (res.status === 401) return []
      if (!res.ok) throw new Error('Failed to load schedule')
      const data = await res.json()
      return Array.isArray(data) ? data : data?.blocks ?? []
    },
    staleTime: 15000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
}

export function useScheduleTemplates() {
  return useQuery({
    queryKey: ['scheduleTemplates'],
    queryFn: async () => {
      const res = await fetch(`${API}/templates`)
      if (res.status === 401) return []
      if (!res.ok) throw new Error('Failed to load templates')
      return res.json()
    },
    staleTime: 300000,
    retry: 1,
  })
}

export function useGoogleCalendarEvents(startDate, endDate) {
  return useQuery({
    queryKey: ['googleEvents', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/events-range?startDate=${startDate}&endDate=${endDate}`)
      if (res.status === 401) return []
      if (!res.ok) throw new Error('Failed to load Google events')
      const data = await res.json()
      return data.events || []
    },
    staleTime: 30000,
    retry: 1,
    enabled: !!startDate && !!endDate,
  })
}

export function useGcalStatus() {
  return useQuery({
    queryKey: ['gcalStatus'],
    queryFn: async () => {
      const res = await fetch('/api/calendar/status')
      if (res.status === 401) return { connected: false }
      if (!res.ok) return { connected: false }
      return res.json()
    },
    staleTime: 60000,
    retry: 1,
  })
}

export function useAddScheduleBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (block) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block),
      })
      if (!res.ok) throw new Error('Failed to add block')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduleBlocks'] })
      toast.success('Block added')
    },
    onError: () => toast.error('Failed to add block'),
  })
}

export function useUpdateScheduleBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update block')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduleBlocks'] })
      toast.success('Block updated')
    },
    onError: () => toast.error('Failed to update block'),
  })
}

export function useDeleteScheduleBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete block')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduleBlocks'] })
    },
    onError: () => toast.error('Failed to delete block'),
  })
}

export function useDeleteScheduleTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete template')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduleTemplates'] })
    },
    onError: () => toast.error('Failed to delete template'),
  })
}
