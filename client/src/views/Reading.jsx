import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Search, Star, Trash2, Edit3, X, ChevronRight, Target } from 'lucide-react'
import { useBookStore } from '../store/bookStore'
import Modal from '../components/Modal'

const STATUSES = ['want_to_read', 'reading', 'finished']
const STATUS_LABELS = { want_to_read: 'Want to Read', reading: 'Reading', finished: 'Finished' }
const GENRES = ['Fiction', 'Non-Fiction', 'Self-Help', 'Business', 'Islamic', 'Science', 'Technology', 'Biography', 'History', 'Philosophy', 'Other']

function LoadingSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-5 h-5 bg-apple-surface rounded animate-shimmer" /><div className="w-24 h-7 bg-apple-surface rounded animate-shimmer" /></div>
        <div className="w-28 h-9 bg-apple-surface rounded animate-shimmer" />
      </div>
      <div className="flex gap-3"><div className="w-64 h-9 bg-apple-surface rounded animate-shimmer" /><div className="w-64 h-9 bg-apple-surface rounded animate-shimmer" /></div>
      <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-apple-surface rounded animate-shimmer" />)}</div>
      {[1,2,3,4].map(i => <div key={i} className="h-16 bg-apple-surface rounded animate-shimmer" />)}
    </div>
  )
}

