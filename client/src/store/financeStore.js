import { createWithEqualityFn } from 'zustand/traditional'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/finance'

export function useTransactions(filters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.month) params.set('month', filters.month)
      if (filters.year) params.set('year', filters.year)
      if (filters.type) params.set('type', filters.type)
      if (filters.is_personal !== undefined) params.set('is_personal', filters.is_personal)
      const r = await fetch(`${API}/transactions?${params}`)
      if (!r.ok) throw new Error()
      return r.json()
    },
    staleTime: 15000,
  })
}

export function useBudgets(filters = {}) {
  return useQuery({
    queryKey: ['budgets', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.month) params.set('month', filters.month)
      if (filters.year) params.set('year', filters.year)
      const r = await fetch(`${API}/budgets?${params}`)
      if (!r.ok) throw new Error()
      return r.json()
    },
    staleTime: 15000,
  })
}

export function useSummary(filters = {}) {
  return useQuery({
    queryKey: ['summary', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.month) params.set('month', filters.month)
      if (filters.year) params.set('year', filters.year)
      const r = await fetch(`${API}/summary?${params}`)
      if (!r.ok) throw new Error()
      return r.json()
    },
    staleTime: 15000,
  })
}

export function useReports(start, end) {
  return useQuery({ queryKey: ['reports', start, end], queryFn: async () => { const r = await fetch(`${API}/reports?start=${start}&end=${end}`); if (!r.ok) throw new Error(); return r.json() }, enabled: !!start && !!end, staleTime: 60000 })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tx) => {
      const r = await fetch(`${API}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['summary'] }); qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Transaction added') },
    onError: () => toast.error('Failed to add transaction'),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const r = await fetch(`${API}/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: () => toast.error('Failed to update transaction'),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => { const r = await fetch(`${API}/transactions/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error() },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['summary'] }); qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Transaction deleted') },
    onError: () => toast.error('Failed to delete transaction'),
  })
}

export function useSetBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (budget) => {
      const r = await fetch(`${API}/budgets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(budget) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Budget saved') },
    onError: () => toast.error('Failed to save budget'),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => { const r = await fetch(`${API}/budgets/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error() },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); toast.success('Budget deleted') },
    onError: () => toast.error('Failed to delete budget'),
  })
}

export function useAddDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (debt) => {
      const r = await fetch(`${API}/debts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(debt) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); toast.success('Debt added') },
    onError: () => toast.error('Failed to add debt'),
  })
}

export function useDebts() {
  return useQuery({ queryKey: ['debts'], queryFn: async () => { const r = await fetch(`${API}/debts`); if (!r.ok) throw new Error(); return r.json() }, staleTime: 30000 })
}

export function useUpdateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const r = await fetch(`${API}/debts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); toast.success('Debt updated') },
    onError: () => toast.error('Failed to update debt'),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => { const r = await fetch(`${API}/debts/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error() },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); toast.success('Debt deleted') },
    onError: () => toast.error('Failed to delete debt'),
  })
}

export const useFinanceStore = createWithEqualityFn((set, get) => ({
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
}), Object.is)
