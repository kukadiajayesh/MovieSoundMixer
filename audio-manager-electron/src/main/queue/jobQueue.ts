import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import { getFFmpegPath, getMkvmergePath } from '../ffmpeg/detector'
import * as db from '../db/repository'
import { insertHistoryItem } from '../db/repository'

export interface Job {
  id: string
  type: 'extract' | 'merge'
  inputPath: string
  outputPath: string
  args: string[]
  duration: number // total input duration in seconds (for calculating progress %)
  binary?: 'ffmpeg' | 'mkvmerge' // which binary the args were built for (defaults to ffmpeg)
}

let mainWindow: BrowserWindow | null = null
const activeProcesses = new Map<string, ChildProcess>()
const cancelledJobs = new Set<string>()
const startTimes = new Map<string, number>()
const speedIntervals = new Map<string, NodeJS.Timeout>()
const speedTrackers = new Map<string, { bytes: number; time: number }>()
const jobQueue: Job[] = []
let activeJobsCount = 0
let isPaused = false
let concurrencyLimit = 2 // standard parallel limit for desktop transcoding; user-configurable

/** Set how many jobs may run in parallel. Values below 1 are clamped to 1. */
export function setConcurrency(limit: number) {
  concurrencyLimit = Math.max(1, Math.floor(limit) || 1)
  // A raised limit may free up slots for queued jobs.
  processQueue()
}

// Aggregate counters across the lifetime of the current queue run.
let totalJobs = 0
let completedJobs = 0

export function setMainWindow(win: BrowserWindow) {
  mainWindow = win
}

export function enqueueJob(job: Job) {
  jobQueue.push(job)
  totalJobs++
  // Persist so an interrupted run can be resumed on next launch.
  db.insertJob({ ...job, status: 'pending', progress: 0 }).catch((err) =>
    console.error('Failed to persist job to database:', err),
  )
  emitQueueProgress()
  processQueue()
}

export function pauseQueue() {
  isPaused = true
}

export function resumeQueue() {
  isPaused = false
  processQueue()
}

export function cancelJob(jobId: string) {
  cancelledJobs.add(jobId)
  const process = activeProcesses.get(jobId)
  if (process) {
    process.kill('SIGKILL') // Force terminate immediately
    activeProcesses.delete(jobId)
    db.updateJobStatus(jobId, 'cancelled', 'Process cancelled by user').catch(() => {})
    if (mainWindow) {
      mainWindow.webContents.send('job-status', { jobId, status: 'failed', error: 'Process cancelled by user' })
    }
  } else {
    // If job was still pending in queue, remove it
    const index = jobQueue.findIndex((j) => j.id === jobId)
    if (index !== -1) {
      jobQueue.splice(index, 1)
      db.updateJobStatus(jobId, 'cancelled', 'Queue cancelled').catch(() => {})
      if (mainWindow) {
        mainWindow.webContents.send('job-status', { jobId, status: 'failed', error: 'Queue cancelled' })
      }
    }
  }
}

export function cancelAllJobs() {
  for (const [jobId, process] of activeProcesses.entries()) {
    cancelledJobs.add(jobId)
    process.kill('SIGKILL')
    activeProcesses.delete(jobId)
    db.updateJobStatus(jobId, 'cancelled', 'Cancelled by user').catch(() => {})
  }
  for (const job of jobQueue) {
    db.updateJobStatus(job.id, 'cancelled', 'Cancelled by user').catch(() => {})
  }
  jobQueue.length = 0
  activeJobsCount = 0
}

// Re-queue jobs that were pending/processing when the app last closed.
export async function resumeInterruptedJobs() {
  try {
    const resumable = await db.getResumableJobs()
    for (const j of resumable) {
      jobQueue.push({
        id: j.id,
        type: j.type,
        inputPath: j.inputPath,
        outputPath: j.outputPath,
        args: j.args,
        duration: j.duration,
        // The binary isn't persisted; mkvmerge invocations always start with "-o".
        binary: j.args[0] === '-o' ? 'mkvmerge' : 'ffmpeg',
      })
      totalJobs++
    }
    if (resumable.length > 0) {
      console.log(`Resuming ${resumable.length} interrupted job(s) from previous session.`)
      emitQueueProgress()
      processQueue()
    }
  } catch (err) {
    console.error('Failed to resume interrupted jobs:', err)
  }
}

function emitQueueProgress() {
  if (!mainWindow) return
  mainWindow.webContents.send('queue-progress', {
    active: activeJobsCount,
    pending: jobQueue.length,
    completed: completedJobs,
    total: totalJobs,
  })
}

function processQueue() {
  if (isPaused || activeJobsCount >= concurrencyLimit || jobQueue.length === 0) {
    return
  }

  const job = jobQueue.shift()!
  activeJobsCount++
  runJob(job)
  // Fill remaining concurrency slots.
  processQueue()
}

// Polls the output file's size to compute live disk-write throughput.
// Works for both ffmpeg and mkvmerge since it watches the file itself
// rather than parsing binary-specific progress output.
function startSpeedTracking(job: Job) {
  const interval = setInterval(() => {
    fs.stat(job.outputPath, (err, stats) => {
      if (err) return
      const now = Date.now()
      const prev = speedTrackers.get(job.id)
      speedTrackers.set(job.id, { bytes: stats.size, time: now })
      if (prev && mainWindow) {
        const elapsedSec = (now - prev.time) / 1000
        if (elapsedSec > 0) {
          const mbps = Math.max(0, (stats.size - prev.bytes) / elapsedSec / (1024 * 1024))
          mainWindow.webContents.send('job-speed', { jobId: job.id, mbps })
        }
      }
    })
  }, 1000)
  speedIntervals.set(job.id, interval)
}

