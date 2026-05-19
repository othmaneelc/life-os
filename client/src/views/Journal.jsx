import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Download, ArrowLeft, ArrowRight, Sparkles, Image, Bold, Italic, Code, Quote, List, ListOrdered, Link as LinkIcon, CheckSquare, Eye, PenLine, X } from 'lucide-react'
import { useJournalStore } from '../store/journalStore'
import { useAIStore } from '../store/aiStore'
import { moodEmojis } from '../utils/formatters'
import { getTodayStr, getFormattedDate } from '../utils/dateHelpers'

const WRITE_PROMPTS = [
  "What made you smile today?",
  "One thing you learned today",
  "How did you show up for yourself?",
  "What challenged you today?",
  "A moment you want to remember",
  "Who made a difference in your day?",
  "What are you letting go of?",
  "What truth did you encounter?",
  "Describe today in three words",
  "What would you do differently?",
]

const itemSpring = { type: 'spring', stiffness: 100, damping: 14 }

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function applyMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/### (.+)/g, '<h3 class="text-subheading font-semibold mt-4 mb-1">$1</h3>')
    .replace(/## (.+)/g, '<h2 class="text-heading font-semibold mt-5 mb-2">$1</h2>')
    .replace(/# (.+)/g, '<h1 class="text-hero font-semibold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-apple-surface px-1.5 py-0.5 rounded text-small font-mono">$1</code>')
    .replace(/^- (.+)/gm, '<li class="flex items-start gap-2 ml-4"><span class="text-apple-muted mt-1">•</span><span>$1</span></li>')
    .replace(/\[ \] (.+)/gm, '<li class="flex items-start gap-2 ml-4"><span class="w-3.5 h-3.5 mt-0.5 rounded border border-apple-border flex-shrink-0 inline-block" /><span>$1</span></li>')
    .replace(/\[x\] (.+)/gm, '<li class="flex items-start gap-2 ml-4"><span class="w-3.5 h-3.5 mt-0.5 rounded bg-apple-green flex items-center justify-center flex-shrink-0 inline-block text-[8px] text-white">✓</span><span class="line-through text-apple-tertiary">$1</span></li>')
    .replace(/> (.+)/gm, '<blockquote class="border-l-2 border-apple-blue/30 pl-3 py-1 my-2 text-apple-muted italic">$1</blockquote>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br />')
  return `<p class="mb-2">${text}</p>`
}

function applyBold(text, selStart, selEnd) {
  if (selStart === selEnd) return { text, selStart, selEnd }
  const before = text.slice(0, selStart)
  const selected = text.slice(selStart, selEnd)
  const after = text.slice(selEnd)
  return { text: `${before}**${selected}**${after}`, selStart: selEnd + 4, selEnd: selEnd + 4 }
}

function applyItalic(text, selStart, selEnd) {
  if (selStart === selEnd) return { text, selStart, selEnd }
  const before = text.slice(0, selStart)
  const selected = text.slice(selStart, selEnd)
  const after = text.slice(selEnd)
  return { text: `${before}*${selected}*${after}`, selStart: selEnd + 2, selEnd: selEnd + 2 }
}

export default function Journal() {
  const [selectedDate, setSelectedDate] = useState(getTodayStr())
  const [mood, setMood] = useState(3)
  const [whatHappened, setWhatHappened] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [muhasaba, setMuhasaba] = useState('')
  const [intention, setIntention] = useState('')
  const [tags, setTags] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('write')
  const [savedAt, setSavedAt] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [showPrompts, setShowPrompts] = useState(false)
  const [moodHover, setMoodHover] = useState(null)

  const entries = useJournalStore(s => s.entries)
  const currentEntry = useJournalStore(s => s.currentEntry)
  const fetchEntries = useJournalStore(s => s.fetchEntries)
  const fetchEntry = useJournalStore(s => s.fetchEntry)
  const saveEntry = useJournalStore(s => s.saveEntry)
  const searchEntries = useJournalStore(s => s.searchEntries)
  const searchResults = useJournalStore(s => s.searchResults)
  const moodTrend = useJournalStore(s => s.moodTrend)
  const fetchMoodTrend = useJournalStore(s => s.fetchMoodTrend)
  const photos = useJournalStore(s => s.photos)
  const fetchPhotos = useJournalStore(s => s.fetchPhotos)
  const uploadPhoto = useJournalStore(s => s.uploadPhoto)
  const deletePhoto = useJournalStore(s => s.deletePhoto)
  const aiSummary = useJournalStore(s => s.aiSummary)
  const aiSummaryLoading = useJournalStore(s => s.aiSummaryLoading)
  const fetchAISummary = useJournalStore(s => s.fetchAISummary)

  const editorRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { fetchEntries().catch(() => {}); fetchMoodTrend().catch(() => {}) }, [])
  useEffect(() => {
    loadEntry(selectedDate).catch(() => {})
    fetchPhotos(selectedDate).catch(() => {})
    setSavedAt(null)
    setActiveTab('write')
    setSelectedPrompt(null)
    setShowPrompts(false)
  }, [selectedDate])

  async function loadEntry(date) {
    const entry = await fetchEntry(date).catch(() => null)
    if (entry) {
      setMood(entry.mood || 3); setWhatHappened(entry.what_happened || '')
      setGratitude(entry.gratitude || ''); setMuhasaba(entry.muhasaba || '')
      setIntention(entry.tomorrow_intention || '')
      let tagStr = ''
      if (entry.tags) { try { tagStr = JSON.parse(entry.tags).join(', ') } catch { tagStr = entry.tags } }
      setTags(tagStr)
      setSelectedPrompt(null)
    } else {
      setMood(3); setWhatHappened(''); setGratitude(''); setMuhasaba(''); setIntention(''); setTags('')
      setSelectedPrompt(WRITE_PROMPTS[Math.floor(Math.random() * WRITE_PROMPTS.length)])
    }
  }

  const autoSave = useCallback(() => {
    saveEntry({ date: selectedDate, mood, what_happened: whatHappened, gratitude, muhasaba, tomorrow_intention: intention, tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [] }).then(() => setSavedAt(new Date()))
  }, [selectedDate, mood, whatHappened, gratitude, muhasaba, intention, tags, saveEntry])

  useEffect(() => {
    if (!whatHappened && !gratitude && !muhasaba && !intention) return
    const t = setTimeout(autoSave, 15000)
    return () => clearTimeout(t)
  }, [autoSave, whatHappened, gratitude, muhasaba, intention])

  function handleSearch(e) {
    const v = e.target.value; setSearch(v); searchEntries(v).catch(() => {})
  }

  const sortedEntries = searchResults || entries
  const isToday = selectedDate === getTodayStr()

  function handleExport() {
    const content = `# Journal — ${selectedDate}\n\nMood: ${moodEmojis[mood - 1] || ''}\n\n## What happened today\n\n${whatHappened}\n\n## Gratitude\n\n${gratitude}\n\n## Muhasaba\n\n${muhasaba}\n\n## Tomorrow's intention\n\n${intention}`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `${selectedDate}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleFormat(fn) {
    if (!editorRef.current) return
    const el = editorRef.current
    const selStart = el.selectionStart
    const selEnd = el.selectionEnd
    const result = fn(whatHappened, selStart, selEnd)
    setWhatHappened(result.text)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.selStart, result.selEnd)
    })
  }

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      uploadPhoto(selectedDate, ev.target.result, '').catch(() => {})
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        uploadPhoto(selectedDate, ev.target.result, '').catch(() => {})
      }
      reader.readAsDataURL(file)
    }
  }

  function generateAISummary() {
    if (!aiSummary) fetchAISummary(selectedDate)
    setActiveTab('ai')
  }

  const moodChartData = (moodTrend || []).filter(d => d.mood)

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-heading font-bold" style={{ color: 'var(--text-primary)' }}>Journal</h1>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" value={search} onChange={handleSearch} placeholder="Search entries..." className="input-field text-small pl-8 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleExport} className="btn-ghost flex items-center gap-1 text-small">
            <Download size={14} /> Export
          </motion.button>
          {savedAt && (
            <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-micro" style={{ color: 'var(--text-muted)' }}>
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} />
              Saved {formatDateShort(savedAt.toISOString()).split(',')[1]?.trim() || 'just now'}
            </motion.span>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-[280px_1fr_200px] gap-6" style={{ minHeight: 'calc(100vh - 160px)' }}>
        {/* Left: Entry Navigator */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05, ...itemSpring }} className="card overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="section-label">Entries</span>
            <span className="text-micro" style={{ color: 'var(--text-tertiary)' }}>({sortedEntries.length})</span>
          </div>
          <div className="space-y-1">
            {sortedEntries.slice(0, 40).map((entry, i) => {
              const moodEmoji = moodEmojis[(entry.mood || 3) - 1] || '📝'
              const isSelected = selectedDate === entry.date
              return (
                <motion.button
                  key={entry.id || entry.date}
                  initial={{ opacity: 0, x: -12, rotateX: 5 }}
                  animate={{ opacity: 1, x: 0, rotateX: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedDate(entry.date)}
                  className="w-full text-left p-2.5 rounded-lg text-small transition-all"
                  style={{
                    background: isSelected ? 'var(--accent-glow)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                    border: isSelected ? '1px solid var(--border-color)' : '1px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <motion.span whileHover={{ scale: 1.3 }} transition={{ type: 'spring', stiffness: 300 }} className="text-base">{moodEmoji}</motion.span>
                    <span className="font-medium text-small">{entry.date}</span>
                  </div>
                  <p className="text-micro mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{entry.what_happened?.slice(0, 50) || 'No content'}</p>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Center: Editor */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, ...itemSpring }} className="card" style={{ minHeight: 'calc(100vh - 160px)' }}>
          {/* Date Navigator + Mood */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }} onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }} className="p-1 rounded" style={{ background: 'var(--bg-surface)' }}>
                <ArrowLeft size={14} style={{ color: 'var(--text-muted)' }} />
              </motion.button>
              <span className="text-subheading font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDateShort(selectedDate)}</span>
              <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }} onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }} className="p-1 rounded" style={{ background: 'var(--bg-surface)' }}>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </motion.button>
              {isToday && <span className="badge-blue text-micro">Today</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {moodEmojis.map((emoji, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 1.3 }}
                  whileHover={{ scale: 1.2 }}
                  onHoverStart={() => setMoodHover(i)}
                  onHoverEnd={() => setMoodHover(null)}
                  onClick={() => setMood(i + 1)}
                  className="text-lg p-1.5 rounded-md transition-all cursor-pointer"
                  style={{
                    background: mood === i + 1 || moodHover === i ? 'var(--bg-surface)' : 'transparent',
                    opacity: mood === i + 1 ? 1 : moodHover === i ? 0.9 : 0.35,
                    transform: mood === i + 1 ? 'scale(1.15)' : moodHover === i ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 p-0.5 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
            {[
              { key: 'write', icon: PenLine, label: 'Write' },
              { key: 'preview', icon: Eye, label: 'Preview' },
              { key: 'ai', icon: Sparkles, label: 'AI Summary' },
            ].map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <motion.button key={tab.key} whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-small font-medium transition-all flex-1 justify-center"
                  style={{
                    background: active ? 'var(--bg-card)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    boxShadow: active ? 'var(--shadow-card)' : 'none',
                  }}
                >
                  <Icon size={13} />
                  {tab.label}
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'write' && (
              <motion.div key="write" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="space-y-4">
                {/* Rich Toolbar */}
                <div className="flex items-center gap-1 p-1.5 rounded-lg flex-wrap" style={{ background: 'var(--bg-elevated)' }}>
                  {[
                    { icon: Bold, action: () => handleFormat(applyBold), title: 'Bold' },
                    { icon: Italic, action: () => handleFormat(applyItalic), title: 'Italic' },
                    { icon: Code, action: () => handleFormat((t, s, e) => ({ text: t.slice(0, s) + '`' + t.slice(s, e) + '`' + t.slice(e), selStart: e + 2, selEnd: e + 2 })), title: 'Code' },
                    { icon: Quote, action: () => handleFormat((t, s) => ({ text: t.slice(0, s) + '\n> ' + t.slice(s), selStart: s + 3, selEnd: s + 3 })), title: 'Quote' },
                    { icon: List, action: () => handleFormat((t, s) => ({ text: t.slice(0, s) + '\n- ' + t.slice(s), selStart: s + 3, selEnd: s + 3 })), title: 'Bullet list' },
                    { icon: ListOrdered, action: () => handleFormat((t, s) => ({ text: t.slice(0, s) + '\n1. ' + t.slice(s), selStart: s + 3, selEnd: s + 3 })), title: 'Numbered list' },
                    { icon: CheckSquare, action: () => handleFormat((t, s) => ({ text: t.slice(0, s) + '\n[ ] ' + t.slice(s), selStart: s + 5, selEnd: s + 5 })), title: 'Task list' },
                  ].map((btn, i) => (
                    <motion.button key={i} whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.1 }}
                      onClick={btn.action} title={btn.title}
                      className="p-1.5 rounded-md transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <btn.icon size={13} />
                    </motion.button>
                  ))}
                  <span className="w-px h-5 mx-1" style={{ background: 'var(--border-color)' }} />
                  <motion.button whileTap={{ scale: 0.85 }}
                    onClick={() => fileRef.current?.click()}
                    className="p-1.5 rounded-md transition-colors flex items-center gap-1 text-small"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Image size={13} /> Photo
                  </motion.button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <motion.button whileTap={{ scale: 0.85 }}
                    onClick={() => setShowPrompts(!showPrompts)}
                    className="p-1.5 rounded-md transition-colors flex items-center gap-1 text-small"
                    style={{ color: showPrompts ? 'var(--accent)' : 'var(--text-muted)' }}
                  >
                    <Sparkles size={13} /> Prompt
                  </motion.button>
                </div>

                {/* Daily Prompt */}
                <AnimatePresence>
                  {selectedPrompt && isToday && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-lg px-3 py-2 text-small" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                      <span className="font-medium">✨ {selectedPrompt}</span>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSelectedPrompt(WRITE_PROMPTS[Math.floor(Math.random() * WRITE_PROMPTS.length)])}
                        className="ml-2 text-micro underline opacity-70">Shuffle</motion.button>
                    </motion.div>
                  )}
                  {showPrompts && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-lg p-2 space-y-0.5" style={{ background: 'var(--bg-surface)' }}>
                      {WRITE_PROMPTS.map((p, i) => (
                        <motion.button key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                          whileTap={{ scale: 0.98 }} onClick={() => { setSelectedPrompt(p); setShowPrompts(false) }}
                          className="w-full text-left px-2 py-1.5 rounded text-small transition-colors" style={{ color: 'var(--text-primary)' }}>
                          {p}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* What happened */}
                <div>
                  <label className="section-label block mb-1 flex items-center gap-2">
                    What happened today
                    {whatHappened && <span className="text-micro" style={{ color: 'var(--text-tertiary)' }}>({whatHappened.length} chars)</span>}
                  </label>
                  <textarea ref={editorRef} value={whatHappened} onChange={e => setWhatHappened(e.target.value)}
                    placeholder={selectedPrompt || 'Free write — no limits...'}
                    className="input-field resize-y font-medium"
                    style={{ minHeight: '140px', lineHeight: '1.6' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="section-label block mb-1">Grateful for</label>
                    <textarea value={gratitude} onChange={e => setGratitude(e.target.value)} placeholder="3 things..." className="input-field min-h-[80px] resize-y text-small" />
                  </div>
                  <div>
                    <label className="section-label block mb-1">Muhasaba</label>
                    <textarea value={muhasaba} onChange={e => setMuhasaba(e.target.value)} placeholder="Where did I fall short?" className="input-field min-h-[80px] resize-y text-small" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="section-label block mb-1">Tomorrow's intention</label>
                    <input type="text" value={intention} onChange={e => setIntention(e.target.value)} placeholder="Tomorrow I will..." className="input-field text-small" />
                  </div>
                  <div>
                    <label className="section-label block mb-1">Tags</label>
                    <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="faith, business, win" className="input-field text-small" />
                  </div>
                </div>

                {/* Photos */}
                <AnimatePresence>
                  {photos.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 flex-wrap">
                      {photos.map(photo => (
                        <motion.div key={photo.id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                          className="relative group rounded-lg overflow-hidden" style={{ width: 80, height: 80 }}>
                          <img src={photo.photo_data} alt="" className="w-full h-full object-cover" />
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => deletePhoto(photo.id)}
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={10} className="text-white" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Save + AI Summary */}
                <div className="flex items-center justify-between pt-2">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={autoSave} className="btn-primary flex items-center gap-2 text-small">
                    <FileText size={14} /> Save
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={generateAISummary} className="btn-ghost flex items-center gap-1 text-small">
                    <Sparkles size={13} /> AI Summary
                  </motion.button>
                </div>
              </motion.div>
            )}

            {activeTab === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                className="prose min-h-[300px] text-body leading-relaxed" style={{ color: 'var(--text-primary)' }}
                dangerouslySetInnerHTML={{ __html: applyMarkdown(whatHappened || '_Nothing written yet._') }} />
            )}

            {activeTab === 'ai' && (
              <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="min-h-[200px]">
                {aiSummaryLoading ? (
                  <div className="space-y-3 pt-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-4 rounded animate-shimmer" style={{ width: `${70 + i * 10}%` }} />
                    ))}
                  </div>
                ) : aiSummary ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                    className="p-4 rounded-lg text-body leading-relaxed" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                      <span className="text-small font-semibold" style={{ color: 'var(--accent)' }}>AI Insight</span>
                    </div>
                    <p>{aiSummary}</p>
                  </motion.div>
                ) : (
                  <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    <Sparkles size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-body mb-3">Generate an AI summary of this entry</p>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => fetchAISummary(selectedDate)} className="btn-primary flex items-center gap-2 mx-auto text-small">
                      <Sparkles size={14} /> Generate Summary
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Photo drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="mt-4 rounded-lg border-2 border-dashed transition-all p-3 text-center"
            style={{
              borderColor: dragging ? 'var(--accent)' : 'var(--border-color)',
              background: dragging ? 'var(--accent-glow)' : 'transparent',
            }}
          >
            {dragging ? (
              <motion.p initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="text-small" style={{ color: 'var(--accent)' }}>
                <Image size={16} className="inline mr-1" /> Drop your photo here
              </motion.p>
            ) : (
              <p className="text-micro" style={{ color: 'var(--text-tertiary)' }}>Drag & drop photos or use the toolbar button</p>
            )}
          </div>
        </motion.div>

        {/* Right: Insights Panel */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, ...itemSpring }} className="space-y-4">
          {/* Mood Trend */}
          <div className="card">
            <span className="section-label block mb-2">Mood Trend</span>
            {moodChartData.length > 0 ? (
              <div className="flex items-end gap-1" style={{ height: 40 }}>
                {moodChartData.slice(-14).map((d, i) => {
                  const h = (d.mood / 5) * 36
                  return (
                    <motion.div key={d.date} initial={{ height: 0 }} animate={{ height: h }}
                      transition={{ delay: i * 0.03, type: 'spring', stiffness: 120, damping: 12 }}
                      className="flex-1 rounded-t-sm cursor-pointer"
                      style={{
                        background: d.mood >= 4 ? 'var(--success)' : d.mood >= 3 ? 'var(--accent)' : d.mood >= 2 ? 'var(--warning)' : 'var(--danger)',
                        opacity: 0.7,
                      }}
                      title={`${d.date}: ${d.mood}/5`}
                    />
                  )
                })}
              </div>
            ) : (
              <p className="text-micro" style={{ color: 'var(--text-tertiary)' }}>No data yet</p>
            )}
          </div>

          {/* Tags Cloud */}
          <div className="card">
            <span className="section-label block mb-2">Top Tags</span>
            <div className="flex flex-wrap gap-1">
              {(() => {
                const tagCounts = {}
                entries.forEach(e => {
                  if (e.tags) {
                    try { JSON.parse(e.tags).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1 }) } catch {}
                  }
                })
                return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => (
                  <motion.span key={tag} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                    className="px-2 py-0.5 rounded-full text-micro font-medium cursor-pointer transition-colors hover:scale-105"
                    style={{ background: 'var(--bg-surface)', color: 'var(--accent)' }}
                  >
                    #{tag} <span className="opacity-50">({count})</span>
                  </motion.span>
                ))
              })()}
            </div>
          </div>

          {/* Streak */}
          <div className="card">
            <span className="section-label block mb-2">Writing Streak</span>
            {(() => {
              let streak = 0
              const d = new Date()
              while (entries.some(e => e.date === d.toISOString().split('T')[0])) {
                streak++
                d.setDate(d.getDate() - 1)
              }
              return (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  className="text-center py-2">
                  <span className="text-hero font-bold" style={{ color: 'var(--accent)' }}>{streak}</span>
                  <span className="text-small block" style={{ color: 'var(--text-muted)' }}>day{streak !== 1 ? 's' : ''} streak</span>
                </motion.div>
              )
            })()}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
