import { ipcMain, dialog, BrowserWindow } from 'electron'
import path from 'path'
import { probeStreams } from './ffmpeg/prober'
import { getFFmpegPath, getMkvmergePath } from './ffmpeg/detector'
import { detectGPUEncoders, pickPreferredEncoder, getGPUEncoderArgs } from './gpu/gpuDetector'
import { enqueueJob, cancelJob, pauseQueue, resumeQueue, Job } from './queue/jobQueue'
import { validateInputFile, validateOutputPath, resolveOutputPath, getFileProperties } from './files/fileManager'
import { validateSetting } from './settings/settingsManager'
import * as db from './db/repository'

export function setupIPCHandlers(mainWindow: BrowserWindow) {
  // 1. File Dialog selection
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'm4v', '3gp'] },
        { name: 'Audio Files', extensions: ['mp3', 'aac', 'flac', 'wav', 'm4a', 'ogg', 'wma'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    return {
      canceled: result.canceled,
      filePaths: result.filePaths,
    }
  })

  // 2. Folder directory selection
  ipcMain.handle('browse-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    })
    return {
      canceled: result.canceled,
      filePath: result.filePaths[0],
    }
  })

  // 2b. File properties (size etc.) for paths picked via dialog
  ipcMain.handle('get-file-properties', async (_event, filePath: string) => {
    return getFileProperties(filePath)
  })

  // 3. Probing streams
  ipcMain.handle('probe-streams', async (_event, filePath: string) => {
    try {
      const result = await probeStreams(filePath)
      return { success: true, duration: result.duration, streams: result.streams }
    } catch (err: any) {
      console.error(`Failed to probe streams for ${filePath}:`, err)
      return { success: false, error: err.message, streams: [] }
    }
  })

  // 4. Dependencies and GPU status
  ipcMain.handle('get-dependency-status', async () => {
    let ffmpegAvailable = false
    let ffmpegVersion = 'UNKNOWN'
    let mkvmergeAvailable = false

    try {
      getFFmpegPath()
      ffmpegAvailable = true
      ffmpegVersion = 'STATIC_BUNDLED'
    } catch (err) {}

    try {
      const mkvPath = getMkvmergePath()
      mkvmergeAvailable = mkvPath !== null
    } catch (err) {}

    const gpuInfo = detectGPUEncoders()

    return {
      ffmpegAvailable,
      ffmpegVersion,
      mkvmergeAvailable,
      gpuActive: gpuInfo.available.length > 0,
      gpuInfo,
    }
  })

  // 5. Submit Extraction Job
  ipcMain.handle(
    'start-extraction',
    async (
      _event,
      payload: {
        id: string
        inputPath: string
        outFolder: string
        format: 'copy' | 'mp3' | 'aac' | 'flac'
        // 0-based position of the chosen stream within the file's AUDIO streams
        // (i.e. the N in FFmpeg's "0:a:N" specifier), not the absolute stream index.
        streamIdx: number
        duration: number
        overwrite?: boolean
      },
    ) => {
      const { id, inputPath, outFolder, format, streamIdx, duration, overwrite } = payload

      const inputCheck = validateInputFile(inputPath)
      if (!inputCheck.valid) {
        return { success: false, error: inputCheck.error }
      }

      const extName = format === 'copy' ? 'mka' : format
      const baseName = path.parse(inputPath).name
      let outPath = path.join(outFolder, `${baseName}_extracted.${extName}`)

      const outCheck = validateOutputPath(outPath)
      if (!outCheck.valid) {
        return { success: false, error: outCheck.error }
      }
      outPath = resolveOutputPath(outPath, overwrite ?? false)

      // Build FFmpeg extraction arguments
      const args = ['-y', '-i', inputPath, '-map', `0:a:${Math.max(0, streamIdx)}`]

      if (format === 'copy') {
        args.push('-c:a', 'copy')
      } else if (format === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-q:a', '2')
      } else if (format === 'aac') {
        args.push('-c:a', 'aac', '-b:a', '192k')
      } else if (format === 'flac') {
        args.push('-c:a', 'flac')
      }

      args.push(outPath)

      const job: Job = {
        id,
        type: 'extract',
        inputPath,
        outputPath: outPath,
        args,
        duration,
      }

      enqueueJob(job)
      return { success: true, outPath }
    },
  )

  // 6. Submit Merge Job
  ipcMain.handle(
    'start-merge',
    async (
      _event,
      payload: {
        id: string
        videoPath: string
        audioPath: string
        outContainer: string
        outFolder: string
        copyVideo: boolean
        mergeMode: 'replace' | 'secondary'
        duration: number
        overwrite?: boolean
        backend?: 'auto' | 'mkvmerge' | 'ffmpeg'
        quality?: 'fast' | 'balanced' | 'quality'
      },
    ) => {
      const { id, videoPath, audioPath, outContainer, outFolder, copyVideo, mergeMode, duration, overwrite } = payload
      const backend = payload.backend ?? 'auto'

      for (const p of [videoPath, audioPath]) {
        const check = validateInputFile(p)
        if (!check.valid) {
          return { success: false, error: check.error }
        }
      }

      const videoName = path.basename(videoPath)
      const baseName = videoName.substring(0, videoName.lastIndexOf('.'))
      let outPath = path.join(outFolder, `${baseName}_merged.${outContainer}`)

      const outCheck = validateOutputPath(outPath)
      if (!outCheck.valid) {
        return { success: false, error: outCheck.error }
      }
      outPath = resolveOutputPath(outPath, overwrite ?? false)

      const mkvPath = getMkvmergePath()
      if (backend === 'mkvmerge' && mkvPath === null) {
        return { success: false, error: 'mkvmerge backend requested but mkvmerge is not installed' }
      }
      const useMkvMerge =
        backend === 'mkvmerge' ||
        (backend === 'auto' && outContainer === 'mkv' && mkvPath !== null)

      let args: string[] = []

      // If exporting to MKV and mkvmerge is installed, use it!
      if (useMkvMerge) {
        if (mergeMode === 'replace') {
          // Replace: omit old audio tracks from source video
          args = ['-o', outPath, '--no-audio', videoPath, audioPath]
        } else {
          // Keep secondary: append all tracks
          args = ['-o', outPath, videoPath, audioPath]
        }
      } else {
        // Fallback or default FFmpeg merging engine
        args = ['-y', '-i', videoPath, '-i', audioPath]

        if (mergeMode === 'replace') {
          args.push('-map', '0:v:0', '-map', '1:a:0')
        } else {
          args.push('-map', '0:v:0', '-map', '0:a:0', '-map', '1:a:0')
        }

        if (copyVideo) {
          args.push('-c:v', 'copy')
        } else {
          // Re-encoding: use a hardware encoder when GPU acceleration is enabled
          // and one is available, otherwise fall back to CPU libx264.
          const settings = await db.getSettings()
          const gpuEnabled = settings.gpu_enabled !== 'false'
          const encoder = gpuEnabled ? pickPreferredEncoder(detectGPUEncoders()) : null
          args.push(...getGPUEncoderArgs(encoder ?? 'libx264', payload.quality ?? 'balanced'))
        }

        args.push('-c:a', 'aac', '-b:a', '192k', outPath)
      }

      const job: Job = {
        id,
        type: 'merge',
        inputPath: videoPath,
        outputPath: outPath,
        args,
        duration,
        // The args above are built for a specific binary — record which one,
        // so the queue never spawns mkvmerge with FFmpeg-style args.
        binary: useMkvMerge ? 'mkvmerge' : 'ffmpeg',
      }

      enqueueJob(job)
      return { success: true, outPath }
    },
  )

  // 7. Cancel running or pending job
  ipcMain.handle('cancel-job', async (_event, jobId: string) => {
    cancelJob(jobId)
    return { success: true }
  })

  // 7b. Pause / resume the batch queue (stops/starts pulling new jobs)
  ipcMain.handle('pause-queue', async () => {
    pauseQueue()
    return { success: true }
  })

  ipcMain.handle('resume-queue', async () => {
    resumeQueue()
    return { success: true }
  })

  // 8. Load / save Settings
  ipcMain.handle('get-settings', async () => {
    try {
      const settings = await db.getSettings()
      return { success: true, settings }
    } catch (err: any) {
      console.error('Failed to read settings from database:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('save-settings', async (_event, payload: { key: string; value: string }) => {
    const check = validateSetting(payload.key, payload.value)
    if (!check.valid) {
      return { success: false, error: check.error }
    }
    try {
      await db.updateSetting(payload.key, payload.value)
      return { success: true }
    } catch (err: any) {
      console.error(`Failed to save setting ${payload.key}:`, err)
      return { success: false, error: err.message }
    }
  })

  // 9. Load / clear / delete History
  ipcMain.handle('get-history', async () => {
    try {
      const history = await db.getHistory()
      return { success: true, history }
    } catch (err: any) {
      console.error('Failed to read conversion history from database:', err)
      return { success: false, error: err.message, history: [] }
    }
  })

  ipcMain.handle('clear-history', async () => {
    try {
      await db.clearHistory()
      return { success: true }
    } catch (err: any) {
      console.error('Failed to clear conversion history:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('delete-history-item', async (_event, id: string) => {
    try {
      await db.deleteHistoryItem(id)
      return { success: true }
    } catch (err: any) {
      console.error(`Failed to delete history item ${id}:`, err)
      return { success: false, error: err.message }
    }
  })
}
