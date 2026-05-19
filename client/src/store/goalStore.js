import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/goals'

export const useGoalStore = create((set, get) => ({
  goals: [],
  loading: false,

  fetchGoals: async () => {
    set({ loading: true })
    try {
      const res = await fetch(API)
      if (!res.ok) throw new Error()
      set({ goals: await res.json(), loading: false })
    } catch { set({ loading: false }); toast.error('Failed to load goals') }
  },

  addGoal: async (goal) => {
    try {
      const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goal) })
      if (!res.ok) throw new Error()
      await get().fetchGoals()
      toast.success('Goal added')
    } catch { toast.error('Failed to add goal') }
  },

  updateGoal: async (id, updates) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!res.ok) throw new Error()
      await get().fetchGoals()
      toast.success('Goal updated')
    } catch { toast.error('Failed to update goal') }
  },

  deleteGoal: async (id) => {
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await get().fetchGoals()
      toast.success('Goal deleted')
    } catch { toast.error('Failed to delete goal') }
  },

  addStep: async (goalId, title) => {
    try {
      const res = await fetch(`${API}/${goalId}/steps`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
      if (!res.ok) throw new Error()
      await get().fetchGoals()
    } catch { toast.error('Failed to add step') }
  },

  toggleStep: async (goalId, stepId) => {
    try {
      const res = await fetch(`${API}/${goalId}/steps/${stepId}`, { method: 'PUT' })
      if (!res.ok) throw new Error()
      await get().fetchGoals()
    } catch { toast.error('Failed to toggle step') }
  },

  deleteStep: async (goalId, stepId) => {
    try {
      const res = await fetch(`${API}/${goalId}/steps/${stepId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await get().fetchGoals()
    } catch { toast.error('Failed to delete step') }
  },

  linkHabit: async (goalId, habit_id) => {
    try {
      const res = await fetch(`${API}/${goalId}/habits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ habit_id }) })
      if (!res.ok) throw new Error()
      await get().fetchGoals()
      toast.success('Habit linked')
    } catch { toast.error('Failed to link habit') }
  },

  unlinkHabit: async (goalId, habitId) => {
    try {
      const res = await fetch(`${API}/${goalId}/habits/${habitId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await get().fetchGoals()
    } catch { toast.error('Failed to unlink habit') }
  },
}))
