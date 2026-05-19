import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, RefreshCw, X, Edit3, Trash2, MapPin, AlignLeft, Sparkles, Zap, Repeat, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'


const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const BLOCK_COLORS = {
  Work: '#0071E3',
  Agency: '#FF9F0A',
  Brand: '#AF52DE',
  Personal: '#8E8E93',
  Prayer: '#34C759',
  Faith: '#30D158',
  Rest: '#636366',
  Training: '#FF3B30',
  Learning: '#5856D6',
  Reflection: '#BF5AF2',
  Planning: '#0071E3',
}

const DEFAULT_TEMPLATES = [
  { name: 'Deep Work', title: 'Deep Work Session', start_time: '09:00', end_time: '11:00', block_type: 'Work', color: '#0071E3', icon: 'zap' },
  { name: 'Meeting', title: 'Team Meeting', start_time: '14:00', end_time: '15:00', block_type: 'Work', color: '#0071E3', icon: 'users' },
  { name: 'Prayer Block', title: 'Prayer & Reflection', start_time: '05:30', end_time: '06:00', block_type: 'Prayer', color: '#34C759', icon: 'book' },
  { name: 'Workout', title: 'Gym Session', start_time: '17:00', end_time: '18:30', block_type: 'Training', color: '#FF3B30', icon: 'dumbbell' },
  { name: 'Learning', title: 'Study Session', start_time: '20:00', end_time: '21:00', block_type: 'Learning', color: '#5856D6', icon: 'book-open' },
]

