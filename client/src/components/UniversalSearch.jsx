import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, CheckSquare, Dumbbell, BookOpen, FileText,
  Wallet, Calendar, Target, BookMarked, Briefcase, Users, Loader2
} from 'lucide-react'

const CATEGORY_ICONS = {
  tasks: CheckSquare,
  habits: Dumbbell,
  journal_entries: BookOpen,
  kb_documents: FileText,
  finance_transactions: Wallet,
  schedule_blocks: Calendar,
  goals: Target,
  books: BookMarked,
  clients: Briefcase,
  contacts: Users,
}

const CATEGORY_LABELS = {
  tasks: 'Tasks',
  habits: 'Habits',
  journal_entries: 'Journal',
  kb_documents: 'Knowledge Base',
  finance_transactions: 'Finance',
  schedule_blocks: 'Schedule',
  goals: 'Goals',
  books: 'Reading',
  clients: 'Agency Clients',
  contacts: 'Contacts',
}

export default function UniversalSearch({ isOpen, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const debounceRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const grouped = useMemo(() => {
    const g = {}
    for (const r of results) {
      if (!g[r.category]) g[r.category] = []
      g[r.category].push(r)
    }
    return g
  }, [results])

  const allResults = useMemo(() => {
    const list = []
    for (const [, items] of Object.entries(grouped)) {
      for (const r of items) list.push(r)
    }
    return list
  }, [grouped])

  const flatList = useMemo(() => {
    const list = []
    let idx = 0
    for (const [cat, items] of Object.entries(grouped)) {
      list.push({ type: 'header', category: cat, key: `h-${cat}` })
      for (const r of items) {
        list.push({ type: 'result', ...r, flatIdx: idx++ })
      }
    }
    return list
  }, [grouped])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results || [])
        setSelectedIdx(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      const len = allResults.length
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(prev => Math.min(prev + 1, len - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(prev => Math.max(prev - 1, 0)); return }
      if (e.key === 'Enter' && allResults[selectedIdx]) {
        e.preventDefault()
        navigate(allResults[selectedIdx].url)
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, allResults, selectedIdx, navigate, onClose])

  useEffect(() => {
    if (selectedIdx >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIdx])

  useEffect(() => {
    function handleK(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isOpen) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleK)
    return () => window.removeEventListener('keydown', handleK)
  }, [isOpen, onClose])

  function handleClick(item) {
    navigate(item.url)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="w-full max-w-xl mx-4 glass-deep rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-glass)]">
              <Search size={18} className="text-[var(--text-tertiary)] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search everything..."
                className="flex-1 bg-transparent border-none outline-none text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              {loading && <Loader2 size={16} className="text-[var(--text-muted)] animate-spin flex-shrink-0" />}
              <button onClick={onClose} className="btn-ghost p-1 rounded-lg">
                <kbd className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-tertiary)]">ESC</kbd>
              </button>
            </div>

            <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
              {query.length >= 2 && allResults.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search size={32} className="text-[var(--text-tertiary)] mb-3" />
                  <p className="text-body text-[var(--text-muted)]">No results found</p>
                  <p className="text-small text-[var(--text-tertiary)] mt-1">Try a different search term</p>
                </div>
              )}

              {query.length < 2 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search size={32} className="text-[var(--text-tertiary)] mb-3" />
                  <p className="text-body text-[var(--text-muted)]">Type to search</p>
                  <p className="text-small text-[var(--text-tertiary)] mt-1">Search across all modules and content</p>
                </div>
              )}

              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.035 } },
                }}
              >
                {flatList.map(item => {
                  if (item.type === 'header') {
                    return (
                      <div key={item.key} className="flex items-center gap-2 px-3 py-2 mt-1">
                        <span className="text-micro font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        <div className="flex-1 h-px bg-[var(--border-glass)]" />
                      </div>
                    )
                  }

                  const isSelected = item.flatIdx === selectedIdx
                  const Icon = CATEGORY_ICONS[item.category] || Search

                  return (
                    <motion.button
                      key={`${item.category}-${item.id}`}
                      data-idx={item.flatIdx}
                      variants={{
                        hidden: { opacity: 0, y: 6 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      onClick={() => handleClick(item)}
                      onMouseEnter={() => setSelectedIdx(item.flatIdx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                        isSelected
                          ? 'bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20'
                          : 'hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body font-medium text-[var(--text-primary)] truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-small text-[var(--text-muted)] truncate">{item.subtitle}</div>
                        )}
                        {item.snippet && !item.subtitle && (
                          <div className="text-small text-[var(--text-tertiary)] truncate leading-tight mt-0.5">{item.snippet}</div>
                        )}
                      </div>
                      <span className="badge-gray text-[10px] flex-shrink-0">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </motion.button>
                  )
                })}
              </motion.div>

              {loading && allResults.length === 0 && query.length >= 2 && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="text-[var(--text-muted)] animate-spin" />
                </div>
              )}
            </div>

            {(allResults.length > 0 || query.length >= 2) && (
              <div className="flex items-center gap-4 px-5 py-3 border-t border-[var(--border-glass)] bg-[var(--bg-surface)]/50">
                {allResults.length > 0 ? (
                  <>
                    <span className="text-micro text-[var(--text-tertiary)]">
                      <kbd className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[10px]">↑↓</kbd> Navigate
                    </span>
                    <span className="text-micro text-[var(--text-tertiary)]">
                      <kbd className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[10px]">↵</kbd> Open
                    </span>
                    <span className="text-micro text-[var(--text-tertiary)]">
                      <kbd className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[10px]">ESC</kbd> Close
                    </span>
                  </>
                ) : (
                  <span className="text-micro text-[var(--text-tertiary)]">
                    <kbd className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[10px]">ESC</kbd> Close
                  </span>
                )}
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/search/reindex', { method: 'POST' })
                    } catch {}
                    setQuery(prev => prev + ' ')
                    setTimeout(() => setQuery(prev => prev.trim()), 0)
                  }}
                  className="ml-auto flex items-center gap-1 text-micro text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
                >
                  Rebuild index
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