export default function Reading() {
  const { books, notes, fetchBooks, addBook, updateBook, deleteBook, fetchNotes, addNote, deleteNote } = useBookStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [form, setForm] = useState({ title: '', author: '', genre: '', total_pages: '', current_page: '', cover_url: '', status: 'want_to_read', goal_pages: '' })
  const [selectedBook, setSelectedBook] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchBooks(statusFilter).catch(() => {}) }, [statusFilter])

  useEffect(() => {
    if (selectedBook) fetchNotes(selectedBook.id).catch(() => {})
  }, [selectedBook?.id])

  const filtered = books.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.author?.toLowerCase().includes(search.toLowerCase())
  )

  const readingGoal = useMemo(() => {
    const finished = books.filter(b => b.status === 'finished').length
    const goal = parseInt(localStorage.getItem('reading_goal') || '12')
    return { goal, finished, progress: goal > 0 ? Math.round((finished / goal) * 100) : 0 }
  }, [books])

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    const payload = { title: form.title, author: form.author, genre: form.genre, total_pages: parseInt(form.total_pages) || 0, current_page: parseInt(form.current_page) || 0, cover_url: form.cover_url, status: form.status }
    if (editingBook) {
      updateBook(editingBook.id, payload)
    } else {
      addBook(payload)
    }
    setShowModal(false)
    setEditingBook(null)
    setForm({ title: '', author: '', genre: '', total_pages: '', current_page: '', cover_url: '', status: 'want_to_read', goal_pages: '' })
  }

  function openAddModal() {
    setEditingBook(null)
    setForm({ title: '', author: '', genre: '', total_pages: '', current_page: '', cover_url: '', status: 'want_to_read', goal_pages: '' })
    setShowModal(true)
  }

  function openEditModal(book) {
    setEditingBook(book)
    setForm({
      title: book.title,
      author: book.author || '',
      genre: book.genre || '',
      total_pages: String(book.total_pages || ''),
      current_page: String(book.current_page || ''),
      cover_url: book.cover_url || '',
      status: book.status,
      goal_pages: String(book.goal_pages || ''),
    })
    setShowModal(true)
  }

  if (books.length === 0 && statusFilter === 'all') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen size={22} className="text-apple-muted" />
            <h1 className="text-heading font-semibold">Reading</h1>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={openAddModal} className="btn-primary flex items-center gap-1">
            <Plus size={15} /> Add Book
          </motion.button>
        </div>
        <div className="card text-center py-16">
          <BookOpen size={40} className="mx-auto mb-4 opacity-20 text-apple-muted" />
          <p className="text-body text-apple-muted">No books yet</p>
          <p className="text-small text-apple-muted mt-1">Add your first book to start tracking</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={openAddModal} className="btn-primary mt-4 inline-flex items-center gap-1">
            <Plus size={15} /> Add Your First Book
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen size={22} className="text-apple-muted" />
          <h1 className="text-heading font-semibold">Reading</h1>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openAddModal} className="btn-primary flex items-center gap-1">
          <Plus size={15} /> Add Book
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books..." className="input-field text-small pl-8" />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-apple-surface">
          {['all', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-small font-medium transition-all ${statusFilter === s ? 'bg-apple-tab shadow-sm' : 'text-apple-muted hover:text-apple-text'}`}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats + Reading Goal */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: books.length, color: 'text-apple-blue' },
          { label: 'Reading', value: books.filter(b => b.status === 'reading').length, color: 'text-apple-green' },
          { label: 'Finished', value: books.filter(b => b.status === 'finished').length, color: 'text-apple-purple' },
          { label: 'Notes', value: books.reduce((s, b) => s + (b.note_count || 0), 0), color: 'text-apple-amber' },
          { label: 'Goal', value: `${readingGoal.finished}/${readingGoal.goal}`, color: 'text-apple-red', goal: readingGoal.progress },
        ].map(s => (
          <div key={s.label} className="card relative">
            <div className="text-small text-apple-muted mb-1">{s.label}</div>
            <div className={`text-heading font-semibold ${s.color}`}>{s.value}</div>
            {s.goal !== undefined && (
              <div className="mt-2 h-1 bg-apple-surface rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${s.goal}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full rounded-full bg-apple-red" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Book Grid */}
        <div className="space-y-2">
          {filtered.map((book, i) => (
            <motion.div key={book.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.02 } }}
              layout
              onClick={() => setSelectedBook(selectedBook?.id === book.id ? null : book)}
              className={`card cursor-pointer transition-all ${selectedBook?.id === book.id ? 'ring-1 ring-apple-blue' : 'hover:bg-apple-surface/50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-8 h-11 rounded object-cover flex-shrink-0" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                  ) : null}
                  <div className="w-8 h-11 rounded bg-apple-surface flex items-center justify-center flex-shrink-0" style={{ display: book.cover_url ? 'none' : 'flex' }}>
                    <BookOpen size={14} className="text-apple-muted" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-body font-medium truncate">{book.title}</h3>
                    <div className="text-small text-apple-muted">{book.author || 'Unknown author'}{book.genre ? ` · ${book.genre}` : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className={`badge ${book.status === 'finished' ? 'badge-green' : book.status === 'reading' ? 'badge-blue' : 'badge-gray'} text-micro`}>
                    {STATUS_LABELS[book.status]}
                  </span>
                  {book.rating && <div className="flex items-center gap-0.5"><Star size={12} className="text-apple-amber fill-apple-amber" /><span className="text-small text-apple-muted">{book.rating}</span></div>}
                </div>
              </div>
              {book.status === 'reading' && book.total_pages > 0 && (
                <div className="mt-2 h-1 bg-apple-surface rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round((book.current_page || 0) / book.total_pages * 100)}%` }} transition={{ duration: 0.4 }} className="h-full rounded-full bg-apple-blue" />
                </div>
              )}
            </motion.div>
          ))}
          {!filtered.length && (
            <div className="card text-center py-12">
              <BookOpen size={32} className="mx-auto mb-3 opacity-30 text-apple-muted" />
              <p className="text-body text-apple-muted">No books match your filters</p>
            </div>
          )}
        </div>

        {/* Book Detail / Notes Panel */}
        <AnimatePresence mode="wait">
          {selectedBook ? (
            <motion.div key={selectedBook.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-subheading font-semibold truncate">{selectedBook.title}</h3>
                <button onClick={() => setSelectedBook(null)} className="p-1 hover:bg-apple-surface rounded"><X size={14} className="text-apple-muted" /></button>
              </div>
              {selectedBook.cover_url && (
                <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-full h-40 object-contain rounded-md mb-3 bg-apple-surface/50" />
              )}
              <div className="space-y-2 text-small text-apple-muted mb-4">
                <p>Author: <span className="text-apple-text">{selectedBook.author || '—'}</span></p>
                <p>Genre: <span className="text-apple-text">{selectedBook.genre || '—'}</span></p>
                {selectedBook.total_pages > 0 && (
                  <p>Pages: <span className="text-apple-text">{selectedBook.current_page || 0} / {selectedBook.total_pages}</span></p>
                )}
                {selectedBook.rating && <p>Rating: <span className="text-apple-text">{selectedBook.rating}/5</span></p>}
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => openEditModal(selectedBook)} className="btn-ghost text-small flex items-center gap-1"><Edit3 size={12} /> Edit</button>
                <button onClick={() => deleteBook(selectedBook.id).then(() => setSelectedBook(null))} className="btn-ghost text-apple-red text-small flex items-center gap-1"><Trash2 size={12} /> Delete</button>
              </div>

              {selectedBook.status === 'reading' && selectedBook.total_pages > 0 && (
                <div className="mb-3">
                  <div className="section-label mb-1">Progress</div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={selectedBook.total_pages} value={selectedBook.current_page || 0} onChange={e => { const v = parseInt(e.target.value) || 0; updateBook(selectedBook.id, { current_page: Math.min(v, selectedBook.total_pages) }) }} className="input-field text-small w-20" />
                    <span className="text-small text-apple-muted">/ {selectedBook.total_pages} pages</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="section-label mb-2">Notes ({notes.length})</div>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {notes.map(n => (
                  <div key={n.id} className="p-2 rounded-md bg-apple-surface text-small">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`${n.type === 'takeaway' ? 'badge-blue' : n.type === 'quote' ? 'badge-amber' : 'badge-gray'} text-micro`}>{n.type}</span>
                      {n.page && <span className="text-micro text-apple-muted">p.{n.page}</span>}
                    </div>
                    <p className="text-apple-text">{n.content}</p>
                    <button onClick={() => deleteNote(selectedBook.id, n.id)} className="text-micro text-apple-red mt-1 hover:underline">Delete</button>
                  </div>
                ))}
                {!notes.length && <p className="text-small text-apple-muted text-center py-2">No notes yet</p>}
              </div>

              {/* Add Note */}
              <form onSubmit={e => { e.preventDefault(); if (!noteText.trim()) return; addNote(selectedBook.id, { content: noteText.trim(), type: noteType }); setNoteText('') }} className="space-y-2">
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." className="input-field text-small" rows={2} />
                <div className="flex gap-2">
                  <select value={noteType} onChange={e => setNoteType(e.target.value)} className="input-field text-small flex-1">
                    <option value="note">Note</option>
                    <option value="takeaway">Takeaway</option>
                    <option value="quote">Quote</option>
                  </select>
                  <button type="submit" className="btn-primary text-small px-3">Add</button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card flex items-center justify-center h-64">
              <div className="text-center">
                <ChevronRight size={24} className="mx-auto mb-2 text-apple-muted opacity-30" />
                <p className="text-small text-apple-muted">Select a book to view details</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Book Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingBook ? 'Edit Book' : 'Add Book'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Title" required />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="input-field" placeholder="Author" />
            <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} className="input-field">
              <option value="">Genre...</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input type="number" value={form.total_pages} onChange={e => setForm(f => ({ ...f, total_pages: e.target.value }))} className="input-field" placeholder="Total pages" />
            <input type="number" value={form.current_page} onChange={e => setForm(f => ({ ...f, current_page: e.target.value }))} className="input-field" placeholder="Current page" />
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input-field">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <input type="url" value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))} className="input-field" placeholder="Cover image URL (optional)" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">{editingBook ? 'Update' : 'Add'}</motion.button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
