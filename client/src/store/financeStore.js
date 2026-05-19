import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/finance'

export const useFinanceStore = create((set, get) => ({
  transactions: [],
  budgets: [],
  summary: null,
  reports: [],

  fetchTransactions: async (filters = {}) => {
    try {
      set({ lastFilters: filters })
      const params = new URLSearchParams()
      if (filters.month) params.set('month', filters.month)
      if (filters.year) params.set('year', filters.year)
      if (filters.type) params.set('type', filters.type)
      if (filters.is_personal !== undefined) params.set('is_personal', filters.is_personal)
      const res = await fetch(`${API}/transactions?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      set({ transactions: await res.json() })
    } catch { toast.error('Failed to load transactions') }
  },

  addTransaction: async (tx) => {
    try {
      const res = await fetch(API + '/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      })
      if (!res.ok) throw new Error('Failed to add')
      await Promise.all([
        get().fetchTransactions(get().lastFilters),
        get().fetchSummary(get().lastSummaryFilters),
        get().fetchBudgets(get().lastBudgetFilters),
      ])
      toast.success(tx.type === 'income' ? 'Income added' : 'Expense added')
    } catch { toast.error('Failed to add transaction') }
  },

  updateTransaction: async (id, updates) => {
    try {
      const res = await fetch(`${API}/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update')
      await get().fetchTransactions(get().lastFilters)
      toast.success('Transaction updated')
    } catch { toast.error('Failed to update transaction') }
  },

  deleteTransaction: async (id) => {
    try {
      const res = await fetch(`${API}/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      await Promise.all([
        get().fetchTransactions(get().lastFilters),
        get().fetchSummary(get().lastSummaryFilters),
        get().fetchBudgets(get().lastBudgetFilters),
      ])
      toast.success('Transaction deleted')
    } catch { toast.error('Failed to delete transaction') }
  },

  fetchBudgets: async (filters = {}) => {
    try {
      set({ lastBudgetFilters: filters })
      const params = new URLSearchParams()
      if (filters.month) params.set('month', filters.month)
      if (filters.year) params.set('year', filters.year)
      const res = await fetch(`${API}/budgets?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      set({ budgets: await res.json() })
    } catch { toast.error('Failed to load budgets') }
  },

  setBudget: async (budget) => {
    try {
      const res = await fetch(API + '/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget),
      })
      if (!res.ok) throw new Error('Failed to save')
      await get().fetchBudgets(get().lastBudgetFilters)
      toast.success('Budget saved')
    } catch { toast.error('Failed to save budget') }
  },

  deleteBudget: async (id) => {
    try {
      const res = await fetch(`${API}/budgets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      await get().fetchBudgets(get().lastBudgetFilters)
      toast.success('Budget deleted')
    } catch { toast.error('Failed to delete budget') }
  },

  fetchReports: async (start, end) => {
    try {
      const res = await fetch(`${API}/reports?start=${start}&end=${end}`)
      if (!res.ok) throw new Error('Failed to load')
      set({ reports: await res.json() })
    } catch { toast.error('Failed to load reports') }
  },

  fetchSummary: async (filters = {}) => {
    try {
      set({ lastSummaryFilters: filters })
      const params = new URLSearchParams()
      if (filters.month) params.set('month', filters.month)
      if (filters.year) params.set('year', filters.year)
      const res = await fetch(`${API}/summary?${params}`)
      if (!res.ok) throw new Error('Failed to load')
      const summary = await res.json()
      set({ summary })
      // Check budget alerts
      summary.budgetAlerts?.forEach(b => {
        if (b.pct >= 100) {
          const alerted = get()._alertedOver
          if (!alerted.has(b.id)) {
            toast.error(`${b.name}: Over budget! (${b.pct}%)`)
            set({ _alertedOver: new Set(alerted).add(b.id) })
          }
        } else if (b.pct >= 80) {
          const alerted = get()._alertedWarn
          if (!alerted.has(b.id)) {
            toast(`${b.name}: ${b.pct}% of budget used`, { icon: '⚠️' })
            set({ _alertedWarn: new Set(alerted).add(b.id) })
          }
        }
      })
    } catch { toast.error('Failed to load summary') }
  },

  lastFilters: {},
  lastSummaryFilters: {},
  lastBudgetFilters: {},
  _alertedOver: new Set(),
  _alertedWarn: new Set(),
}))
