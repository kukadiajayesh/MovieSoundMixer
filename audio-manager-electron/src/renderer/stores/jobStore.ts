import { create } from 'zustand'

export type LogTag = 'info' | 'ok' | 'warn' | 'error' | 'cmd'

export interface LogLine {
  ts: string
  tag: LogTag
  msg: string
}

interface ActiveJob {
  id: string
  name: string
  progress: number // 0..1
  speedMBps: number
  done: boolean // terminal event already counted — guards against duplicates
}

interface JobState {
  running: boolean
  jobs: ActiveJob[] // jobs submitted in the current run
  completed: number
  failed: number
  total: number
  currentFile: string
  logs: LogLine[]
  drawerCollapsed: boolean

  startRun: (jobs: Array<{ id: string; name: string }>) => void
  updateJobProgress: (jobId: string, percent: number) => void
  updateJobSpeed: (jobId: string, mbps: number) => void
  finishJob: (jobId: string, ok: boolean) => void
  stopRun: () => void
  addLog: (msg: string, tag?: LogTag) => void
  clearLogs: () => void
  setDrawerCollapsed: (collapsed: boolean) => void
}

const now = () => new Date().toTimeString().slice(0, 8)

export const useJobStore = create<JobState>((set) => ({
  running: false,
  jobs: [],
  completed: 0,
  failed: 0,
  total: 0,
  currentFile: '',
  logs: [],
  drawerCollapsed: true,

  startRun: (jobs) =>
    set({
      running: true,
      jobs: jobs.map((j) => ({ ...j, progress: 0, speedMBps: 0, done: false })),
      completed: 0,
      failed: 0,
      total: jobs.length,
      currentFile: jobs[0]?.name || '',
    }),

  updateJobProgress: (jobId, percent) =>
    set((state) => {
      const jobs = state.jobs.map((j) =>
        j.id === jobId && !j.done ? { ...j, progress: Math.min(1, percent / 100) } : j,
      )
      const active = jobs.find((j) => j.id === jobId)
      return {
        jobs,
        currentFile: active && active.progress < 1 ? active.name : state.currentFile,
      }
    }),

  updateJobSpeed: (jobId, mbps) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, speedMBps: mbps } : j)),
    })),

  finishJob: (jobId, ok) =>
    set((state) => {
      const job = state.jobs.find((j) => j.id === jobId)
      // Unknown id (stale event from a stopped run) or already-counted job:
      // ignore, otherwise duplicate terminal events end the run early and
      // the footer progress bar vanishes mid-run.
      if (!job || job.done) return state
      const jobs = state.jobs.map((j) => (j.id === jobId ? { ...j, progress: 1, done: true } : j))
      const completed = state.completed + (ok ? 1 : 0)
      const failed = state.failed + (ok ? 0 : 1)
      const done = completed + failed >= state.total
      return {
        jobs,
        completed,
        failed,
        running: done ? false : state.running,
        currentFile: done ? (failed > 0 ? 'Finished with errors' : 'All done') : state.currentFile,
      }
    }),

  // Clearing jobs makes any events that trickle in after a stop hit the
  // unknown-id guards instead of polluting the next run (job ids are file
  // ids, so they repeat across runs).
  stopRun: () => set({ running: false, jobs: [] }),

  addLog: (msg, tag = 'info') =>
    set((state) => ({
      // Cap retained lines so very long runs don't grow unbounded.
      logs: [...state.logs.slice(-1999), { ts: now(), tag, msg }],
    })),

  clearLogs: () => set({ logs: [] }),

  setDrawerCollapsed: (drawerCollapsed) => set({ drawerCollapsed }),
}))

/** Overall progress in the shape the RunFooter expects. */
export const selectOverall = (s: JobState) => {
  const sum = s.jobs.reduce((acc, j) => acc + j.progress, 0)
  const speedMBps = s.jobs.reduce((acc, j) => acc + (j.progress < 1 ? j.speedMBps : 0), 0)
  return {
    pct: s.total > 0 ? sum / s.total : 0,
    completed: s.completed,
    total: s.total,
    currentFile: s.currentFile,
    speedMBps,
  }
}
