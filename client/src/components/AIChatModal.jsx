import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Mic, X, Send, Zap, ChevronDown, Volume2, VolumeX, MessageSquare, Trash2, Edit3, Check } from 'lucide-react'
import { useState, useEffect, useRef, memo } from 'react'
import { useAIStore } from '../store/aiStore'
import { useLocation, useNavigate } from 'react-router-dom'
import MarkdownMessage from './MarkdownMessage'
import { useConfirm } from '../hooks/useConfirm'
import { useAppUIStore } from '../store/appUIStore'

const VIEW_LABELS = {
  '/dashboard': 'Dashboard',
  '/schedule': 'Schedule',
  '/tasks': 'Tasks',
  '/journal': 'Journal',
  '/prayers': 'Prayers',
  '/habits': 'Habits',
  '/agency': 'Agency',
  '/reports': 'Reports',
  '/knowledge': 'Knowledge',
  '/settings': 'Settings',
  '/finance': 'Finance',
  '/goals': 'Goals',
  '/reading': 'Reading',
}

function GlobeIndicator({ isSpeaking, isListening }) {
  const active = isSpeaking || isListening
  return (
    <motion.div
      className="relative w-8 h-8 rounded-full flex items-center justify-center"
      style={{ background: 'var(--gradient-accent)' }}
      animate={active ? {
        scale: [1, 1.15, 1],
        boxShadow: [
          '0 0 0 0 rgba(91, 91, 214, 0.4)',
          '0 0 0 12px rgba(91, 91, 214, 0)',
          '0 0 0 0 rgba(91, 91, 214, 0)',
        ],
      } : { scale: 1, boxShadow: '0 0 0 0 rgba(91, 91, 214, 0)' }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Sparkles size={14} className="text-white" />
      {active && (
        <>
          <motion.div className="absolute inset-0 rounded-full" style={{ border: '2px solid var(--accent)' }}
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }} />
          <motion.div className="absolute inset-0 rounded-full" style={{ border: '1.5px solid var(--accent)' }}
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }} />
        </>
      )}
    </motion.div>
  )
}

