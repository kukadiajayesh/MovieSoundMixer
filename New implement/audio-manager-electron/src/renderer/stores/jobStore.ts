import { create } from 'zustand'

export interface ProgressStats {
  queued: number
  active: number
  completed: number
  failed: number
}

interface JobState {
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'failed'
  totalFiles: number
  processedFiles: number
  activeFileName: string
  percentComplete: number
  stats: ProgressStats
  logs: string[]
  showLogs: boolean

  startQueue: (total: number, activeName?: string) => void
  updateOverallProgress: (percent: number) => void
  completeFile: (id: string, name: string) => void
  failFile: (id: string, name: string) => void
  addLog: (line: string) => void
  clearLogs: () => void
  setShowLogs: (val: boolean) => void
  setDockStatus: (status: 'idle' | 'processing' | 'paused' | 'completed' | 'failed') => void
  resetQueue: () => void
}

export const useJobStore = create<JobState>((set) => ({
  status: 'idle',
  totalFiles: 0,
  processedFiles: 0,
  activeFileName: '',
  percentComplete: 0,
  stats: { queued: 0, active: 0, completed: 0, failed: 0 },
  logs: [],
  showLogs: false,

  startQueue: (total, activeName = '') =>
    set({
      status: 'processing',
      totalFiles: total,
      processedFiles: 0,
      activeFileName: activeName,
      percentComplete: 0,
      stats: { queued: total - 1, active: activeName ? 1 : 0, completed: 0, failed: 0 },
      logs: [],
      showLogs: true,
    }),

  updateOverallProgress: (percentComplete) => set({ percentComplete }),

  completeFile: (_id, _name) =>
    set((state) => {
      const completed = state.stats.completed + 1
      const isQueueFinished = completed + state.stats.failed === state.totalFiles

      return {
        processedFiles: state.processedFiles + 1,
        stats: {
          queued: Math.max(0, state.stats.queued - 1),
          active: isQueueFinished ? 0 : 1,
          completed,
          failed: state.stats.failed,
        },
        status: isQueueFinished
          ? state.stats.failed > 0
            ? 'failed'
            : 'completed'
          : 'processing',
      }
    }),

  failFile: (_id, _name) =>
    set((state) => {
      const failed = state.stats.failed + 1
      const isQueueFinished = state.stats.completed + failed === state.totalFiles

      return {
        processedFiles: state.processedFiles + 1,
        stats: {
          queued: Math.max(0, state.stats.queued - 1),
          active: isQueueFinished ? 0 : 1,
          completed: state.stats.completed,
          failed,
        },
        status: isQueueFinished ? 'failed' : 'processing',
      }
    }),

  addLog: (line) =>
    set((state) => ({
      logs: [...state.logs, line],
    })),

  clearLogs: () => set({ logs: [] }),

  setShowLogs: (showLogs) => set({ showLogs }),

  setDockStatus: (status) => set({ status }),

  resetQueue: () =>
    set({
      status: 'idle',
      totalFiles: 0,
      processedFiles: 0,
      activeFileName: '',
      percentComplete: 0,
      stats: { queued: 0, active: 0, completed: 0, failed: 0 },
      logs: [],
      showLogs: false,
    }),
}))
