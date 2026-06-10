import { useCallback } from 'react'

export interface AudioStreamInfo {
  index: number
  language?: string
  codec: string
  channels: number
}

export interface ProbeResponse {
  success: boolean
  duration: number
  streams: AudioStreamInfo[]
  error?: string
}

export interface ExtractionPayload {
  id: string
  inputPath: string
  outFolder: string
  format: 'copy' | 'mp3' | 'aac' | 'flac'
  streamIdx: number
  duration: number
  overwrite?: boolean
}

export interface MergePayload {
  id: string
  videoPath: string
  audioPath: string
  outContainer: string
  outFolder: string
  copyVideo: boolean
  mergeMode: 'replace' | 'secondary'
  duration: number
  overwrite?: boolean
}

// Promise-based wrapper around the FFmpeg / job-queue IPC channels.
export const useFFmpeg = () => {
  const ipc = () => {
    const r = window.electron?.ipcRenderer
    if (!r) throw new Error('Electron IPC is not available in this environment.')
    return r
  }

  const probe = useCallback((filePath: string): Promise<ProbeResponse> => {
    return ipc().invoke('probe-streams', filePath)
  }, [])

  const getDependencyStatus = useCallback(() => {
    return ipc().invoke('get-dependency-status')
  }, [])

  const startExtraction = useCallback((payload: ExtractionPayload) => {
    return ipc().invoke('start-extraction', payload)
  }, [])

  const startMerge = useCallback((payload: MergePayload) => {
    return ipc().invoke('start-merge', payload)
  }, [])

  const cancelJob = useCallback((jobId: string) => {
    return ipc().invoke('cancel-job', jobId)
  }, [])

  const pauseQueue = useCallback(() => ipc().invoke('pause-queue'), [])
  const resumeQueue = useCallback(() => ipc().invoke('resume-queue'), [])

  return { probe, getDependencyStatus, startExtraction, startMerge, cancelJob, pauseQueue, resumeQueue }
}
