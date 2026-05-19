import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/backup'

export const useBackupStore = create((set) => ({
  backups: [],
  loading: false,

  fetchBackups: async () => {
    set({ loading: true })
    try {
      const res = await fetch(API + '/list')
      if (!res.ok) throw new Error()
      set({ backups: await res.json(), loading: false })
    } catch { set({ loading: false }) }
  },

  createBackup: async () => {
    try {
      const res = await fetch(API + '/export', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Backup created: ${data.tables.length} tables, ${data.count} rows`)
      return data
    } catch { toast.error('Failed to create backup') }
  },

  restoreBackup: async (filename) => {
    try {
      const res = await fetch(API + `/restore/${encodeURIComponent(filename)}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Backup restored successfully')
      return true
    } catch { toast.error('Failed to restore backup') }
  },

  importData: async (data) => {
    try {
      const res = await fetch(API + '/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const result = await res.json()
      toast.success(`Imported ${result.count} rows across ${result.imported.length} tables`)
      return result
    } catch { toast.error('Failed to import data') }
  },
}))
