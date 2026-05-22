import { useEffect } from 'react'
import { useFileStore } from '../stores/fileStore'
import { useJobStore } from '../stores/jobStore'
import { useHistoryStore } from '../stores/historyStore'

export const useIPC = () => {
  const { updateFileStatus } = useFileStore()
  const { updateOverallProgress, completeFile, failFile, addLog } = useJobStore()

  useEffect(() => {
    const electron = window.electron

    if (!electron?.ipcRenderer) {
      console.warn('Electron IPC Renderer not available in this environment.')
      return
    }

    // 1. Progress updates listener
    const progressListener = (_event: any, data: { jobId: string; percent: number }) => {
      updateOverallProgress(data.percent)
    }

    // 2. Logging messages stream listener
    const logsListener = (_event: any, data: { jobId: string; message: string }) => {
      addLog(data.message)
    }

    // 3. Job status updates listener
    const statusListener = (
      _event: any,
      data: { jobId: string; status: 'processing' | 'success' | 'failed'; error?: string },
    ) => {
      if (data.status === 'success') {
        updateFileStatus(data.jobId, 'success', 'Extracted')
        completeFile(data.jobId, '')

        // Reload SQLite history dynamically when a background conversion finishes
        useHistoryStore.getState().loadHistory()
      } else if (data.status === 'failed') {
        updateFileStatus(data.jobId, 'error', data.error || 'Failed')
        failFile(data.jobId, '')
        addLog(`[ERROR] Job failed: ${data.error}`)
      } else if (data.status === 'processing') {
        updateFileStatus(data.jobId, 'processing')
      }
    }

    // Bind listeners
    electron.ipcRenderer.on('progress', progressListener)
    electron.ipcRenderer.on('log-output', logsListener)
    electron.ipcRenderer.on('job-status', statusListener)

    // Unbind listeners on unmount
    return () => {
      electron.ipcRenderer.removeListener('progress', progressListener)
      electron.ipcRenderer.removeListener('log-output', logsListener)
      electron.ipcRenderer.removeListener('job-status', statusListener)
    }
  }, [updateFileStatus, updateOverallProgress, completeFile, failFile, addLog])
}
