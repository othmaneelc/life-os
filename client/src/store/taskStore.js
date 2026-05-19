import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/tasks'
let priorityLock = Promise.resolve()

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true })
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const tasks = await res.json()
      set({ tasks, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
      toast.error('Failed to load tasks')
    }
  },

  addTask: async (task) => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      })
      if (!res.ok) throw new Error('Failed to save')
      const newTask = await res.json()
      set(state => ({ tasks: [newTask, ...state.tasks] }))
      toast.success('Task added')
    } catch (err) {
      toast.error('Failed to add task')
    }
  },

  updateTask: async (id, updates) => {
    try {
      const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      set(state => ({
        tasks: state.tasks.map(t => t.id === id ? updated : t),
      }))
      toast.success('Task updated')
    } catch (err) {
      toast.error('Failed to update task')
    }
  },

  deleteTask: async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
      toast.success('Task deleted')
    } catch (err) {
      toast.error('Failed to delete task')
    }
  },

  setTopPriority: async (id) => {
    try {
      priorityLock = priorityLock.then(async () => {
        const state = get()
        for (const task of state.tasks) {
          if (task.is_top_priority && task.id !== id) {
            await fetch(`${API}/${task.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_top_priority: false }),
            })
          }
        }
        const newVal = state.tasks.find(t => t.id === id)?.is_top_priority ? false : true
        await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_top_priority: newVal }),
        })
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === id ? { ...t, is_top_priority: newVal } : { ...t, is_top_priority: false }
          ),
        }))
        toast.success('Priority updated')
      })
      await priorityLock
    } catch (err) {
      toast.error('Failed to set priority')
    }
  },

  getFilteredTasks: (filter) => {
    const { tasks } = get()
    if (filter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      return tasks.filter(t => t.due_date === today || t.due_date === undefined)
    }
    if (filter === 'week') {
      const today = new Date()
      const end = new Date(today)
      end.setDate(today.getDate() + (6 - today.getDay()))
      return tasks.filter(t => t.due_date && t.due_date <= end.toISOString().split('T')[0])
    }
    if (filter && filter.startsWith('tag:')) {
      return tasks.filter(t => t.tag === filter.replace('tag:', ''))
    }
    return tasks
  },
}))