function ConversationMenu({ onClose }) {
  const {
    conversations, conversationId, loadConversations, loadConversation,
    deleteConversation, renameConversation, clearChat,
  } = useAIStore()
  const { confirm, ConfirmModal } = useConfirm()
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const editRef = useRef(null)

  useEffect(() => { loadConversations() }, [])

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  function startEdit(c) {
    setEditingId(c.id)
    setEditTitle(c.title || '')
    setTimeout(() => editRef.current?.focus(), 50)
  }

  function saveEdit(id) {
    if (editTitle.trim()) renameConversation(id, editTitle.trim())
    setEditingId(null)
  }

  async function handleDeleteConversation(id, title) {
    const ok = await confirm(`Delete "${title || 'Untitled'}"?`)
    if (!ok) return
    deleteConversation(id)
  }

  function handleNew() {
    clearChat()
    setShowMenu(false)
    onClose && onClose()
  }

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowMenu(!showMenu)}
        className="p-1.5 rounded-lg hover:bg-apple-surface transition-all flex items-center gap-1"
        style={{ color: 'var(--text-muted)' }}
        title="Conversations"
      >
        <MessageSquare size={14} />
        <ChevronDown size={10} />
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1 z-50 w-72 rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-card-hover)',
                maxHeight: '50vh',
              }}
            >
              <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-micro font-semibold" style={{ color: 'var(--text-muted)' }}>Conversations</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNew}
                  className="text-micro px-2 py-0.5 rounded-lg"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  + New
                </motion.button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '42vh' }}>
                {conversations.length === 0 ? (
                  <div className="text-center py-6 text-micro" style={{ color: 'var(--text-muted)' }}>
                    No past conversations
                  </div>
                ) : conversations.map(c => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all text-small ${conversationId === c.id ? 'bg-[var(--accent)] bg-opacity-10' : 'hover:bg-apple-surface'}`}
                    style={{ borderBottom: '1px solid var(--border-glass)' }}
                    onClick={() => { loadConversation(c.id); setShowMenu(false) }}
                  >
                    {editingId === c.id ? (
                      <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input
                          ref={editRef}
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditingId(null) }}
                          className="flex-1 bg-transparent outline-none text-small"
                          style={{ color: 'var(--text-primary)' }}
                        />
                        <button onClick={() => saveEdit(c.id)} className="p-1 rounded hover:bg-apple-surface" aria-label="Save rename"><Check size={12} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 truncate" style={{ color: conversationId === c.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {c.title || 'Untitled'}
                        </span>
                        <span className="text-micro" style={{ color: 'var(--text-muted)' }}>{c.messageCount}</span>
                        <button onClick={e => { e.stopPropagation(); startEdit(c) }}
                          className="p-1 rounded hover:bg-apple-surface opacity-0 hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--text-muted)' }} aria-label="Rename conversation">
                          <Edit3 size={10} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteConversation(c.id, c.title) }}
                          className="p-1 rounded hover:bg-apple-surface opacity-0 hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--danger)' }} aria-label="Delete conversation">
                          <Trash2 size={10} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <ConfirmModal />
    </div>
  )
}

const AIChatModal = memo(function AIChatModal({ open, onClose }) {
  const messages = useAIStore(s => s.messages)
  const loading = useAIStore(s => s.loading)
  const streamingContent = useAIStore(s => s.streamingContent)
  const sendMessage = useAIStore(s => s.sendMessage)
  const suggestions = useAIStore(s => s.suggestions)
  const getBriefing = useAIStore(s => s.getBriefing)
  const briefing = useAIStore(s => s.briefing)
  const briefingLoading = useAIStore(s => s.briefingLoading)
  const clearChat = useAIStore(s => s.clearChat)
  const startListening = useAIStore(s => s.startListening)
  const stopListening = useAIStore(s => s.stopListening)
  const isListening = useAIStore(s => s.isListening)
  const isSpeaking = useAIStore(s => s.isSpeaking)
  const voiceMode = useAIStore(s => s.voiceMode)
  const setVoiceMode = useAIStore(s => s.setVoiceMode)
  const stopSpeaking = useAIStore(s => s.stopSpeaking)
  const getCheckIn = useAIStore(s => s.getCheckIn)
  const checkIn = useAIStore(s => s.checkIn)
  const checkInLoading = useAIStore(s => s.checkInLoading)
  const memories = useAIStore(s => s.memories)
  const [input, setInput] = useState('')
  const [showBriefing, setShowBriefing] = useState(false)
  const [showMemories, setShowMemories] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const modalRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => navigate(e.detail)
    window.addEventListener('navigate', handler)
    return () => window.removeEventListener('navigate', handler)
  }, [navigate])

  useEffect(() => {
    const handler = () => useAppUIStore.getState().toggleFocus()
    window.addEventListener('open-focus-mode', handler)
    return () => window.removeEventListener('open-focus-mode', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const focusable = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, streamingContent])

  useEffect(() => {
    if (open && messages.length === 0) {
      useAIStore.getState().getSuggestions(location.pathname)
      getCheckIn(location.pathname)
      useAIStore.getState().loadMemories()
    }
  }, [open])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input.trim(), location.pathname)
    setInput('')
  }

  function handleSuggestion(s) {
    sendMessage(s, location.pathname)
  }

  function handleBriefing() {
    setShowBriefing(true)
    getBriefing(location.pathname)
  }

  function handleVoiceToggle() {
    if (voiceMode) {
      setVoiceMode(false)
      stopSpeaking()
    } else {
      setVoiceMode(true)
    }
  }

  const currentView = VIEW_LABELS[location.pathname] || 'Life OS'

  return (
    <AnimatePresence>
      {open && (
        <div ref={modalRef} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose} role="dialog" aria-modal="true">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-lg mx-4 mb-0 sm:mb-0 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card-hover), 0 0 40px var(--accent-glow)',
              maxHeight: '85vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <GlobeIndicator isSpeaking={isSpeaking} isListening={isListening} />
                <div>
                  <span className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>JARVIS</span>
                  <div className="text-micro flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <span>Context: {currentView}</span>
                    {isSpeaking && <span className="text-[var(--accent)]">Speaking...</span>}
                    {isListening && <span className="text-[var(--danger)]">Listening...</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ConversationMenu onClose={() => useAIStore.getState().loadConversations()} />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleVoiceToggle}
                  className={`p-1.5 rounded-lg transition-all ${voiceMode ? 'text-[var(--accent)]' : 'hover:bg-apple-surface'}`}
                  title={voiceMode ? 'Voice mode on' : 'Voice mode off'}
                  aria-label={voiceMode ? 'Disable voice mode' : 'Enable voice mode'}
                  style={{ color: voiceMode ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </motion.button>
                <button onClick={handleBriefing} className="p-1.5 rounded-lg hover:bg-apple-surface transition-colors" title="Daily Briefing" aria-label="Daily briefing">
                  <Zap size={14} style={{ color: 'var(--accent)' }} />
                </button>
                <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-apple-surface transition-colors" title="Clear chat" aria-label="Clear chat">
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-apple-surface transition-colors" aria-label="Close chat">
                  <X size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>

            {/* Briefing */}
            {showBriefing && (
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-elevated)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} style={{ color: 'var(--accent)' }} />
                  <span className="text-small font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Briefing</span>
                </div>
                {briefingLoading ? (
                  <div className="animate-shimmer h-16 rounded-lg" />
                ) : briefing ? (
                  <div className="text-small" style={{ color: 'var(--text-primary)' }}><MarkdownMessage content={briefing} /></div>
                ) : null}
              </div>
            )}

            {/* Messages */}
            <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: '50vh', minHeight: '200px' }}>
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
                    <Sparkles size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <p className="text-subheading font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>How can I help?</p>
                  <p className="text-small mb-4" style={{ color: 'var(--text-muted)' }}>Ask about your tasks, habits, schedule, finances, or anything in your Life OS.</p>

                  <div className="flex flex-wrap gap-2 justify-center">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={handleBriefing}
                      className="px-3 py-1.5 rounded-full text-small font-medium transition-colors"
                      style={{ background: 'var(--bg-surface)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}>
                      <Zap size={12} className="inline mr-1" /> Daily Briefing
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => sendMessage('What should I focus on right now?', location.pathname)}
                      className="px-3 py-1.5 rounded-full text-small font-medium transition-colors"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                      What to focus on?
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => sendMessage('How am I doing today?', location.pathname)}
                      className="px-3 py-1.5 rounded-full text-small font-medium transition-colors"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                      How am I doing?
                    </motion.button>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div key={msg.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex gap-2.5 mb-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1" style={{ background: 'var(--accent-glow)' }}>
                      <Sparkles size={10} style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2 max-w-[80%] text-small ${msg.role === 'user' ? 'text-white' : ''}`}
                    style={{
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
                      borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '20px',
                    }}>
                    {msg.role === 'assistant' ? (
                      <MarkdownMessage content={msg.content.replace(/\[ACTION:[^\]]+\]/g, '').trim()} />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                    {msg.isAction && <span className="text-micro block mt-1 opacity-60">✓ Action completed</span>}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 mb-3">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1" style={{ background: 'var(--accent-glow)' }}>
                    <Sparkles size={10} style={{ color: 'var(--accent)' }} />
                  </div>
                  {streamingContent ? (
                    <div className="rounded-2xl px-3.5 py-2 max-w-[80%] text-small" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderBottomLeftRadius: '4px' }}>
                      <MarkdownMessage content={streamingContent} />
                      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} className="inline-block w-1.5 h-4 ml-0.5 rounded-sm" style={{ background: 'var(--accent)' }} />
                    </div>
                  ) : (
                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-surface)' }}>
                      <div className="flex gap-1.5">
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Check-in greeting (when no messages) */}
            {messages.length === 0 && !loading && (
              <div className="px-5 pb-3">
                {checkInLoading ? (
                  <div className="flex items-center gap-2 text-small" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex gap-1">
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.15 }} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    </div>
                    <span>Thinking...</span>
                  </div>
                ) : checkIn?.greeting ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl px-4 py-3 text-small leading-relaxed"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderLeft: '3px solid var(--accent)' }}>
                    <MarkdownMessage content={checkIn.greeting} />
                  </motion.div>
                ) : null}
                {/* Memory indicator */}
                {memories.length > 0 && (
                  <button onClick={() => setShowMemories(!showMemories)}
                    className="flex items-center gap-1.5 mt-2 text-micro transition-all hover:opacity-80"
                    style={{ color: 'var(--text-tertiary)' }}>
                    <Sparkles size={10} />
                    <span>{memories.length} memor{memories.length === 1 ? 'y' : 'ies'} about you</span>
                  </button>
                )}
              </div>
            )}

            {/* Memory panel */}
            <AnimatePresence>
              {showMemories && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-5 pb-2">
                  <div className="rounded-xl p-3 max-h-40 overflow-y-auto" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                    {memories.slice(0, 10).map(m => (
                      <div key={m.id} className="flex items-start gap-2 py-1.5 text-micro" style={{ color: 'var(--text-muted)' }}>
                        <Sparkles size={8} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                        <span className="flex-1">{m.content}</span>
                        <span className="text-[10px] opacity-40">{m.category}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggestions */}
            {suggestions.length > 0 && messages.length <= 2 && (
              <div className="px-5 pb-2">
                <div className="flex gap-2 flex-wrap">
                  {suggestions.map((s) => (
                    <motion.button key={s} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => handleSuggestion(s)}
                      className="px-2.5 py-1 rounded-full text-micro font-medium transition-all"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--border-glass)' }}>
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={startListening} disabled={isListening}
                  className={`p-2 rounded-lg transition-all ${isListening ? 'animate-pulse' : 'hover:bg-apple-surface'}`}
                  style={{ color: isListening ? 'var(--danger)' : 'var(--text-muted)' }}
                  aria-label={isListening ? 'Listening' : 'Voice input'}>
                  <Mic size={16} />
                </motion.button>
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask JARVIS...'}
                className="flex-1 bg-transparent text-small outline-none transition-all duration-200 focus:scale-[1.01]"
                style={{ color: 'var(--text-primary)' }}
                disabled={loading || isListening} />
                <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!input.trim() || loading}
                  className="p-2 rounded-lg transition-all disabled:opacity-30"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                  aria-label="Send message">
                  <Send size={14} />
                </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

export default AIChatModal