function stopSpeedTracking(jobId: string) {
  const interval = speedIntervals.get(jobId)
  if (interval) {
    clearInterval(interval)
    speedIntervals.delete(jobId)
  }
  speedTrackers.delete(jobId)
  if (mainWindow) {
    mainWindow.webContents.send('job-speed', { jobId, mbps: 0 })
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function runJob(job: Job) {
  const binaryPath = job.binary === 'mkvmerge' ? getMkvmergePath() || getFFmpegPath() : getFFmpegPath()

  startTimes.set(job.id, Date.now())
  db.updateJobStatus(job.id, 'processing').catch(() => {})
  if (mainWindow) {
    mainWindow.webContents.send('job-status', { jobId: job.id, status: 'processing' })
  }
  emitQueueProgress()

  const child = spawn(binaryPath, job.args)
  activeProcesses.set(job.id, child)
  startSpeedTracking(job)

  const seenLogs = new Set<string>()

  const emitLog = (message: string) => {
    if (!mainWindow) return
    if (seenLogs.has(message)) return
    seenLogs.add(message)
    mainWindow.webContents.send('log-output', { jobId: job.id, message })
  }

  child.stdout.on('data', (chunk) => {
    const output = chunk.toString()
    const lines = output.split(/\r|\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) {
        emitLog(trimmed)

        // mkvmerge reports "Progress: NN%" on stdout.
        const mkvProgress = trimmed.match(/Progress:\s*(\d{1,3})%/i)
        if (mkvProgress) {
          const percent = Math.min(99, parseInt(mkvProgress[1], 10))
          db.updateJobProgress(job.id, percent).catch(() => {})
          if (mainWindow) {
            mainWindow.webContents.send('progress', { jobId: job.id, percent })
          }
        }
      }
    }
  })

  child.stderr.on('data', (chunk) => {
    const output = chunk.toString()
    const lines = output.split(/\r|\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) {
        emitLog(trimmed)
      }
    }

    // Progress mapping from FFmpeg's "time=HH:MM:SS.cc" output.
    const timeRegex = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/i
    const match = output.match(timeRegex)
    if (match && job.duration > 0) {
      const hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const seconds = parseInt(match[3], 10)
      const centiseconds = parseInt(match[4], 10)
      const elapsed = hours * 3600 + minutes * 60 + seconds + centiseconds / 100

      const percent = Math.min(99, Math.round((elapsed / job.duration) * 100))
      db.updateJobProgress(job.id, percent).catch(() => {})
      if (mainWindow) {
        mainWindow.webContents.send('progress', { jobId: job.id, percent })
      }
    }
  })

  // Node fires 'close' after 'error' for the same child (e.g. spawn failure),
  // so terminal handling must run exactly once or counters double-decrement
  // and the renderer receives duplicate job-status events.
  let settled = false

  child.on('close', (code) => {
    if (settled) return
    settled = true
    activeProcesses.delete(job.id)
    stopSpeedTracking(job.id)
    activeJobsCount--

    const wasCancelled = cancelledJobs.has(job.id)
    cancelledJobs.delete(job.id)

    const elapsedMs = Date.now() - (startTimes.get(job.id) ?? Date.now())
    startTimes.delete(job.id)

    if (mainWindow) {
      if (code === 0) {
        completedJobs++
        db.updateJobStatus(job.id, 'success').catch(() => {})
        db.updateJobProgress(job.id, 100).catch(() => {})
        mainWindow.webContents.send('progress', { jobId: job.id, percent: 100 })
        mainWindow.webContents.send('job-status', {
          jobId: job.id,
          status: 'success',
          outputPath: job.outputPath,
        })

        insertHistoryItem({
          file: path.basename(job.inputPath),
          operation: job.type === 'extract' ? 'EXTRACT' : 'MERGE',
          duration: formatElapsed(elapsedMs),
          status: 'Completed',
          logs: [`Job completed successfully. Output: ${job.outputPath}`],
          inputPath: job.inputPath,
        }).catch((err: any) => console.error('Failed to auto-insert job log to database:', err))
      } else if (!wasCancelled) {
        db.updateJobStatus(job.id, 'failed', `Process exited with code ${code}`).catch(() => {})
        mainWindow.webContents.send('job-status', {
          jobId: job.id,
          status: 'failed',
          error: `Process exited with code ${code}`,
        })
        insertHistoryItem({
          file: path.basename(job.inputPath),
          operation: job.type === 'extract' ? 'EXTRACT' : 'MERGE',
          duration: formatElapsed(elapsedMs),
          status: 'Failed',
          logs: [`Job failed with exit code ${code}.`],
          inputPath: job.inputPath,
        }).catch(() => {})
      }
    }

    emitQueueProgress()
    processQueue()
  })

  child.on('error', (err) => {
    if (settled) return
    settled = true
    activeProcesses.delete(job.id)
    stopSpeedTracking(job.id)
    activeJobsCount--
    cancelledJobs.delete(job.id)
    startTimes.delete(job.id)

    db.updateJobStatus(job.id, 'failed', err.message).catch(() => {})
    if (mainWindow) {
      mainWindow.webContents.send('job-status', { jobId: job.id, status: 'failed', error: err.message })
    }

    emitQueueProgress()
    processQueue()
  })
}
