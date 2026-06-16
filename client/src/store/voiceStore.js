import { createWithEqualityFn } from 'zustand/traditional'

const FINANCIAL_ACTIONS = new Set(['add_expense', 'add_income', 'add_transaction'])
const HIGH_RISK_THRESHOLD = 500

function classifyRisk(actions) {
  return actions.some(a =>
    FINANCIAL_ACTIONS.has(a.action) && (a.params?.amount || 0) >= HIGH_RISK_THRESHOLD
  ) ? 'high' : 'low'
}

function createTimer(store, inboxId, delayMs) {
  const startTime = Date.now()
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, delayMs - elapsed)
    store.setState(s => ({
      pendingActions: s.pendingActions.map(pa =>
        pa.inboxId === inboxId ? { ...pa, remainingMs: remaining } : pa
      )
    }))
    if (remaining <= 0) {
      clearInterval(interval)
      const pa = store.getState().pendingActions.find(p => p.inboxId === inboxId)
      if (pa && !pa.paused) {
        store.getState().executeAction(inboxId)
      }
    }
  }, 100)
  return interval
}

export const useVoiceStore = createWithEqualityFn((set, get) => ({
  pendingActions: [],
  isMicOpen: false,

  setMicOpen: (open) => set({ isMicOpen: open }),

  addPending: (response) => {
    const { inboxId, transcript, actions, natural_summary, riskLevel } = response
    const item = {
      inboxId,
      transcript,
      actions: actions || [],
      natural_summary: natural_summary || transcript,
      riskLevel: riskLevel || classifyRisk(actions || []),
      remainingMs: riskLevel === 'high' ? null : 3000,
      paused: riskLevel === 'high',
      executed: false,
      results: null,
      timer: null,
    }
    set(s => ({ pendingActions: [...s.pendingActions, item] }))

    if (item.riskLevel !== 'high') {
      const timer = createTimer({ set, getState: get }, inboxId, 3000)
      set(s => ({
        pendingActions: s.pendingActions.map(pa =>
          pa.inboxId === inboxId ? { ...pa, timer } : pa
        )
      }))
    }
  },

  undoAction: (inboxId) => {
    const state = get()
    const item = state.pendingActions.find(p => p.inboxId === inboxId)
    if (item?.timer) clearInterval(item.timer)
    fetch(`/api/voice/inbox/${inboxId}`, { method: 'DELETE' }).catch(() => {})
    set(s => ({ pendingActions: s.pendingActions.filter(p => p.inboxId !== inboxId) }))
  },

  executeAction: async (inboxId) => {
    const state = get()
    const item = state.pendingActions.find(p => p.inboxId === inboxId)
    if (!item || item.executed) return
    if (item.timer) clearInterval(item.timer)

    set(s => ({
      pendingActions: s.pendingActions.map(pa =>
        pa.inboxId === inboxId ? { ...pa, executed: true } : pa
      )
    }))

    try {
      const res = await fetch(`/api/voice/inbox/${inboxId}/execute`, { method: 'POST' })
      if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Execution failed' })); throw new Error(e.error) }
      const data = await res.json()

      set(s => ({
        pendingActions: s.pendingActions.map(pa =>
          pa.inboxId === inboxId ? { ...pa, results: data.results } : pa
        )
      }))

      setTimeout(() => {
        set(s => ({ pendingActions: s.pendingActions.filter(p => p.inboxId !== inboxId) }))
      }, 2000)
    } catch (err) {
      set(s => ({
        pendingActions: s.pendingActions.map(pa =>
          pa.inboxId === inboxId ? { ...pa, error: err.message, executed: false, paused: true } : pa
        )
      }))
      setTimeout(() => {
        set(s => ({ pendingActions: s.pendingActions.filter(p => p.inboxId !== inboxId) }))
      }, 5000)
    }
  },

  confirmHighRisk: (inboxId) => {
    const state = get()
    const existing = state.pendingActions.find(p => p.inboxId === inboxId)
    if (existing?.timer) clearInterval(existing.timer)
    set(s => ({
      pendingActions: s.pendingActions.map(pa =>
        pa.inboxId === inboxId ? { ...pa, paused: false, remainingMs: 3000 } : pa
      )
    }))
    const timer = createTimer({ set, getState: get }, inboxId, 3000)
    set(s => ({
      pendingActions: s.pendingActions.map(pa =>
        pa.inboxId === inboxId ? { ...pa, timer } : pa
      )
    }))
  },

  clearAll: () => {
    const state = get()
    state.pendingActions.forEach(pa => {
      if (pa.timer) clearInterval(pa.timer)
    })
    set({ pendingActions: [] })
  },
}), Object.is)
