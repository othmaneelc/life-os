import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, RefreshCw, Sparkles, CheckSquare, Trash2, CheckCheck, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import TaskItem from '../components/TaskItem'
import DataError from '../components/DataError'
import EmptyState from '../components/EmptyState'
import { useTasks, useAddTask, useUpdateTask, useDeleteTask, useSetTopPriority } from '../store/taskStore'
import { useAIStore } from '../store/aiStore'
import { useAppUIStore } from '../store/appUIStore'
import { useDebounce } from '../hooks/useDebounce'
import { staggerContainer } from '../utils/animations'

const SECTIONS = [
  { key: 'urgent', label: 'Urgent', color: 'text-apple-red' },
  { key: 'business', label: 'Business', color: 'text-apple-blue' },
  { key: 'personal', label: 'Personal', color: 'text-apple-purple' },
  { key: 'done', label: 'Completed', color: 'text-apple-green' },
]

const TaskItemWrapper = memo(({ task, index, selectMode, selected, isDragging, onDragStart, onDragOver, onDragEnd, onToggle }) => {
  const handleToggle = useCallback(() => onToggle(task.id), [onToggle, task.id])
  return (
    <TaskItem
      task={task}
      index={index}
      selectMode={selectMode}
      selected={selected}
      onToggleSelect={handleToggle}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      isDragging={isDragging}
    />
  )
})

function LoadingSkeleton() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="w-24 h-7 bg-apple-surface rounded animate-shimmer" />
        <div className="flex gap-2">
          <div className="w-48 h-9 bg-apple-surface rounded animate-shimmer" />
          <div className="w-32 h-9 bg-apple-surface rounded animate-shimmer" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-apple-surface rounded animate-shimmer" />
        <div className="w-32 h-10 bg-apple-surface rounded animate-shimmer" />
        <div className="w-20 h-10 bg-apple-surface rounded animate-shimmer" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 bg-apple-surface rounded animate-shimmer" />
      ))}
    </div>
  )
}

