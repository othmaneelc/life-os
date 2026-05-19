import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Mic, X, Send, Zap, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAIStore } from '../store/aiStore'
import { useLocation } from 'react-router-dom'

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

export default function AIChatModal({ open, onClose }) {
  const { messages, loading, sendMessage, suggestions, getBriefing, briefing, briefingLoading, clearChat, startListening, isListening } = useAIStore()
  const [input, setInput] = useState('')
  const [showBriefing, setShowBriefing] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open && messages.length === 0) {
      useAIStore.getState().getSuggestions(location.pathname)
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

  const currentView = VIEW_LABELS[location.pathname] || 'Life OS'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
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
                <div className="relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-apple-green border-2" style={{ borderColor: 'var(--bg-card)' }} />
                </div>
                <div>
                  <span className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>JARVIS</span>
                  <div className="text-micro" style={{ color: 'var(--text-muted)' }}>Context: {currentView}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleBriefing} className="p-1.5 rounded-lg hover:bg-apple-surface transition-colors" title="Daily Briefing">
                  <Zap size={14} style={{ color: 'var(--accent)' }} />
                </button>
                <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-apple-surface transition-colors" title="Clear chat">
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-apple-surface transition-colors">
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
                  <p className="text-small whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{briefing}</p>
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

                  {/* Quick actions */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={handleBriefing} className="px-3 py-1.5 rounded-full text-small font-medium transition-colors" style={{ background: 'var(--bg-surface)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}>
                      <Zap size={12} className="inline mr-1" /> Daily Briefing
                    </button>
                    <button onClick={() => sendMessage('What should I focus on right now?', location.pathname)} className="px-3 py-1.5 rounded-full text-small font-medium transition-colors" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                      What to focus on?
                    </button>
                    <button onClick={() => sendMessage('How am I doing today?', location.pathname)} className="px-3 py-1.5 rounded-full text-small font-medium transition-colors" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                      How am I doing?
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`flex gap-2.5 mb-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1" style={{ background: 'var(--accent-glow)' }}>
                      <Sparkles size={10} style={{ color: 'var(--accent)' }} />
                    </div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2 max-w-[80%] text-small whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : ''}`}
                    style={{
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px',
                      borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '20px',
                    }}>
                    {msg.content.replace(/\[ACTION:[^\]]+\]/g, '').trim()}
                    {msg.isAction && <span className="text-micro block mt-1 opacity-60">Action completed</span>}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex gap-2.5 mb-3">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1" style={{ background: 'var(--accent-glow)' }}>
                    <Sparkles size={10} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-surface)' }}>
                    <div className="flex gap-1.5">
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && messages.length <= 2 && (
              <div className="px-5 pb-2">
                <div className="flex gap-2 flex-wrap">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSuggestion(s)}
                      className="px-2.5 py-1 rounded-full text-micro font-medium transition-all hover:scale-105"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--border-glass)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button type="button" onClick={startListening} disabled={isListening}
                className={`p-2 rounded-lg transition-all ${isListening ? 'animate-pulse' : 'hover:bg-apple-surface'}`}
                style={{ color: isListening ? 'var(--danger)' : 'var(--text-muted)' }}>
                <Mic size={16} />
              </button>
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask JARVIS...'}
                className="flex-1 bg-transparent text-small outline-none"
                style={{ color: 'var(--text-primary)' }}
                disabled={loading || isListening} />
              <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!input.trim() || loading}
                className="p-2 rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                <Send size={14} />
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
