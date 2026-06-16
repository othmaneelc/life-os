import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/books'

export function useBooks(status) {
  return useQuery({
    queryKey: ['books', status],
    queryFn: async () => {
      const params = status && status !== 'all' ? `?status=${status}` : ''
      const r = await fetch(API + params)
      if (!r.ok) throw new Error()
      return r.json()
    },
    staleTime: 30000,
  })
}

export function useAddBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (book) => {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(book) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); toast.success('Book added') },
    onError: () => toast.error('Failed to add book'),
  })
}

export function useUpdateBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const r = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); toast.success('Book updated') },
    onError: () => toast.error('Failed to update book'),
  })
}

export function useDeleteBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => { const r = await fetch(`${API}/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error() },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); toast.success('Book deleted') },
    onError: () => toast.error('Failed to delete book'),
  })
}

export function useBookNotes(bookId) {
  return useQuery({
    queryKey: ['bookNotes', bookId],
    queryFn: async () => {
      const r = await fetch(`${API}/${bookId}/notes`)
      if (!r.ok) throw new Error()
      return r.json()
    },
    enabled: !!bookId,
  })
}

export const useBookStore = createWithEqualityFn((set, get) => ({
  books: [],
  notes: [],
  loading: false,

  fetchBooks: async (status) => {
    set({ loading: true })
    try {
      const params = status && status !== 'all' ? `?status=${status}` : ''
      const res = await fetch(API + params)
      if (!res.ok) throw new Error()
      set({ books: await res.json(), loading: false })
    } catch { set({ loading: false }); toast.error('Failed to load books') }
  },

  addBook: async (book) => {
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(book) })
      if (!res.ok) throw new Error()
      await get().fetchBooks()
      toast.success('Book added')
    } catch { toast.error('Failed to add book') }
  },

  updateBook: async (id, updates) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) throw new Error()
      await get().fetchBooks()
      toast.success('Book updated')
    } catch { toast.error('Failed to update book') }
  },

  deleteBook: async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      set(state => ({ books: state.books.filter(b => b.id !== id) }))
      toast.success('Book deleted')
    } catch { toast.error('Failed to delete book') }
  },

  fetchNotes: async (bookId) => {
    try {
      const res = await fetch(`${API}/${bookId}/notes`)
      if (!res.ok) throw new Error()
      set({ notes: await res.json() })
    } catch { toast.error('Failed to load notes') }
  },

  addNote: async (bookId, note) => {
    try {
      const res = await fetch(`${API}/${bookId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(note) })
      if (!res.ok) throw new Error()
      await get().fetchNotes(bookId)
      toast.success('Note added')
    } catch { toast.error('Failed to add note') }
  },

  updateNote: async (bookId, noteId, updates) => {
    try {
      const res = await fetch(`${API}/${bookId}/notes/${noteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) throw new Error()
      await get().fetchNotes(bookId)
    } catch { toast.error('Failed to update note') }
  },

  deleteNote: async (bookId, noteId) => {
    try {
      const res = await fetch(`${API}/${bookId}/notes/${noteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await get().fetchNotes(bookId)
    } catch { toast.error('Failed to delete note') }
  },
}), Object.is)
