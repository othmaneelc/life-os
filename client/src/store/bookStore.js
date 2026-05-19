import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/books'

export const useBookStore = create((set, get) => ({
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
}))