export default function Tasks() {
  const queryClient = useQueryClient()
  const { data: tasks = [], isLoading: loading, isError: error, refetch: refetchTasks } = useTasks()
  const addTaskMutation = useAddTask()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const setTopPriorityMutation = useSetTopPriority()
  const [newTask, setNewTask] = useState('')
  const [newCategory, setNewCategory] = useState('urgent')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [dragItem, setDragItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)
  const [dragOverSection, setDragOverSection] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const addInputRef = useRef(null)
  const syncTimeoutRef = useRef(null)

  async function handleGoogleSync() {
    const controller = new AbortController()
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/tasksync/sync', { method: 'POST', signal: controller.signal })
      const data = await res.json()
      if (data.error) { setSyncMsg(data.error) }
      else { setSyncMsg(`Synced: ${data.pulled} pulled, ${data.pushed} pushed`); refetchTasks() }
    } catch (err) {
      if (err.name !== 'AbortError') setSyncMsg('Sync failed — check Google connection in Settings')
    }
    setSyncing(false)
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => setSyncMsg(''), 4000)
  }

  useEffect(() => {
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current) }
  }, [])

  function handleAdd(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    addTaskMutation.mutate({ title: newTask.trim(), category: newCategory, priority: 'medium' })
    setNewTask('')
    addInputRef.current?.focus()
  }

  const handleDragStart = useCallback((e, task) => {
    setDragItem(task)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, task) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (task.id !== dragItem?.id) setDragOverItem(task)
  }, [dragItem])

  const handleSectionDragOver = useCallback((e, sectionKey) => {
    if (!dragItem) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSection(sectionKey)
  }, [dragItem])

  const handleSectionDragLeave = useCallback(() => {
    setDragOverSection(null)
  }, [])

  const handleToggleSelect = useCallback((taskId) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }, [])

  const handleSectionDrop = useCallback(async (sectionKey) => {
    if (!dragItem || dragItem.category === sectionKey) { setDragOverSection(null); return }
    try {
      await fetch(`/api/tasks/${dragItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: sectionKey }),
      })
      // If task was done and moved to another section, set status to todo
      if (dragItem.status === 'done') {
        await fetch(`/api/tasks/${dragItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'todo' }),
        })
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(`Moved to ${SECTIONS.find(s => s.key === sectionKey)?.label}`)
    } catch { toast.error('Failed to move task') }
    setDragOverSection(null)
  }, [dragItem, queryClient])

  const handleDragEnd = useCallback(async () => {
    if (dragOverSection) {
      await handleSectionDrop(dragOverSection)
      setDragItem(null)
      setDragOverItem(null)
      setDragOverSection(null)
      return
    }
    if (dragItem && dragOverItem && dragItem.id !== dragOverItem.id) {
      const fromIndex = tasks.findIndex(t => t.id === dragItem.id)
      const toIndex = tasks.findIndex(t => t.id === dragOverItem.id)
      if (fromIndex === -1 || toIndex === -1) { setDragItem(null); setDragOverItem(null); setDragOverSection(null); return }
      const ids = [...tasks.map(t => t.id)]
      ids.splice(fromIndex, 1)
      ids.splice(toIndex, 0, dragItem.id)
      try {
        await fetch('/api/tasks/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      } catch { toast.error('Failed to reorder tasks') }
    }
    setDragItem(null)
    setDragOverItem(null)
    setDragOverSection(null)
  }, [dragItem, dragOverItem, dragOverSection, tasks, queryClient, handleSectionDrop])

  const filtered = useMemo(() => tasks.filter(t => {
    if (!t) return false
    if (debouncedSearch && !t.title?.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    if (filter === 'today') {
      const now = new Date()
      const localStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      return t.due_date === localStr
    }
    if (filter === 'week') {
      const now = new Date()
      const day = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const mStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
      const sStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
      return t.due_date && t.due_date >= mStr && t.due_date <= sStr
    }
    if (filter.startsWith('tag:')) return t.tag === filter.replace('tag:', '')
    return true
  }), [tasks, debouncedSearch, filter])

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); addInputRef.current?.focus() }
      if (e.key === '/' && !search) { e.preventDefault(); document.querySelector('[data-task-search]')?.focus() }
      if (e.key === 'Escape') { setSelectMode(false); setSelectedIds(new Set()) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [search])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-8 max-w-6xl mx-auto">
        <h1 className="text-heading font-semibold mb-6">Tasks</h1>
        <DataError message="Failed to load tasks" onRetry={refetchTasks} />
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-heading font-semibold">Tasks</h1>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()) }}
              className={`btn-ghost flex items-center gap-1 text-small border ${selectMode ? 'border-apple-blue text-apple-blue' : 'border-apple-border'}`}
            >
              <CheckSquare size={14} /> {selectMode ? 'Done' : 'Select'}
            </motion.button>
            <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-tertiary" />
            <input data-task-search type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks... (/)" className="input-field text-small pl-8 w-48" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field text-small w-32">
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="tag:CDZ">Tag: CDZ</option>
            <option value="tag:HVAC">Tag: HVAC</option>
            <option value="tag:Agency">Tag: Agency</option>
            <option value="tag:Brand">Tag: Brand</option>
            <option value="tag:Self">Tag: Self</option>
            <option value="tag:Faith">Tag: Faith</option>
          </select>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleGoogleSync}
            disabled={syncing}
            className="btn-ghost flex items-center gap-1 text-small border border-apple-border"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Google Sync'}
          </motion.button>
          {syncMsg && <span className="text-micro text-apple-muted max-w-[200px]">{syncMsg}</span>}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              const prioritized = await useAIStore.getState().prioritize()
              if (prioritized) refetchTasks()
            }}
            className="btn-ghost flex items-center gap-1 text-small border border-apple-border"
          >
            <Sparkles size={14} /> Prioritize
          </motion.button>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input ref={addInputRef} type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
          placeholder="Add a new task... (n)" className="input-field flex-1" />
        <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="input-field w-32">
          <option value="urgent">Urgent</option>
          <option value="business">Business</option>
          <option value="personal">Personal</option>
        </select>
        <motion.button whileTap={{ scale: 0.95 }} type="submit" className="btn-primary flex items-center gap-1">
          <Plus size={16} /> Add
        </motion.button>
      </form>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
        {filtered.length === 0 && !debouncedSearch ? (
          <EmptyState
            icon="tasks"
            title="No tasks yet"
            description="Create your first task to get started"
            actionLabel="Add Task"
            onAction={() => useAppUIStore.getState().openQuickAdd()}
          />
        ) : (
          SECTIONS.map(section => {
          const sectionTasks = filtered.filter(t => {
            if (section.key === 'done') return t.status === 'done'
            return t.category === section.key && t.status !== 'done'
          })
          return (
            <div key={section.key}
              onDragOver={(e) => dragItem && handleSectionDragOver(e, section.key)}
              onDragLeave={handleSectionDragLeave}
              style={{
                padding: '8px',
                borderRadius: '8px',
                transition: 'background 0.15s',
                background: dragOverSection === section.key ? 'rgba(0, 194, 255, 0.08)' : 'transparent',
                outline: dragOverSection === section.key ? '1px dashed rgba(0, 194, 255, 0.3)' : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`section-label ${section.color}`}>{section.label}</span>
                <span className="text-micro text-apple-tertiary">({sectionTasks.length})</span>
                {selectMode && sectionTasks.length > 0 && (
                  <button onClick={() => {
                    const allIds = sectionTasks.map(t => t.id)
                    setSelectedIds(prev => {
                      const next = new Set(prev)
                      const allSelected = allIds.every(id => prev.has(id))
                      allIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
                      return next
                    })
                  }} className="text-micro text-apple-blue hover:underline ml-auto">
                    {sectionTasks.every(t => selectedIds.has(t.id)) ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {sectionTasks.length > 0 ? sectionTasks.map((task, i) => (
                    <TaskItemWrapper
                      key={task.id}
                      task={task}
                      index={i}
                      selectMode={selectMode}
                      selected={selectedIds.has(task.id)}
                      onToggle={handleToggleSelect}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      isDragging={dragItem?.id === task.id || (dragOverItem?.id === task.id && dragItem?.id !== task.id)}
                    />
                  )) : (
                    <motion.p
                      key={`empty-${section.key}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-body text-apple-muted py-4 text-center"
                    >
                      {section.key === 'done'
                        ? 'No completed tasks — drag completed tasks here'
                        : `Drop tasks here to move to ${section.label}`
                      }
                    </motion.p>
                  )}
                </div>
              </AnimatePresence>
            </div>
          )
        }))}
      </motion.div>

      {selectMode && selectedIds.size > 0 && (
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <span className="text-small text-apple-muted">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-apple-border" />
          <button onClick={() => {
            selectedIds.forEach(id => updateTaskMutation.mutate({ id, updates: { status: 'done' } }))
            setSelectedIds(new Set())
            toast.success(`${selectedIds.size} tasks completed`)
          }} className="flex items-center gap-1 text-small text-apple-green font-medium hover:opacity-80 transition-opacity">
            <CheckCheck size={14} /> Done
          </button>
          <button onClick={() => {
            selectedIds.forEach(id => updateTaskMutation.mutate({ id, updates: { status: 'todo' } }))
            setSelectedIds(new Set())
            toast.success(`${selectedIds.size} tasks moved to todo`)
          }} className="flex items-center gap-1 text-small text-apple-blue font-medium hover:opacity-80 transition-opacity">
            <CheckCheck size={14} /> Todo
          </button>
          <div className="w-px h-5 bg-apple-border" />
          <button onClick={() => {
            selectedIds.forEach(id => deleteTaskMutation.mutate(id))
            setSelectedIds(new Set())
            toast.success(`${selectedIds.size} tasks deleted`)
          }} className="flex items-center gap-1 text-small text-apple-red font-medium hover:opacity-80 transition-opacity">
            <Trash2 size={14} /> Delete
          </button>
          <div className="w-px h-5 bg-apple-border" />
          <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1 text-small text-apple-muted hover:text-apple-text transition-colors">
            <X size={14} /> Clear
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
