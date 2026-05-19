import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, RefreshCw, Sparkles, GripVertical } from 'lucide-react'
import TaskItem from '../components/TaskItem'
import { useTaskStore } from '../store/taskStore'
import { useAIStore } from '../store/aiStore'
import { useDebounce } from '../hooks/useDebounce'
import { staggerContainer } from '../utils/animations'

const SECTIONS = [
  { key: 'urgent', label: 'Urgent', color: 'text-apple-red' },
  { key: 'business', label: 'Business', color: 'text-apple-blue' },
  { key: 'personal', label: 'Personal', color: 'text-apple-purple' },
  { key: 'done', label: 'Completed', color: 'text-apple-green' },
]

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
  const tasks = useTaskStore(s => s.tasks)
  const loading = useTaskStore(s => s.loading)
  const fetchTasks = useTaskStore(s => s.fetchTasks)
  const addTask = useTaskStore(s => s.addTask)
  const [newTask, setNewTask] = useState('')
  const [newCategory, setNewCategory] = useState('urgent')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [dragItem, setDragItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)

  useEffect(() => { fetchTasks().catch(() => {}) }, [])

  async function handleGoogleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/tasksync/sync', { method: 'POST' })
      const data = await res.json()
      if (data.error) { setSyncMsg(data.error) }
      else { setSyncMsg(`Synced: ${data.pulled} pulled, ${data.pushed} pushed`); fetchTasks() }
    } catch (err) { setSyncMsg('Sync failed — check Google connection in Settings') }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  function handleAdd(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    addTask({ title: newTask.trim(), category: newCategory, priority: 'medium' })
    setNewTask('')
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

  const handleDragEnd = useCallback(async () => {
    if (dragItem && dragOverItem && dragItem.id !== dragOverItem.id) {
      const ids = tasks.map(t => {
        if (t.id === dragItem.id) return dragOverItem.id
        if (t.id === dragOverItem.id) return dragItem.id
        return t.id
      })
      try {
        await fetch('/api/tasks/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
        fetchTasks()
      } catch {}
    }
    setDragItem(null)
    setDragOverItem(null)
  }, [dragItem, dragOverItem, tasks, fetchTasks])

  const filtered = tasks.filter(t => {
    if (!t) return false
    if (debouncedSearch && !t.title?.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      return t.due_date === today
    }
    if (filter === 'week') {
      const end = new Date()
      end.setDate(end.getDate() + (6 - end.getDay()))
      return t.due_date && t.due_date <= end.toISOString().split('T')[0]
    }
    if (filter.startsWith('tag:')) return t.tag === filter.replace('tag:', '')
    return true
  })

  if (loading) return <LoadingSkeleton />

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading font-semibold">Tasks</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-tertiary" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..." className="input-field text-small pl-8 w-48" />
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
              if (prioritized) fetchTasks().catch(() => {})
            }}
            className="btn-ghost flex items-center gap-1 text-small border border-apple-border"
          >
            <Sparkles size={14} /> Prioritize
          </motion.button>
        </div>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
          placeholder="Add a new task..." className="input-field flex-1" />
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
        {SECTIONS.map(section => {
          const sectionTasks = filtered.filter(t => {
            if (section.key === 'done') return t.status === 'done'
            return t.category === section.key && t.status !== 'done'
          })
          if (sectionTasks.length === 0 && !debouncedSearch) return null

          return (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`section-label ${section.color}`}>{section.label}</span>
                <span className="text-micro text-apple-tertiary">({sectionTasks.length})</span>
              </div>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {sectionTasks.map((task, i) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      index={i}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      isDragging={dragItem?.id === task.id || (dragOverItem?.id === task.id && dragItem?.id !== task.id)}
                    />
                  ))}
                  {sectionTasks.length === 0 && (
                    <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-body text-apple-muted py-4 text-center">
                      {section.key === 'done' ? 'No completed tasks yet' : `No ${section.label.toLowerCase()} tasks`}
                    </motion.p>
                  )}
                </div>
              </AnimatePresence>
            </div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
