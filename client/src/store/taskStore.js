import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/tasks'
let priorityLock = Promise.resolve()

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch(API)
      if (!res.ok) throw new Error('Failed to load tasks')
      return res.json()
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })
}

export function useAddTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task) => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      })
      if (!res.ok) throw new Error('Failed to add task')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task added') },
    onError: () => toast.error('Failed to add task'),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update task')
      return res.json()
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = qc.getQueryData(['tasks'])
      if (previousTasks) {
        qc.setQueryData(['tasks'], (old) => old.map(t => t.id === id ? { ...t, ...updates } : t))
      }
      return { previousTasks }
    },
    onError: (err, { id, updates }, context) => {
      if (context?.previousTasks) qc.setQueryData(['tasks'], context.previousTasks)
      toast.error('Failed to update task')
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ['tasks'] }) },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete task')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task deleted') },
    onError: () => toast.error('Failed to delete task'),
  })
}

export function useSetTopPriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      priorityLock = priorityLock.then(async () => {
        const tasksRes = await fetch(API)
        const tasks = await tasksRes.json()
        for (const task of tasks) {
          if (task.is_top_priority && task.id !== id) {
            await fetch(`${API}/${task.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_top_priority: false }),
            })
          }
        }
        const current = tasks.find(t => t.id === id)
        const newVal = current ? !current.is_top_priority : false
        const res = await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_top_priority: newVal }),
        })
        if (!res.ok) throw new Error('Failed to set priority')
        return res.json()
      })
      return priorityLock
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Priority updated') },
    onError: () => toast.error('Failed to set priority'),
  })
}

export const useTaskStore = createWithEqualityFn((set, get) => ({
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
}), Object.is)
