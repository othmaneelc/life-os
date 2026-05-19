import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { useTaskStore } from '../store/taskStore'
import { priorityStyles, statusLabels, statusColors, tagColors } from '../utils/formatters'

const CONFETTI_COLORS = ['#0071E3', '#FF9F0A', '#AF52DE', '#34C759', '#FF3B30', '#5856D6', '#30D158', '#FFD60A']

function ConfettiBurst({ active }) {
  if (!active) return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: Math.cos((i / 16) * Math.PI * 2) * 40 + (Math.random() - 0.5) * 20,
            y: Math.sin((i / 16) * Math.PI * 2) * 40 + (Math.random() - 0.5) * 20 - 30,
            scale: 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute w-1.5 h-1.5 rounded-full top-1/2 left-1/2"
          style={{ backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
        />
      ))}
    </div>
  )
}

function TaskItem({ task, index = 0, onDragStart, onDragOver, onDragEnd, isDragging }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [confetti, setConfetti] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const titleRef = useRef(null)
  const updateTask = useTaskStore(s => s.updateTask)
  const deleteTask = useTaskStore(s => s.deleteTask)
  const setTopPriority = useTaskStore(s => s.setTopPriority)

  const priority = priorityStyles[task.priority] || priorityStyles.medium
  const wasDone = useRef(task.status === 'done')

  useEffect(() => {
    if (task.status === 'done' && !wasDone.current) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 700)
    }
    wasDone.current = task.status === 'done'
  }, [task.status])

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus()
  }, [editingTitle])

  const handleStatusChange = useCallback((newStatus) => {
    updateTask(task.id, { status: newStatus })
  }, [task.id, updateTask])

  const handleNotesSave = useCallback(() => updateTask(task.id, { notes }), [task.id, notes, updateTask])

  const handleTitleSave = useCallback(() => {
    if (editTitle.trim() && editTitle !== task.title) {
      updateTask(task.id, { title: editTitle.trim() })
    } else {
      setEditTitle(task.title)
    }
    setEditingTitle(false)
  }, [editTitle, task.id, task.title, updateTask])

  const handleDueDateChange = useCallback((e) => {
    updateTask(task.id, { due_date: e.target.value || null })
    setEditingDueDate(false)
  }, [task.id, updateTask])

  const handleDragStart = useCallback((e) => {
    onDragStart?.(e, task)
  }, [onDragStart, task])

  const handleDragOver = useCallback((e) => {
    onDragOver?.(e, task)
  }, [onDragOver, task])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={`card-hover group relative ${task.is_top_priority ? 'border-l-[3px] border-l-apple-blue' : ''} ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={onDragEnd}
    >
      <ConfettiBurst active={confetti} />
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1 pt-1.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={e => e.stopPropagation()}>
          <GripVertical size={14} className="text-apple-tertiary" />
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            checked={task.status === 'done'}
            onChange={() => handleStatusChange(task.status === 'done' ? 'todo' : 'done')}
            className="w-4 h-4 rounded border-apple-border text-apple-blue focus:ring-apple-blue/30 cursor-pointer"
          />
          <button
            onClick={(e) => { e.stopPropagation(); setTopPriority(task.id) }}
            className={`transition-colors ${task.is_top_priority ? 'text-apple-amber' : 'text-apple-tertiary hover:text-apple-amber'}`}
          >
            <Star size={14} fill={task.is_top_priority ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {editingTitle ? (
              <input
                ref={titleRef}
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setEditTitle(task.title); setEditingTitle(false) } }}
                className="input-field text-body py-0.5 px-1 min-w-[120px]"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className={`text-body cursor-pointer hover:bg-apple-surface/50 rounded px-0.5 -mx-0.5 transition-colors ${task.status === 'done' ? 'line-through text-apple-tertiary' : 'text-apple-text'}`}
                onClick={() => { setEditTitle(task.title); setEditingTitle(true) }}
              >
                {task.title}
              </span>
            )}
            {task.tag && <span className={tagColors[task.tag] || 'badge-gray'}>{task.tag}</span>}
            <span className={priority.badge}>{priority.label}</span>
            <span className={statusColors[task.status]}>{statusLabels[task.status]}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-small text-apple-muted">
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 hover:text-apple-blue transition-colors">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {expanded ? 'Less' : 'More'}
            </button>
            {editingDueDate ? (
              <input
                type="date"
                defaultValue={task.due_date || ''}
                onBlur={handleDueDateChange}
                onChange={e => { if (!e.target.value) { updateTask(task.id, { due_date: null }); setEditingDueDate(false) } }}
                onKeyDown={e => { if (e.key === 'Enter') handleDueDateChange(e); if (e.key === 'Escape') setEditingDueDate(false) }}
                className="input-field text-small py-0.5 w-36"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <button
                onClick={() => setEditingDueDate(true)}
                className="hover:text-apple-blue transition-colors flex items-center gap-1"
              >
                {task.due_date ? (
                  <><span className="text-apple-muted">Due:</span> {task.due_date}</>
                ) : (
                  <span className="text-apple-tertiary italic">Set due date</span>
                )}
              </button>
            )}
          </div>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-3 space-y-3 pt-3 border-t border-apple-border"
            >
              <div className="flex gap-2">
                <select value={task.status} onChange={e => handleStatusChange(e.target.value)} className="input-field text-small flex-1">
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select value={task.priority} onChange={e => updateTask(task.id, { priority: e.target.value })} className="input-field text-small flex-1">
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
                <select value={task.category} onChange={e => updateTask(task.id, { category: e.target.value })} className="input-field text-small flex-1">
                  <option value="urgent">Urgent</option><option value="business">Business</option><option value="personal">Personal</option>
                </select>
              </div>
              <input type="date" value={task.due_date || ''} onChange={e => { updateTask(task.id, { due_date: e.target.value || null }) }} className="input-field text-small" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNotesSave} placeholder="Notes..." className="input-field text-small min-h-[60px] resize-y" />
            </motion.div>
          )}
        </div>
        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-apple-red/10 rounded-md transition-all text-apple-tertiary hover:text-apple-red">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

export default memo(TaskItem)