function parseNaturalLanguage(input) {
  if (!input || input.trim().length < 2) return null
  const result = { title: input.trim() }

  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i
  const timeRangeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i

  const rangeMatch = input.match(timeRangeRegex)
  if (rangeMatch) {
    let startH = parseInt(rangeMatch[1])
    const startM = rangeMatch[2] ? parseInt(rangeMatch[2]) : 0
    const startAmPm = rangeMatch[3].toLowerCase()
    let endH = parseInt(rangeMatch[4])
    const endM = rangeMatch[5] ? parseInt(rangeMatch[5]) : 0
    const endAmPm = rangeMatch[6].toLowerCase()

    if (startAmPm === 'pm' && startH !== 12) startH += 12
    if (startAmPm === 'am' && startH === 12) startH = 0
    if (endAmPm === 'pm' && endH !== 12) endH += 12
    if (endAmPm === 'am' && endH === 12) endH = 0

    result.start_time = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
    result.end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
    result.title = input.replace(timeRangeRegex, '').trim() || result.title
  } else {
    const match = input.match(timeRegex)
    if (match) {
      let h = parseInt(match[1])
      const m = match[2] ? parseInt(match[2]) : 0
      const ampm = match[3].toLowerCase()
      if (ampm === 'pm' && h !== 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      result.start_time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      result.end_time = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      result.title = input.replace(timeRegex, '').trim() || result.title
    }
  }

  const todayKeywords = ['today', 'tonight', 'this morning', 'this afternoon']
  const tomorrowKeywords = ['tomorrow']
  const today = new Date()

  if (tomorrowKeywords.some(k => input.toLowerCase().includes(k))) {
    const tmr = new Date(today)
    tmr.setDate(tmr.getDate() + 1)
    result.date = tmr.toISOString().split('T')[0]
  } else {
    result.date = today.toISOString().split('T')[0]
  }

  for (const [type, keywords] of Object.entries({
    Work: ['meeting', 'work', 'call', 'review', 'presentation'],
    Prayer: ['prayer', 'salah', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'],
    Training: ['workout', 'gym', 'run', 'exercise', 'training'],
    Learning: ['study', 'learn', 'read', 'course', 'research'],
    Rest: ['break', 'rest', 'nap', 'relax', 'lunch', 'dinner'],
  })) {
    if (keywords.some(k => input.toLowerCase().includes(k))) {
      result.block_type = type
      result.color = BLOCK_COLORS[type]
      break
    }
  }

  return result
}

function timeToMin(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function formatDateStr(d) {
  return d.toISOString().split('T')[0]
}

function getRecurrenceDates(startDate, recurrence, endDate) {
  const dates = []
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date(start)
  end.setMonth(end.getMonth() + 3)

  const current = new Date(start)
  while (current <= end) {
    dates.push(formatDateStr(current))
    if (recurrence === 'daily') current.setDate(current.getDate() + 1)
    else if (recurrence === 'weekly') current.setDate(current.getDate() + 7)
    else if (recurrence === 'monthly') current.setMonth(current.getMonth() + 1)
    else break
  }
  return dates
}

export default function Schedule() {
  const [viewMode, setViewMode] = useState('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [blocks, setBlocks] = useState([])
  const [googleEvents, setGoogleEvents] = useState([])
  const [gcalStatus, setGcalStatus] = useState(null)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingBlock, setEditingBlock] = useState(null)
  const [nowTime, setNowTime] = useState(new Date())
  const [dragging, setDragging] = useState(null)
  const [syncToGoogle, setSyncToGoogle] = useState(true)
  const [showDetails, setShowDetails] = useState(null)
  const [templates, setTemplates] = useState([])
  const [naturalInput, setNaturalInput] = useState('')
  const [showMiniCal, setShowMiniCal] = useState(false)
  const [dragResize, setDragResize] = useState(null)
  const mainRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBlocks()
    fetchGoogleEventsForRange()
    fetchGcalStatus()
    fetchTemplates()
    const interval = setInterval(() => setNowTime(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (viewMode === 'day') fetchGoogleEventsForDate(selectedDate)
    else fetchGoogleEventsForRange()
  }, [selectedDate, viewMode])

  useEffect(() => {
    function handleKeys(e) {
      if (showModal || showDetails) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setEditingBlock(null)
        setSyncToGoogle(gcalConnected)
        setShowModal(true)
      }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); goToday() }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setViewMode('day') }
      if (e.key === 'w' || e.key === 'W') { e.preventDefault(); setViewMode('week') }
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); setViewMode('month') }
      if (e.key === 'l' || e.key === 'L') { e.preventDefault(); setViewMode('list') }
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1) }
      if (e.key === 'Escape') { setShowDetails(null) }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [showModal, showDetails, gcalConnected, selectedDate, viewMode])

  const weekStart = useMemo(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - d.getDay())
    return d
  }, [selectedDate])

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    const days = []
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), currentMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false })
    }
    return days
  }, [selectedDate])

  const allEvents = useMemo(() => {
    const local = blocks.flatMap(b => {
      if (b.date) {
        return [{ ...b, is_google: false, date: b.date }]
      }
      if (b.recurrence) {
        const dates = getRecurrenceDates(b.date || formatDateStr(new Date()), b.recurrence, b.recurrence_end_date)
        return dates.map(d => ({ ...b, is_google: false, date: d }))
      }
      return [{ ...b, is_google: false, date: null }]
    })

    const google = googleEvents.map(e => ({
      id: e.google_event_id || e.id,
      title: e.title,
      start_time: e.is_all_day ? '00:00' : (e.start_time ? e.start_time.split('T')[1]?.substring(0, 5) || '00:00' : '00:00'),
      end_time: e.is_all_day ? '23:59' : (e.end_time ? e.end_time.split('T')[1]?.substring(0, 5) || '23:59' : '23:59'),
      subtitle: e.location || e.description?.substring(0, 80) || '',
      block_type: 'Google',
      color: '#34A853',
      is_google: true,
      is_all_day: e.is_all_day,
      date: e.start_time?.split('T')[0] || new Date().toISOString().split('T')[0],
      google_event_id: e.google_event_id,
      description: e.description,
      location: e.location,
    }))

    return [...local, ...google]
  }, [blocks, googleEvents])

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return allEvents
    const q = searchQuery.toLowerCase().replace(/\s+/g, ' ')
    return allEvents.filter(e =>
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.subtitle && e.subtitle.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.block_type && e.block_type.toLowerCase().includes(q))
    )
  }, [allEvents, searchQuery])

  const getEventsForDate = useCallback((dateStr) => {
    return allEvents.filter(e => {
      if (e.date) return e.date === dateStr
      return true
    }).sort((a, b) => {
      if (a.is_all_day && !b.is_all_day) return -1
      if (!a.is_all_day && b.is_all_day) return 1
      return timeToMin(a.start_time) - timeToMin(b.start_time)
    })
  }, [allEvents])

  const currentBlock = useMemo(() => {
    const today = formatDateStr(new Date())
    const currentMinutes = nowTime.getHours() * 60 + nowTime.getMinutes()
    return allEvents.find(b => {
      if (b.date && b.date !== today) return false
      if (b.is_all_day) return false
      const start = timeToMin(b.start_time)
      const end = timeToMin(b.end_time)
      return currentMinutes >= start && currentMinutes < end
    })
  }, [allEvents, nowTime])

  async function fetchBlocks() {
    setLoading(true)
    try {
      const res = await fetch('/api/schedule')
      const data = await res.json()
      setBlocks(data)
    } catch (err) {
      toast.error('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/schedule/templates')
      const data = await res.json()
      if (data.length === 0) {
        for (const t of DEFAULT_TEMPLATES) {
          await fetch('/api/schedule/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(t),
          })
        }
        const res2 = await fetch('/api/schedule/templates')
        setTemplates(await res2.json())
      } else {
        setTemplates(data)
      }
    } catch {}
  }

  async function fetchGoogleEventsForDate(date) {
    const dateStr = formatDateStr(date)
    try {
      const res = await fetch(`/api/calendar/synced?date=${dateStr}`)
      const data = await res.json()
      if (!data.error) {
        setGoogleEvents(data.events || [])
        if (data.status) setGcalStatus(data.status)
      }
    } catch {}
  }

  async function fetchGoogleEventsForRange() {
    const start = new Date(weekStart)
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    if (viewMode === 'month') {
      start.setDate(1)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
    }
    try {
      const res = await fetch(`/api/calendar/events-range?startDate=${formatDateStr(start)}&endDate=${formatDateStr(end)}`)
      const data = await res.json()
      if (!data.error) setGoogleEvents(data.events || [])
    } catch {
      fetchGoogleEventsForDate(selectedDate)
    }
  }

  async function fetchGcalStatus() {
    try {
      const res = await fetch('/api/calendar/status')
      const data = await res.json()
      setGcalConnected(data.connected)
      if (data.status) setGcalStatus(data.status)
    } catch {}
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error === 'not_connected' ? 'Connect Google account in Settings first' : data.error)
      } else {
        toast.success(`Synced! ${data.result.synced} events`)
        setGcalStatus(data.status)
        fetchGoogleEventsForRange()
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSave(form) {
    try {
      const url = form.id && !form.is_google ? `/api/schedule/${form.id}` : '/api/schedule'
      const method = form.id && !form.is_google ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      await res.json()

      if (syncToGoogle && gcalConnected && !form.is_google) {
        try {
          await fetch('/api/calendar/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: form.title,
              description: form.subtitle || '',
              date: form.date || formatDateStr(selectedDate),
              startTime: form.start_time,
              endTime: form.end_time,
              colorId: form.color_id || '9',
            }),
          })
          toast.success('Block added & synced to Google Calendar')
        } catch {}
      } else {
        toast.success(form.id ? 'Block updated' : 'Block added')
      }

      fetchBlocks()
      setShowModal(false)
      setEditingBlock(null)
    } catch (err) {
      toast.error('Failed to save block')
    }
  }

  function handleDelete(id, isGoogle, googleEventId) {
    if (!window.confirm('Delete this event?')) return
    const deletedBlock = !isGoogle ? blocks.find(b => b.id === id) : null
    const doDelete = async () => {
      try {
        if (isGoogle && googleEventId && gcalConnected) {
          await fetch(`/api/calendar/${googleEventId}`, { method: 'DELETE' })
        } else if (!isGoogle) {
          await fetch(`/api/schedule/${id}`, { method: 'DELETE' })
        }
        fetchBlocks()
        fetchGoogleEventsForRange()
        setShowDetails(null)
      } catch { toast.error('Failed to delete block') }
    }
    doDelete()
    if (deletedBlock) {
      const { title, start_time, end_time, date, block_type, color, subtitle, description, recurrence, recurrence_end_date, is_all_day } = deletedBlock
      toast((t) => (
        <div className="flex items-center gap-3 text-small">
          <span>Event deleted</span>
          <button onClick={async () => {
            toast.dismiss(t.id)
            await fetch('/api/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, start_time, end_time, date, block_type, color, subtitle, description, recurrence, recurrence_end_date, is_all_day }),
            })
            fetchBlocks()
            toast.success('Restored')
          }} className="text-apple-blue font-medium ml-2">Undo</button>
        </div>
      ), { duration: 5000 })
    } else {
      toast.success('Event deleted')
    }
  }

  function handleSlotClick(dateStr, hour) {
    setEditingBlock(null)
    setSyncToGoogle(gcalConnected)
    setShowModal(true)
  }

  function handleDragStart(event, block) {
    if (block.is_google) return
    event.dataTransfer.setData('text/plain', JSON.stringify(block))
    event.dataTransfer.effectAllowed = 'move'
    setDragging(block)
  }

  function handleDragEnd() {
    setDragging(null)
  }

  async function handleDrop(dateStr, hour) {
    if (!dragging) return
    const newStart = `${String(hour).padStart(2, '0')}:${String(timeToMin(dragging.start_time) % 60).padStart(2, '0')}`
    const duration = timeToMin(dragging.end_time) - timeToMin(dragging.start_time)
    const newEnd = minToTime(timeToMin(newStart) + duration)

    try {
      await fetch(`/api/schedule/${dragging.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: newStart, end_time: newEnd, date: dateStr }),
      })
      fetchBlocks()
      toast.success('Event moved')
    } catch {
      toast.error('Failed to move event')
    }
    setDragging(null)
  }

  function handleResizeStart(e, block) {
    e.preventDefault()
    e.stopPropagation()
    if (block.is_google) return
    setDragResize({ block, startY: e.clientY, startEnd: timeToMin(block.end_time) })
  }

  useEffect(() => {
    if (!dragResize) return
    function handleMove(e) {
      const delta = Math.round((e.clientY - dragResize.startY) / 60) * 60
      const newEnd = Math.max(dragResize.startEnd + delta, timeToMin(dragResize.block.start_time) + 15)
      setDragResize(prev => ({ ...prev, newEnd }))
    }
    function handleUp() {
      if (dragResize.newEnd && dragResize.newEnd !== dragResize.startEnd) {
        const newEndTime = minToTime(dragResize.newEnd)
        fetch(`/api/schedule/${dragResize.block.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ end_time: newEndTime }),
        }).then(() => fetchBlocks())
        toast.success('Event resized')
      }
      setDragResize(null)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragResize])

  function navigate(dir) {
    const d = new Date(selectedDate)
    if (viewMode === 'day') d.setDate(d.getDate() + dir)
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7)
    else if (viewMode === 'month') d.setMonth(d.getMonth() + dir)
    setSelectedDate(d)
  }

  function goToday() {
    setSelectedDate(new Date())
  }

  function handleNaturalInput(val) {
    setNaturalInput(val)
    const parsed = parseNaturalLanguage(val)
    if (parsed) {
      setEditingBlock({
        title: parsed.title,
        start_time: parsed.start_time || '09:00',
        end_time: parsed.end_time || '10:00',
        date: parsed.date || formatDateStr(selectedDate),
        block_type: parsed.block_type || 'Work',
        color: parsed.color || BLOCK_COLORS['Work'],
      })
    }
  }

  const getWeekNumber = useCallback((d) => {
    const startOfYear = new Date(d.getFullYear(), 0, 1)
    const diff = d - startOfYear + (startOfYear.getTimezoneOffset() - d.getTimezoneOffset()) * 60000
    return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7)
  }, [])

  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return `${DAYS_FULL[selectedDate.getDay()]}, ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`
    } else if (viewMode === 'week') {
      const end = new Date(weekStart)
      end.setDate(end.getDate() + 6)
      const wn = getWeekNumber(weekStart)
      if (weekStart.getMonth() === end.getMonth()) {
        return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${end.getDate()}, ${weekStart.getFullYear()} · W${wn}`
      }
      return `${MONTHS[weekStart.getMonth()].substring(0, 3)} ${weekStart.getDate()} – ${MONTHS[end.getMonth()].substring(0, 3)} ${end.getDate()}, ${end.getFullYear()} · W${wn}`
    } else {
      const wn = getWeekNumber(selectedDate)
      return `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()} · W${wn}`
    }
  }, [selectedDate, viewMode, weekStart, getWeekNumber])

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="w-40 h-6 bg-apple-surface rounded animate-shimmer" />
          <div className="w-28 h-9 bg-apple-surface rounded animate-shimmer" />
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="flex gap-4">
            <div className="w-20 h-4 bg-apple-surface rounded animate-shimmer" />
            <div className="flex-1 h-14 bg-apple-surface rounded animate-shimmer" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div ref={mainRef} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-apple-surface rounded-lg transition-colors">
            <ChevronLeft size={20} className="text-apple-muted" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-small font-medium border border-apple-border rounded-lg hover:bg-apple-surface transition-colors">
            Today
          </button>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-apple-surface rounded-lg transition-colors">
            <ChevronRight size={20} className="text-apple-muted" />
          </button>
          <h1 className="text-heading font-semibold">{headerTitle}</h1>
          <button onClick={() => setShowMiniCal(!showMiniCal)} className={`p-1.5 rounded-lg transition-colors ${showMiniCal ? 'bg-apple-surface' : 'hover:bg-apple-surface'}`}>
            <Calendar size={16} className="text-apple-muted" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-apple-surface">
            {[['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['list', 'List']].map(([key, label]) => (
              <button key={key} onClick={() => setViewMode(key)}
                className={`px-3 py-1.5 rounded-md text-small font-medium transition-all ${viewMode === key ? 'bg-apple-tab shadow-sm text-apple-text' : 'text-apple-muted hover:text-apple-text'}`}>
                {label}
              </button>
            ))}
          </div>

          {gcalConnected && (
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={handleSync} disabled={syncing}
              className="btn-ghost flex items-center gap-1.5 text-small"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync'}
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingBlock(null); setNaturalInput(''); setSyncToGoogle(gcalConnected); setShowModal(true) }}
            className="btn-primary flex items-center gap-1"
          >
            <Plus size={15} /> Add
          </motion.button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-micro text-apple-muted flex items-center gap-3 flex-wrap">
        <span><kbd className="px-1.5 py-0.5 rounded bg-apple-surface text-apple-muted font-mono text-[10px]">N</kbd> New</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-apple-surface text-apple-muted font-mono text-[10px]">T</kbd> Today</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-apple-surface text-apple-muted font-mono text-[10px]">D</kbd> Day</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-apple-surface text-apple-muted font-mono text-[10px]">W</kbd> Week</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-apple-surface text-apple-muted font-mono text-[10px]">M</kbd> Month</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-apple-surface text-apple-muted font-mono text-[10px]">←→</kbd> Navigate</span>
      </div>

      {/* Sync Status */}
      {gcalConnected && gcalStatus?.lastSync && (
        <div className="text-micro text-apple-muted flex items-center gap-1.5">
          <Calendar size={12} />
          Google Calendar synced {new Date(gcalStatus.lastSync).toLocaleString()} · {gcalStatus.eventCount} events
        </div>
      )}

      {/* Now Playing */}
      {currentBlock && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className={`card flex items-center gap-3 ${currentBlock.is_google ? 'bg-apple-green/5' : 'bg-apple-blue/5'}`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${currentBlock.is_google ? 'bg-apple-green' : 'bg-apple-blue'}`} />
          <span className="text-small font-medium">Now: {currentBlock.title}</span>
          <span className="text-small text-apple-muted">{currentBlock.start_time} — {currentBlock.end_time}</span>
          {currentBlock.is_google && <span className="badge-green text-micro">Google</span>}
        </motion.div>
      )}

      {/* Mini Calendar */}
      <AnimatePresence>
        {showMiniCal && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <MiniCalendar selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); if (viewMode === 'month') setViewMode('day') }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Stats */}
      {!searchQuery.trim() && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-micro text-apple-muted">
          <span>{allEvents.length} event{(allEvents.length !== 1 ? 's' : '')}</span>
          {allEvents.filter(e => !e.is_google).length > 0 && (
            <span>{allEvents.filter(e => !e.is_google).length} local</span>
          )}
          {allEvents.filter(e => e.is_google).length > 0 && (
            <span>{allEvents.filter(e => e.is_google).length} Google</span>
          )}
          <span>·</span>
          <span>Week {getWeekNumber(selectedDate)}</span>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search events…"
          className="input-field pl-8 text-small"
        />
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-apple-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-apple-muted hover:text-apple-text">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Views */}
      <AnimatePresence mode="wait">
        {viewMode === 'day' && (
          <motion.div key="day" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <DayView date={selectedDate} events={getEventsForDate(formatDateStr(selectedDate))} nowTime={nowTime} onSlotClick={handleSlotClick} onEdit={(b) => { setEditingBlock(b); setShowModal(true) }} onDelete={(b) => handleDelete(b.id, b.is_google, b.google_event_id)} onShowDetails={(b) => setShowDetails(b)} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} onResizeStart={handleResizeStart} dragResize={dragResize} />
          </motion.div>
        )}
        {viewMode === 'week' && (
          <motion.div key="week" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <WeekView weekDates={weekDates} events={filteredEvents} nowTime={nowTime} onSlotClick={handleSlotClick} onEdit={(b) => { setEditingBlock(b); setShowModal(true) }} onDelete={(b) => handleDelete(b.id, b.is_google, b.google_event_id)} onShowDetails={(b) => setShowDetails(b)} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} onResizeStart={handleResizeStart} dragResize={dragResize} />
          </motion.div>
        )}
        {viewMode === 'month' && (
          <motion.div key="month" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <MonthView days={monthDays} events={filteredEvents} selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setViewMode('day') }} onShowDetails={(b) => setShowDetails(b)} />
          </motion.div>
        )}
        {viewMode === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <ListView events={filteredEvents} nowTime={nowTime} onEdit={(b) => { setEditingBlock(b); setShowModal(true) }} onDelete={(b) => handleDelete(b.id, b.is_google, b.google_event_id)} onShowDetails={(b) => setShowDetails(b)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Modal */}
      <ScheduleModal
        open={showModal}
        block={editingBlock}
        selectedDate={selectedDate}
        onSave={handleSave}
        syncToGoogle={syncToGoogle}
        onToggleSync={() => setSyncToGoogle(!syncToGoogle)}
        gcalConnected={gcalConnected}
        templates={templates}
        onClose={() => { setShowModal(false); setEditingBlock(null); setNaturalInput('') }}
      />

      {/* Event Details Popup */}
      <EventDetailsPopup
        event={showDetails}
        onClose={() => setShowDetails(null)}
        onEdit={(b) => { setShowDetails(null); setEditingBlock(b); setShowModal(true) }}
        onDelete={(b) => handleDelete(b.id, b.is_google, b.google_event_id)}
      />
    </motion.div>
  )
}

