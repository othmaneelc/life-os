import { createWithEqualityFn } from 'zustand/traditional'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/backup'

export function useImportData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const r = await fetch(`${API}/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!r.ok) throw new Error()
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success('Data imported') },
    onError: () => toast.error('Failed to import data'),
  })
}

export const useBackupStore = createWithEqualityFn((set) => ({
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
}), Object.is)
