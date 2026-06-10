import { create } from 'zustand'

export interface HistoryItem {
  id: string
  date: string
  file: string
  operation: string
  duration: string
  status: 'Completed' | 'Failed'
  logs: string[]
}

interface HistoryState {
  history: HistoryItem[]
  loadHistory: () => Promise<void>
  removeHistoryItem: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],

  loadHistory: async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('get-history')
        if (res && res.success && res.history) {
          set({ history: res.history })
        }
      } catch (err) {
        console.error('Failed to load history logs via IPC:', err)
      }
    }
  },

  removeHistoryItem: async (id) => {
    set((state) => ({
      history: state.history.filter((h) => h.id !== id),
    }))

    if (window.electron?.ipcRenderer) {
      try {
        await window.electron.ipcRenderer.invoke('delete-history-item', id)
      } catch (err) {
        console.error(`Failed to delete history item ${id} via IPC:`, err)
        get().loadHistory() // reload as rollback on failure
      }
    }
  },

  clearHistory: async () => {
    set({ history: [] })

    if (window.electron?.ipcRenderer) {
      try {
        await window.electron.ipcRenderer.invoke('clear-history')
      } catch (err) {
        console.error('Failed to clear history database via IPC:', err)
        get().loadHistory() // reload as rollback
      }
    }
  },
}))