function MiniCalendar({ selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate))
  const todayStr = formatDateStr(new Date())
  const selectedStr = formatDateStr(selectedDate)

  const days = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    const days = []
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), currentMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false })
    }
    return days
  }, [viewDate])

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })} className="p-1 hover:bg-apple-surface rounded">
          <ChevronLeft size={14} className="text-apple-muted" />
        </button>
        <span className="text-small font-semibold">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
        <button onClick={() => setViewDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })} className="p-1 hover:bg-apple-surface rounded">
          <ChevronRight size={14} className="text-apple-muted" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-apple-muted py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          const dateStr = formatDateStr(day.date)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedStr
          return (
            <button
              key={i}
              onClick={() => onSelectDate(day.date)}
              className={`text-[11px] py-1 rounded-full transition-colors ${!day.currentMonth ? 'text-apple-muted/30' : ''} ${isToday ? 'bg-apple-blue text-white font-semibold' : ''} ${isSelected && !isToday ? 'bg-apple-surface font-semibold' : ''} hover:bg-apple-surface`}
            >
              {day.date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DayView({ date, events, nowTime, onSlotClick, onEdit, onDelete, onShowDetails, onDragStart, onDragEnd, onDrop, onResizeStart, dragResize }) {
  const todayStr = formatDateStr(date)
  const isToday = todayStr === formatDateStr(new Date())
  const allDayEvents = events.filter(e => e.is_all_day)
  const timedEvents = events.filter(e => !e.is_all_day)

  return (
    <div className="card overflow-hidden">
      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-apple-border bg-apple-surface/30 px-4 py-2">
          <div className="text-micro text-apple-muted font-medium mb-1">All-day</div>
          <div className="flex gap-1 flex-wrap">
            {allDayEvents.map(event => (
              <div
                key={event.id + '-allday'}
                className="rounded px-2 py-1 text-small cursor-pointer hover:shadow-sm transition-shadow"
                style={{ backgroundColor: (event.color || '#0071E3') + '20', borderLeft: `2px solid ${event.color || '#0071E3'}` }}
                onClick={e => { e.stopPropagation(); onShowDetails(event) }}
              >
                <span className="font-medium" style={{ color: event.color || 'var(--text-primary)' }}>{event.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-h-[70vh] overflow-y-auto">
        {HOURS.map(hour => {
          const hourEvents = timedEvents.filter(e => Math.floor(timeToMin(e.start_time) / 60) === hour)
          const currentTimeMarker = isToday && hour === nowTime.getHours()

          return (
            <div
              key={hour}
              className="flex border-t border-apple-border/50 min-h-[60px] relative"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); onDrop(todayStr, hour) }}
            >
              <div className="w-16 flex-shrink-0 pt-2 pr-3 text-right">
                <span className="text-micro text-apple-muted font-medium">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </span>
              </div>
              <div
                className="flex-1 py-1 cursor-pointer hover:bg-apple-surface/50 transition-colors relative"
                onClick={() => onSlotClick(todayStr, hour)}
              >
                {currentTimeMarker && (
                  <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: `${(nowTime.getMinutes() / 60) * 60}px` }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-apple-red -ml-1.5" />
                    <div className="flex-1 h-px bg-apple-red" />
                  </div>
                )}
                {hourEvents.map(event => {
                  const startMin = timeToMin(event.start_time)
                  const endMin = timeToMin(event.end_time)
                  const duration = endMin - startMin || 60
                  const topOffset = ((startMin % 60) / 60) * 60
                  const height = Math.max((duration / 60) * 60, 24)
                  const isResizing = dragResize?.block.id === event.id

                  return (
                    <div
                      key={event.id + (event.is_google ? '-g' : '-l')}
                      draggable={!event.is_google}
                      onDragStart={e => onDragStart(e, event)}
                      onDragEnd={onDragEnd}
                      className="absolute left-1 right-2 rounded-md px-2 py-1 text-small cursor-pointer group transition-shadow hover:shadow-md"
                      style={{
                        top: `${topOffset}px`,
                        height: `${isResizing ? ((dragResize.newEnd - startMin) / 60) * 60 : height}px`,
                        backgroundColor: event.color ? event.color + '18' : 'var(--bg-surface)',
                        borderLeft: `3px solid ${event.color || 'var(--accent)'}`,
                      }}
                      onClick={e => { e.stopPropagation(); onShowDetails(event) }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate" style={{ color: event.color || 'var(--text-primary)' }}>{event.title}</span>
                        {!event.is_google && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); onEdit(event) }} className="p-0.5 hover:bg-apple-surface rounded"><Edit3 size={11} className="text-apple-muted" /></button>
                            <button onClick={e => { e.stopPropagation(); onDelete(event) }} className="p-0.5 hover:bg-apple-red/10 rounded"><Trash2 size={11} className="text-apple-red" /></button>
                          </div>
                        )}
                      </div>
                      <div className="text-micro text-apple-muted">{event.start_time} – {event.end_time}</div>
                      {event.is_google && <span className="text-[10px] text-apple-green font-medium">Google</span>}
                      {!event.is_google && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={e => onResizeStart(e, event)}
                        >
                          <div className="w-6 h-0.5 bg-apple-muted/50 rounded mx-auto mt-0.5" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ weekDates, events, nowTime, onSlotClick, onEdit, onDelete, onShowDetails, onDragStart, onDragEnd, onDrop, onResizeStart, dragResize }) {
  const todayStr = formatDateStr(new Date())
  const allDayEvents = events.filter(e => e.is_all_day)

  return (
    <div className="card overflow-hidden">
      {/* All-day events row */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-apple-border bg-apple-surface/30">
          <div className="w-16 flex-shrink-0" />
          {weekDates.map((d, i) => {
            const dateStr = formatDateStr(d)
            const dayAllDay = allDayEvents.filter(e => e.date === dateStr)
            return (
              <div key={i} className="flex-1 border-l border-apple-border/50 p-1 min-h-[28px]">
                {dayAllDay.map(event => (
                  <div
                    key={event.id + '-allday'}
                    className="rounded px-1.5 py-0.5 text-[11px] cursor-pointer truncate mb-0.5"
                    style={{ backgroundColor: (event.color || '#0071E3') + '20', borderLeft: `2px solid ${event.color || '#0071E3'}` }}
                    onClick={e => { e.stopPropagation(); onShowDetails(event) }}
                  >
                    <span className="font-medium truncate" style={{ color: event.color || 'var(--text-primary)' }}>{event.title}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Day headers */}
      <div className="flex border-b border-apple-border sticky top-0 bg-card z-10">
        <div className="w-16 flex-shrink-0" />
        {weekDates.map((d, i) => {
          const dateStr = formatDateStr(d)
          const isToday = dateStr === todayStr
          return (
            <div key={i} className={`flex-1 text-center py-2 border-l border-apple-border/50 ${isToday ? 'bg-apple-blue/5' : ''}`}>
              <div className="text-micro text-apple-muted">{DAYS_SHORT[d.getDay()]}</div>
              <div className={`text-heading font-semibold ${isToday ? 'text-apple-blue' : ''}`}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="flex border-t border-apple-border/50 min-h-[50px]">
            <div className="w-16 flex-shrink-0 pt-1 pr-2 text-right">
              <span className="text-micro text-apple-muted">{hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}</span>
            </div>
            {weekDates.map((d, i) => {
              const dateStr = formatDateStr(d)
              const isToday = dateStr === todayStr
              const hourEvents = events.filter(e => {
                if (e.is_google && e.date !== dateStr) return false
                if (e.is_all_day) return false
                if (e.date && e.date !== dateStr) return false
                return Math.floor(timeToMin(e.start_time) / 60) === hour
              })
              const currentTimeMarker = isToday && hour === nowTime.getHours()

              return (
                <div
                  key={i}
                  className={`flex-1 border-l border-apple-border/50 py-0.5 cursor-pointer hover:bg-apple-surface/30 transition-colors relative ${isToday ? 'bg-apple-blue/[0.02]' : ''}`}
                  onClick={() => onSlotClick(dateStr, hour)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); onDrop(dateStr, hour) }}
                >
                  {currentTimeMarker && (
                    <div className="absolute left-0 right-0 z-10" style={{ top: `${(nowTime.getMinutes() / 60) * 50}px` }}>
                      <div className="w-2 h-2 rounded-full bg-apple-red -ml-1" />
                      <div className="h-px bg-apple-red" />
                    </div>
                  )}
                  {hourEvents.map(event => {
                    const startMin = timeToMin(event.start_time)
                    const endMin = timeToMin(event.end_time)
                    const duration = endMin - startMin || 60
                    const height = Math.max((duration / 60) * 50, 18)
                    const isResizing = dragResize?.block.id === event.id

                    return (
                      <div
                        key={event.id + (event.is_google ? '-g' : '-l')}
                        draggable={!event.is_google}
                        onDragStart={e => onDragStart(e, event)}
                        onDragEnd={onDragEnd}
                        className="rounded px-1.5 py-0.5 text-[11px] cursor-pointer group transition-shadow hover:shadow-sm mb-0.5 truncate relative"
                        style={{
                          height: `${isResizing ? ((dragResize.newEnd - startMin) / 60) * 50 : height}px`,
                          backgroundColor: event.color ? event.color + '20' : 'var(--bg-surface)',
                          borderLeft: `2px solid ${event.color || 'var(--accent)'}`,
                        }}
                        onClick={e => { e.stopPropagation(); onShowDetails(event) }}
                        title={event.title}
                      >
                        <span className="font-medium truncate" style={{ color: event.color || 'var(--text-primary)' }}>{event.title}</span>
                        {!event.is_google && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100"
                            onMouseDown={e => onResizeStart(e, event)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthView({ days, events, selectedDate, onSelectDate, onShowDetails }) {
  const todayStr = formatDateStr(new Date())

  return (
    <div className="card">
      <div className="grid grid-cols-7 border-b border-apple-border">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center py-2 text-micro font-medium text-apple-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dateStr = formatDateStr(day.date)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === formatDateStr(selectedDate)
          const dayEvents = events.filter(e => {
            if (e.is_google && e.date) return e.date === dateStr
            if (e.date) return e.date === dateStr
            return true
          }).slice(0, 3)

          return (
            <div
              key={i}
              className={`min-h-[80px] p-1.5 border-b border-r border-apple-border/50 cursor-pointer transition-colors hover:bg-apple-surface/50 ${!day.currentMonth ? 'opacity-40' : ''} ${isToday ? 'bg-apple-blue/5' : ''} ${isSelected ? 'ring-2 ring-apple-blue ring-inset' : ''}`}
              onClick={() => onSelectDate(day.date)}
            >
              <div className={`text-small font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-apple-blue text-white' : ''}`}>
                {day.date.getDate()}
              </div>
              {dayEvents.map(event => (
                <div
                  key={event.id + (event.is_google ? '-g' : '-l')}
                  className="text-[10px] px-1 py-0.5 rounded truncate mb-0.5 cursor-pointer hover:opacity-80"
                  style={{
                    backgroundColor: event.color ? event.color + '20' : 'var(--bg-surface)',
                    color: event.color || 'var(--text-primary)',
                  }}
                  onClick={e => { e.stopPropagation(); onShowDetails(event) }}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] text-apple-muted">+{dayEvents.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListView({ events, nowTime, onEdit, onDelete, onShowDetails }) {
  const todayStr = formatDateStr(new Date())
  const todayEvents = events.filter(e => {
    if (e.is_google && e.date) return e.date === todayStr
    if (e.date) return e.date === todayStr
    return true
  }).sort((a, b) => {
    if (a.is_all_day && !b.is_all_day) return -1
    if (!a.is_all_day && b.is_all_day) return 1
    return timeToMin(a.start_time) - timeToMin(b.start_time)
  })

  if (todayEvents.length === 0) {
    return (
      <div className="text-center py-12 text-apple-muted">
        <Clock size={28} className="mx-auto mb-2 opacity-30" />
        <p className="text-body">No events scheduled</p>
        <p className="text-small mt-1">Click "Add" to create your first event</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {todayEvents.map((block, i) => (
        <motion.div key={block.id + (block.is_google ? '-g' : '-l')} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
          <div className="flex gap-4">
            <div className="w-16 flex-shrink-0 pt-2 text-right">
              <span className="text-small text-apple-muted font-medium">{block.is_all_day ? 'All day' : block.start_time}</span>
            </div>
            <div className="flex-1 relative pb-1">
              <div className="absolute left-0 top-0 bottom-1 w-px bg-apple-border" />
              <div
                className={`ml-3 p-2.5 rounded-md border transition-colors cursor-pointer group hover:shadow-sm`}
                style={{ borderLeftColor: block.color || (block.is_google ? '#34A853' : '#0071E3'), borderLeftWidth: '2px' }}
                onClick={() => onShowDetails(block)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-body font-medium">{block.title}</span>
                      {!block.is_all_day && <span className="text-small text-apple-muted ml-2">{block.start_time} — {block.end_time}</span>}
                    </div>
                    {block.is_google && <span className="badge-green text-micro whitespace-nowrap">Google</span>}
                    {block.recurrence && <span className="badge-purple text-micro whitespace-nowrap"><Repeat size={10} className="inline mr-0.5" />{block.recurrence}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!block.is_google && (
                      <>
                        <button onClick={e => { e.stopPropagation(); onEdit(block) }} className="p-1 hover:bg-apple-surface rounded transition-colors opacity-0 group-hover:opacity-100">
                          <Edit3 size={13} className="text-apple-muted" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); onDelete(block) }} className="p-1 hover:bg-apple-red/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={13} className="text-apple-red" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {block.subtitle && <p className="text-small text-apple-muted mt-0.5">{block.subtitle}</p>}
                <span className="inline-block text-micro font-medium px-1.5 py-0.5 rounded mt-1 bg-apple-surface text-apple-muted">{block.block_type}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function ScheduleModal({ block, open, onSave, onClose, selectedDate, syncToGoogle, onToggleSync, gcalConnected, templates }) {
  const [form, setForm] = useState(block || {
    start_time: '09:00', end_time: '10:00', title: '', subtitle: '',
    block_type: 'Work', color: BLOCK_COLORS['Work'], day_of_week: 'all',
    date: selectedDate ? formatDateStr(selectedDate) : formatDateStr(new Date()),
    recurrence: '', recurrence_end_date: '', is_all_day: false,
  })
  const [naturalInput, setNaturalInput] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (block) {
      setForm(block)
      setNaturalInput('')
    } else {
      setForm({
        start_time: '09:00', end_time: '10:00', title: '', subtitle: '',
        block_type: 'Work', color: BLOCK_COLORS['Work'], day_of_week: 'all',
        date: selectedDate ? formatDateStr(selectedDate) : formatDateStr(new Date()),
        recurrence: '', recurrence_end_date: '', is_all_day: false,
      })
      setNaturalInput('')
    }
  }, [block, open, selectedDate])

  useEffect(() => {
    if (!naturalInput) return
    const parsed = parseNaturalLanguage(naturalInput)
    if (parsed) {
      setForm(prev => ({
        ...prev,
        title: parsed.title || prev.title,
        start_time: parsed.start_time || prev.start_time,
        end_time: parsed.end_time || prev.end_time,
        date: parsed.date || prev.date,
        block_type: parsed.block_type || prev.block_type,
        color: parsed.color || prev.color,
      }))
    }
  }, [naturalInput])

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'block_type') {
      setForm(prev => ({ ...prev, color: BLOCK_COLORS[value] || prev.color }))
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(form)
  }

  function applyTemplate(t) {
    setForm(prev => ({
      ...prev,
      title: t.title,
      start_time: t.start_time,
      end_time: t.end_time,
      block_type: t.block_type,
      color: t.color,
    }))
    setShowTemplates(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={block ? 'Edit Event' : 'Add Event'} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Natural Language Input */}
        {!block && (
          <div className="relative">
            <label className="section-label block mb-1 flex items-center gap-1"><Sparkles size={12} /> Quick Add (natural language)</label>
            <div className="relative">
              <Zap size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-apple-muted" />
              <input
                type="text"
                value={naturalInput}
                onChange={e => setNaturalInput(e.target.value)}
                placeholder="e.g. Team meeting at 3pm to 4pm"
                className="input-field pl-8 pr-3"
              />
            </div>
          </div>
        )}

        {/* Templates */}
        {!block && templates.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="section-label flex items-center gap-1 hover:text-apple-text transition-colors">
              <MoreHorizontal size={12} /> Templates {showTemplates ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {templates.map(t => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                        className="p-2 rounded-lg border border-apple-border hover:bg-apple-surface transition-colors text-left"
                        style={{ borderLeftColor: t.color, borderLeftWidth: '2px' }}
                      >
                        <div className="text-small font-medium">{t.name}</div>
                        <div className="text-micro text-apple-muted">{t.start_time} – {t.end_time}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div>
          <label className="section-label block mb-1">Title</label>
          <input type="text" value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Event title" className="input-field" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label block mb-1 flex items-center gap-1"><MapPin size={12} /> Location</label>
            <input type="text" value={form.subtitle || ''} onChange={e => handleChange('subtitle', e.target.value)} placeholder="Location" className="input-field" />
          </div>
          <div>
            <label className="section-label block mb-1 flex items-center gap-1"><AlignLeft size={12} /> Description</label>
            <input type="text" value={form.description || ''} onChange={e => handleChange('description', e.target.value)} placeholder="Notes" className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="section-label block mb-1">Date</label>
            <input type="date" value={form.date || ''} onChange={e => handleChange('date', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="section-label block mb-1">Start</label>
            <input type="time" value={form.start_time} onChange={e => handleChange('start_time', e.target.value)} className="input-field" disabled={form.is_all_day} />
          </div>
          <div>
            <label className="section-label block mb-1">End</label>
            <input type="time" value={form.end_time} onChange={e => handleChange('end_time', e.target.value)} className="input-field" disabled={form.is_all_day} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label block mb-1">Type</label>
            <select value={form.block_type} onChange={e => handleChange('block_type', e.target.value)} className="input-field">
              {Object.keys(BLOCK_COLORS).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="section-label block mb-1">Color</label>
            <input type="color" value={form.color} onChange={e => handleChange('color', e.target.value)} className="w-full h-8 rounded-input cursor-pointer" />
          </div>
        </div>

        {/* Advanced: Recurrence & All-day */}
        <div>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="section-label flex items-center gap-1 hover:text-apple-text transition-colors">
            <Repeat size={12} /> Advanced options {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3 mt-2">
                <label className="flex items-center gap-2 text-small cursor-pointer">
                  <input type="checkbox" checked={form.is_all_day} onChange={e => handleChange('is_all_day', e.target.checked)} className="rounded border-apple-border" />
                  <span className="text-apple-muted">All-day event</span>
                </label>
                <div>
                  <label className="section-label block mb-1">Repeat</label>
                  <select value={form.recurrence || ''} onChange={e => handleChange('recurrence', e.target.value)} className="input-field">
                    <option value="">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {form.recurrence && (
                  <div>
                    <label className="section-label block mb-1">Repeat until</label>
                    <input type="date" value={form.recurrence_end_date || ''} onChange={e => handleChange('recurrence_end_date', e.target.value)} className="input-field" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {gcalConnected && (
          <label className="flex items-center gap-2 text-small cursor-pointer">
            <input type="checkbox" checked={syncToGoogle} onChange={onToggleSync} className="rounded border-apple-border" />
            <span className="text-apple-muted">Sync to Google Calendar</span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <motion.button whileTap={{ scale: 0.97 }} type="submit" className="btn-primary">{block ? 'Update' : 'Add'}</motion.button>
        </div>
      </form>
    </Modal>
  )
}

function EventDetailsPopup({ event, onClose, onEdit, onDelete }) {
  if (!event) return null

  return (
    <AnimatePresence>
      {event && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className="relative w-80 p-4 rounded-lg z-10 mx-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color || '#0071E3' }} />
                <h3 className="text-body font-semibold" style={{ color: 'var(--text-primary)' }}>{event.title}</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-apple-surface rounded transition-colors">
                <X size={14} className="text-apple-muted" />
              </button>
            </div>

            <div className="space-y-2 text-small">
              {event.is_all_day ? (
                <div className="flex items-center gap-2 text-apple-muted"><Calendar size={13} /> All-day</div>
              ) : (
                <div className="flex items-center gap-2 text-apple-muted"><Clock size={13} /> {event.start_time} – {event.end_time}</div>
              )}
              {event.date && (
                <div className="flex items-center gap-2 text-apple-muted"><Calendar size={13} /> {event.date}</div>
              )}
              {event.subtitle && (
                <div className="flex items-center gap-2 text-apple-muted"><MapPin size={13} /> {event.subtitle}</div>
              )}
              {event.description && (
                <div className="flex items-start gap-2 text-apple-muted"><AlignLeft size={13} className="mt-0.5" /> <span className="text-muted">{event.description}</span></div>
              )}
              {event.block_type && (
                <span className="inline-block text-micro font-medium px-1.5 py-0.5 rounded bg-apple-surface text-apple-muted">{event.block_type}</span>
              )}
              {event.is_google && <span className="badge-green text-micro">Google Calendar</span>}
              {event.recurrence && (
                <span className="badge-purple text-micro"><Repeat size={10} className="inline mr-0.5" />Repeats {event.recurrence}</span>
              )}
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-apple-border">
              {!event.is_google && (
                <>
                  <button onClick={() => onEdit(event)} className="flex-1 btn-ghost text-small flex items-center justify-center gap-1">
                    <Edit3 size={13} /> Edit
                  </button>
                  <button onClick={() => onDelete(event)} className="flex-1 btn-ghost text-small flex items-center justify-center gap-1 text-apple-red">
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              )}
              {event.is_google && event.htmlLink && (
                <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="flex-1 btn-ghost text-small text-center">
                  Open in Google
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
