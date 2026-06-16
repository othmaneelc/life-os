import { createWithEqualityFn } from 'zustand/traditional'

const DEFAULT_ORDER = [
  'ai-briefing',
  'revenue-pipeline',
  'top-priority',
  'today-stats',
  'prayer-times',
  'quick-check',
  'latest-journal',
  'daily-review',
  'quick-overview',
]

function load(key) {
  try {
    const raw = localStorage.getItem(`lifeos-dashboard-${key}`)
    return raw ? JSON.parse(raw) : undefined
  } catch { return undefined }
}

function save(key, value) {
  try { localStorage.setItem(`lifeos-dashboard-${key}`, JSON.stringify(value)) } catch {}
}

export const useDashboardStore = createWithEqualityFn((set, get) => ({
  widgetOrder: load('order') ?? DEFAULT_ORDER,
  hiddenWidgets: load('hidden') ?? [],
  editMode: false,

  setEditMode: (v) => set({ editMode: v }),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

  moveWidget: (fromIndex, toIndex) => {
    const order = [...get().widgetOrder]
    const [moved] = order.splice(fromIndex, 1)
    order.splice(toIndex, 0, moved)
    set({ widgetOrder: order })
    save('order', order)
  },

  toggleHidden: (id) => {
    const hidden = [...get().hiddenWidgets]
    const idx = hidden.indexOf(id)
    if (idx >= 0) hidden.splice(idx, 1)
    else hidden.push(id)
    set({ hiddenWidgets: hidden })
    save('hidden', hidden)
  },

  resetDefault: () => {
    set({ widgetOrder: DEFAULT_ORDER, hiddenWidgets: [] })
    save('order', DEFAULT_ORDER)
    save('hidden', [])
  },
}), Object.is)
