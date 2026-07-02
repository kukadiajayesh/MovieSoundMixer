import { useEffect } from 'react'
import { useFileStore } from '../stores/fileStore'
import { LogTag, useJobStore } from '../stores/jobStore'
import { useHistoryStore } from '../stores/historyStore'
import { useMergeStore } from '../stores/mergeStore'

const classifyLogLine = (message: string): LogTag => {
  const lower = message.toLowerCase()
  if (/(^|\s)(error|failed|invalid|no such file|permission denied)/.test(lower)) return 'error'
  if (/(warning|deprecated)/.test(lower)) return 'warn'
  if (/(^frame=|^size=|time=\d{2}:)/.test(lower)) return 'cmd'
  return 'info'
}

export const useIPC = () => {
  useEffect(() => {
    const electron = window.electron

    if (!electron?.ipcRenderer) {
      console.warn('Electron IPC Renderer not available in this environment.')
      return
    }

    const progressListener = (_event: any, data: { jobId: string; percent: number }) => {
      useJobStore.getState().updateJobProgress(data.jobId, data.percent)
      useFileStore.getState().updateFileProgress(data.jobId, Math.min(1, data.percent / 100))
      useMergeStore.getState().updatePairProgress(data.jobId, Math.min(1, data.percent / 100))
    }

    const speedListener = (_event: any, data: { jobId: string; mbps: number }) => {
      useJobStore.getState().updateJobSpeed(data.jobId, data.mbps)
    }

    const logsListener = (_event: any, data: { jobId: string; message: string }) => {
      useJobStore.getState().addLog(data.message, classifyLogLine(data.message))
    }

    const statusListener = (
      _event: any,
      data: {
        jobId: string
        status: 'processing' | 'success' | 'failed'
        error?: string
        outputPath?: string
      },
    ) => {
      const files = useFileStore.getState()
      const pairs = useMergeStore.getState()
      const jobs = useJobStore.getState()

      if (data.status === 'success') {
        files.updateFileStatus(data.jobId, 'success', 'Done', data.outputPath)
        files.updateFileProgress(data.jobId, 1)
        pairs.updatePairStatus(data.jobId, 'success', undefined, data.outputPath)
        pairs.updatePairProgress(data.jobId, 1)
        jobs.finishJob(data.jobId, true)
        // Reload SQLite history when a background conversion finishes
        useHistoryStore.getState().loadHistory()
      } else if (data.status === 'failed') {
        files.updateFileStatus(data.jobId, 'error', data.error || 'Failed')
        pairs.updatePairStatus(data.jobId, 'error', data.error || 'Failed')
        jobs.finishJob(data.jobId, false)
        jobs.addLog(`Job failed: ${data.error}`, 'error')
        useHistoryStore.getState().loadHistory()
      } else if (data.status === 'processing') {
        files.updateFileStatus(data.jobId, 'processing')
        pairs.updatePairStatus(data.jobId, 'processing')
      }
    }

    electron.ipcRenderer.on('progress', progressListener)
    electron.ipcRenderer.on('job-speed', speedListener)
    electron.ipcRenderer.on('log-output', logsListener)
    electron.ipcRenderer.on('job-status', statusListener)

    return () => {
      electron.ipcRenderer.removeListener('progress', progressListener)
      electron.ipcRenderer.removeListener('job-speed', speedListener)
      electron.ipcRenderer.removeListener('log-output', logsListener)
      electron.ipcRenderer.removeListener('job-status', statusListener)
    }
  }, [])
}
