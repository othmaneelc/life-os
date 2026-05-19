import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, FileText, Trash2, BookOpen, Bot, X, Edit3, Save } from 'lucide-react'
import Modal from '../components/Modal'
import { useKnowledgeStore } from '../store/knowledgeStore'
import toast from 'react-hot-toast'

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newTags, setNewTags] = useState('')
  const [viewDoc, setViewDoc] = useState(null)
  const [editingDoc, setEditingDoc] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const editRef = useRef(null)

  const { documents, searchResults, aiAnswer, fetchAll, search, add, update, remove, askAI } = useKnowledgeStore()

  useEffect(() => { fetchAll().catch(() => {}) }, [])

  useEffect(() => {
    if (editingDoc && editRef.current) editRef.current.focus()
  }, [editingDoc])

  const display = searchQuery.trim() ? searchResults : documents

  async function handleSearch(val) {
    setSearchQuery(val)
    search(val || '').catch(() => {})
  }

  async function handleAdd() {
    if (!newTitle || !newContent) { toast.error('Title and content required'); return }
    try {
      await add({ title: newTitle, content: newContent, source: newSource, tags: newTags.split(',').map(t => t.trim()).filter(Boolean) })
      setShowAdd(false)
      setNewTitle(''); setNewContent(''); setNewSource(''); setNewTags('')
    } catch { toast.error('Failed to add document') }
  }

  async function handleAI() {
    if (!aiQuestion.trim()) return
    try { await askAI(aiQuestion.trim()) } catch { toast.error('AI search failed') }
  }

  function openViewer(doc) {
    setViewDoc(doc)
    setEditingDoc(null)
  }

  function startEdit(doc) {
    setEditingDoc(doc.id)
    setEditTitle(doc.title)
    setEditContent(doc.content)
  }

  async function saveEdit(doc) {
    if (!editTitle.trim() || !editContent.trim()) return
    try {
      await update(doc.id, { title: editTitle.trim(), content: editContent.trim() })
      setEditingDoc(null)
      setViewDoc(prev => prev?.id === doc.id ? { ...prev, title: editTitle.trim(), content: editContent.trim() } : prev)
    } catch { toast.error('Failed to save') }
  }

  function closeViewer() {
    setViewDoc(null)
    setEditingDoc(null)
  }

  function renderContent(text) {
    if (!text) return ''
    return text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-apple-surface p-3 rounded-md text-small overflow-x-auto my-2"><code>$2</code></pre>')
      .replace(/\n- /g, '\n• ')
      .replace(/\n/g, '<br>')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="max-w-5xl mx-auto p-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <h1 className="text-heading font-semibold">Knowledge Base</h1>
        <div className="flex items-center gap-2">
          <span className="text-micro text-apple-muted">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-1.5 text-small">
            <Plus size={14} /> Add
          </motion.button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-muted pointer-events-none" />
        <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
          placeholder="Search your knowledge base..." className="input-field pl-9 w-full" />
        {searchQuery && (
          <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-muted hover:text-apple-text">
            <X size={14} />
          </button>
        )}
      </div>

      {/* AI Ask */}
      <div className="card p-3 flex gap-2">
        <Bot size={16} className="text-apple-blue mt-2 shrink-0" />
        <div className="flex-1">
          <input type="text" value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAI()}
            placeholder="Ask AI about your documents..." className="input-field text-small w-full" />
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleAI}
          className="btn-primary text-small px-3 shrink-0">Ask</motion.button>
      </div>

      {/* AI Answer */}
      <AnimatePresence>
        {aiAnswer && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="card p-4" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-glass)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-apple-blue" />
                <span className="text-small font-semibold text-apple-text">AI Answer</span>
              </div>
              <button onClick={() => useKnowledgeStore.setState({ aiAnswer: null })} className="p-1 hover:bg-apple-surface rounded"><X size={14} className="text-apple-muted" /></button>
            </div>
            <p className="text-body text-apple-text whitespace-pre-line">{aiAnswer.answer}</p>
            {aiAnswer.sources?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-apple-border">
                <div className="text-micro text-apple-muted">Sources: {aiAnswer.sources.join(', ')}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results + Document Viewer */}
      <div className="grid grid-cols-[1fr_360px] gap-4">
        <div className="space-y-2">
          {display?.length === 0 && searchQuery && (
            <div className="text-body text-apple-muted text-center py-8">No documents match your search</div>
          )}
          {display?.length === 0 && !searchQuery && (
            <div className="text-body text-apple-muted text-center py-8">
              <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
              Your knowledge base is empty. Add your first document.
            </div>
          )}
          {display?.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
              layout
              className={`card p-3 hover:shadow-apple-hover transition-shadow cursor-pointer group ${viewDoc?.id === doc.id ? 'ring-1 ring-apple-blue' : ''}`}
              onClick={() => openViewer(doc)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText size={14} className="text-apple-blue shrink-0" />
                  <div className="min-w-0">
                    <div className="text-small font-semibold truncate">{doc.title}</div>
                    {doc.source && <div className="text-micro text-apple-muted truncate">{doc.source}</div>}
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.9 }}
                  onClick={e => { e.stopPropagation(); if (confirm('Delete?')) remove(doc.id) }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-apple-red/10 rounded-md transition-all shrink-0">
                  <Trash2 size={14} className="text-red-400" />
                </motion.button>
              </div>
              {doc.tags && (
                <div className="flex gap-1 mt-1.5 ml-6">
                  {(Array.isArray(doc.tags) ? doc.tags : (typeof doc.tags === 'string' ? doc.tags.split(',') : [])).map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-apple-surface text-apple-muted">{tag}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Document Viewer Panel */}
        <AnimatePresence mode="wait">
          {viewDoc ? (
            <motion.div key={viewDoc.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="card">
              {editingDoc === viewDoc.id ? (
                <div className="space-y-3">
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field text-subheading font-semibold" />
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} ref={editRef} className="input-field w-full min-h-[200px] resize-y text-small" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingDoc(null)} className="btn-ghost text-small">Cancel</button>
                    <button onClick={() => saveEdit(viewDoc)} className="btn-primary text-small flex items-center gap-1"><Save size={13} /> Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-subheading font-semibold truncate">{viewDoc.title}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(viewDoc)} className="p-1 hover:bg-apple-surface rounded"><Edit3 size={14} className="text-apple-muted" /></button>
                      <button onClick={closeViewer} className="p-1 hover:bg-apple-surface rounded"><X size={14} className="text-apple-muted" /></button>
                    </div>
                  </div>
                  {viewDoc.source && <div className="text-micro text-apple-muted mb-2">Source: {viewDoc.source}</div>}
                  {viewDoc.tags && (
                    <div className="flex gap-1 mb-3 flex-wrap">
                      {(Array.isArray(viewDoc.tags) ? viewDoc.tags : (typeof viewDoc.tags === 'string' ? viewDoc.tags.split(',') : [])).map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-apple-surface text-apple-muted">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-small text-apple-text whitespace-pre-line max-h-[50vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: renderContent(viewDoc.content) }} />
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card flex items-center justify-center h-64">
              <div className="text-center">
                <FileText size={24} className="mx-auto mb-2 text-apple-muted opacity-30" />
                <p className="text-small text-apple-muted">Select a document to view</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Document" maxWidth="lg">
        <div className="space-y-3">
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" className="input-field w-full" />
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Content (markdown supported)" className="input-field w-full min-h-[120px] resize-none" />
          <input type="text" value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="Source (optional)" className="input-field w-full" />
          <input type="text" value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="Tags: comma, separated (optional)" className="input-field w-full" />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} className="btn-primary flex items-center gap-2"><Plus size={14} /> Add</motion.button>
        </div>
      </Modal>
    </motion.div>
  )
}
