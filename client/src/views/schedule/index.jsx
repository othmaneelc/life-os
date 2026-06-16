import { useState, useMemo, useCallback, useEffect, Suspense, lazy, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripHorizontal, X, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../../hooks/useConfirm'
import { formatDateStr, timeToMin, getRecurrenceDates } from './utils'
import { viewVariants, BLOCK_COLORS } from './constants'
import { useScheduleStore, useScheduleBlocks, useScheduleTemplates, useGoogleCalendarEvents, useGcalStatus, useAddScheduleBlock, useUpdateScheduleBlock, useDeleteScheduleBlock } from '../../store/scheduleStore'
import { useScheduleDrag } from './useScheduleDrag'
import { useScheduleKeyboard } from './useScheduleKeyboard'
import ScheduleHeader from './ScheduleHeader'
import NowPlayingBar from './NowPlayingBar'

const MiniCalendar = lazy(() => import('./MiniCalendar'))
const DayView = lazy(() => import('./DayView'))
const WeekView = lazy(() => import('./WeekView'))
const MonthView = lazy(() => import('./MonthView'))
const ListView = lazy(() => import('./ListView'))
const ScheduleModal = lazy(() => import('./ScheduleModal'))
const EventDetailsPopup = lazy(() => import('./EventDetailsPopup'))

function ScheduleSearchBar({ searchQuery, setSearchQuery, eventCount }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search events… (or type 'Meeting 3pm' to quick-add)"
        className="input-field pl-8 pr-8 text-small"
      />
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-apple-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      {searchQuery && (
        <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-apple-muted hover:text-apple-text">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

const DragOverlay = memo(function DragOverlay({ dragging }) {
  if (!dragging) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
      <div className="px-4 py-2 rounded-lg text-small font-medium" style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <GripHorizontal size={14} className="inline mr-1.5" />
        Drop to move: {dragging.title}
      </div>
    </motion.div>
  )
})

export default function Schedule() {
  const {
    viewMode, setViewMode, selectedDate, setSelectedDate, showModal, showMiniCal, setShowMiniCal,
    searchQuery, setSearchQuery, editingBlock, showDetails, dragResize, setDragResize,
    navigate, goToday, openNewEvent, closeModal, openEditEvent, openDetails, closeDetails,
  } = useScheduleStore()

  const { confirm, ConfirmModal } = useConfirm()
  const { dragging, handleDragStart, handleDragEnd, handleDrop, handleResizeStart } = useScheduleDrag()
  useScheduleKeyboard()

  const [nowTime, setNowTime] = useState(new Date())
  const [syncing, setSyncing] = useState(false)
  const [syncToGoogle, setSyncToGoogle] = useState(true)

  const { data: blocks = [], isLoading } = useScheduleBlocks()
  const { data: gcalStatus } = useGcalStatus()
  const { data: templates = [] } = useScheduleTemplates()
  const addBlock = useAddScheduleBlock()
  const updateBlock = useUpdateScheduleBlock()
  const deleteBlock = useDeleteScheduleBlock()

  const gcalConnected = gcalStatus?.connected ?? false

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
      if (b.date) return [{ ...b, is_google: false, date: b.date }]
      if (b.recurrence) {
        const dates = getRecurrenceDates(b.date || formatDateStr(new Date()), b.recurrence, b.recurrence_end_date)
        return dates.map(d => ({ ...b, is_google: false, date: d }))
      }
      return []
    })
    return local
  }, [blocks])

  const getEventsForDate = useCallback((dateStr) => {
    return allEvents.filter(e => e.date === dateStr)
      .sort((a, b) => {
        if (a.is_all_day && !b.is_all_day) return -1
        if (!a.is_all_day && b.is_all_day) return 1
        return timeToMin(a.start_time) - timeToMin(b.start_time)
      })
  }, [allEvents])

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

  const currentBlock = useMemo(() => {
    const today = formatDateStr(new Date())
    const currentMinutes = nowTime.getHours() * 60 + nowTime.getMinutes()
    return allEvents.find(b => {
      if (b.date !== today) return false
      if (b.is_all_day) return false
      const start = timeToMin(b.start_time)
      const end = timeToMin(b.end_time)
      return currentMinutes >= start && currentMinutes < end
    })
  }, [allEvents, nowTime])

  useEffect(() => {
    const clockInterval = setInterval(() => setNowTime(new Date()), 30000)
    return () => clearInterval(clockInterval)
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error === 'not_connected' ? 'Connect Google account in Settings first' : data.error)
      } else {
        toast.success(`Synced! ${data.result.synced} events`)
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleSlotClick = useCallback((dateStr, hour, startMin) => {
    const start = startMin !== undefined ? `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}` : `${String(hour).padStart(2, '0')}:00`
    const endHour = hour + 1 > 23 ? 23 : hour + 1
    const end = startMin !== undefined ? `${String(Math.floor((startMin + 60) / 60)).padStart(2, '0')}:${String((startMin + 60) % 60).padStart(2, '0')}` : `${String(endHour).padStart(2, '0')}:00`
    useScheduleStore.getState().setEditingBlock({
      title: '',
      start_time: start,
      end_time: end,
      date: dateStr,
      block_type: 'Work',
      color: BLOCK_COLORS['Work'],
    })
    useScheduleStore.getState().setShowModal(true)
  }, [])

  const handleSave = useCallback(async (form) => {
    try {
      if (form.id && !form.is_google) {
        await updateBlock.mutateAsync({ id: form.id, updates: form })
      } else {
        await addBlock.mutateAsync(form)
      }

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
        } catch {}
      }
      closeModal()
    } catch {
      toast.error('Failed to save block')
    }
  }, [syncToGoogle, gcalConnected, selectedDate, updateBlock, addBlock, closeModal])

  const handleDelete = useCallback(async (id, isGoogle, googleEventId, block) => {
    const ok = await confirm('Delete this event?', { title: 'Delete Event' })
    if (!ok) return

    const doDelete = async () => {
      try {
        if (isGoogle && googleEventId && gcalConnected) {
          await fetch(`/api/calendar/${googleEventId}`, { method: 'DELETE' })
          toast.success('Google event deleted')
        } else if (!isGoogle && id) {
          await deleteBlock.mutateAsync(id)
        }
        closeDetails()
      } catch {
        toast.error('Failed to delete')
      }
    }

    doDelete()

    if (block && !isGoogle) {
      const { title, start_time, end_time, date, block_type, color, subtitle, description, recurrence, recurrence_end_date, is_all_day } = block
      toast((t) => (
        <div className="flex items-center gap-3 text-small">
          <span>Event deleted</span>
          <button onClick={async () => {
            toast.dismiss(t.id)
            try {
              await addBlock.mutateAsync({ title, start_time, end_time, date, block_type, color, subtitle, description, recurrence, recurrence_end_date, is_all_day })
              toast.success('Restored')
            } catch { toast.error('Failed to restore') }
          }} className="text-apple-blue font-medium ml-2">Undo</button>
        </div>
      ), { duration: 5000 })
    }
  }, [gcalConnected, deleteBlock, addBlock, closeDetails, confirm])

  if (isLoading) {
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
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
      <ScheduleHeader
        selectedDate={selectedDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showMiniCal={showMiniCal}
        setShowMiniCal={setShowMiniCal}
        gcalConnected={gcalConnected}
        syncing={syncing}
        handleSync={handleSync}
        onNewEvent={openNewEvent}
        navigate={navigate}
        goToday={goToday}
      />

      {/* Keyboard hints */}
      <div className="flex items-center gap-3 flex-wrap hide-on-mobile" style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
        {[['N', 'New'], ['T', 'Today'], ['D', 'Day'], ['W', 'Week'], ['M', 'Month'], ['L', 'List'], ['←→', 'Navigate']].map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: 10 }}>{key}</kbd>
            {label}
          </span>
        ))}
      </div>

      {/* Sync Status */}
      {gcalConnected && gcalStatus?.lastSync && (
        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
          <Play size={10} />
          Google Calendar synced {new Date(gcalStatus.lastSync).toLocaleTimeString()} · {gcalStatus.eventCount} events
        </div>
      )}

      <NowPlayingBar currentBlock={currentBlock} />

      {/* Mini Calendar */}
      <AnimatePresence>
        {showMiniCal && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Suspense fallback={<div className="h-32 w-full rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />}>
              <MiniCalendar selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); if (viewMode === 'month') setViewMode('day') }} events={allEvents} />
            </Suspense>
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
          <span>{selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}</span>
        </motion.div>
      )}

      <ScheduleSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} eventCount={allEvents.length} />

      <DragOverlay dragging={dragging} />

      {/* Views */}
      <AnimatePresence mode="popLayout">
        {viewMode === 'day' && (
          <motion.div key="day" variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <Suspense fallback={<div className="h-64 w-full rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />}>
              <DayView date={selectedDate} events={getEventsForDate(formatDateStr(selectedDate))} nowTime={nowTime}
                onSlotClick={handleSlotClick}
                onEdit={(b) => { openEditEvent(b); setSyncToGoogle(gcalConnected) }}
                onDelete={(b) => handleDelete(b.id, b.is_google, b.google_event_id, b)}
                onShowDetails={openDetails}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop}
                onResizeStart={handleResizeStart} dragResize={dragResize} dragging={dragging} />
            </Suspense>
          </motion.div>
        )}
        {viewMode === 'week' && (
          <motion.div key="week" variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <Suspense fallback={<div className="h-64 w-full rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />}>
              <WeekView weekDates={weekDates} events={filteredEvents} nowTime={nowTime}
                onSlotClick={handleSlotClick}
                onEdit={(b) => { openEditEvent(b); setSyncToGoogle(gcalConnected) }}
                onDelete={(b) => handleDelete(b.id, b.is_google, b.google_event_id, b)}
                onShowDetails={openDetails}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop}
                onResizeStart={handleResizeStart} dragResize={dragResize} dragging={dragging} />
            </Suspense>
          </motion.div>
        )}
        {viewMode === 'month' && (
          <motion.div key="month" variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <Suspense fallback={<div className="h-64 w-full rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />}>
              <MonthView days={monthDays} events={filteredEvents} selectedDate={selectedDate}
                onSelectDate={(d) => { setSelectedDate(d); setViewMode('day') }}
                onShowDetails={openDetails} />
            </Suspense>
          </motion.div>
        )}
        {viewMode === 'list' && (
          <motion.div key="list" variants={viewVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <Suspense fallback={<div className="h-64 w-full rounded animate-shimmer" style={{ background: 'var(--bg-surface)' }} />}>
              <ListView events={filteredEvents} nowTime={nowTime}
                onEdit={(b) => { openEditEvent(b); setSyncToGoogle(gcalConnected) }}
                onDelete={(b) => handleDelete(b.id, b.is_google, b.google_event_id, b)}
                onShowDetails={openDetails} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <ScheduleModal
        open={showModal}
        block={editingBlock}
        selectedDate={selectedDate}
        onSave={handleSave}
        syncToGoogle={syncToGoogle}
        onToggleSync={() => setSyncToGoogle(!syncToGoogle)}
        gcalConnected={gcalConnected}
        templates={templates}
        onClose={closeModal}
      />

      <EventDetailsPopup
        event={showDetails}
        onClose={closeDetails}
        onEdit={(b) => { closeDetails(); openEditEvent(b); setSyncToGoogle(gcalConnected) }}
        onDelete={(b) => handleDelete(b.id, b.is_google, b.google_event_id, b)}
      />
      <ConfirmModal />
    </motion.div>
  )
}
