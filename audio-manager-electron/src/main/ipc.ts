import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { probeStreams } from './ffmpeg/prober'
import { getThumbnailDataUrl } from './ffmpeg/thumbnail'
import { renderSyncPreview, cancelSyncPreview } from './ffmpeg/preview'
import { getPeaks } from './ffmpeg/waveform'
import { mkvmergeStartShift } from './ffmpeg/startShift'
import { identifyMkv } from './ffmpeg/mkv'
import { getFFmpegPath, getMkvmergePath } from './ffmpeg/detector'
import { detectGPUEncoders } from './gpu/gpuDetector'
import { buildVideoEncodeArgs } from './ffmpeg/videoEncode'
import { renderEncodePreview, grabCompareFrames, cancelEncodePreview, getEncodePreviewPath } from './ffmpeg/encodePreview'
import { enqueueJob, cancelJob, pauseQueue, resumeQueue, setConcurrency, Job } from './queue/jobQueue'
import { validateInputFile, validateOutputPath, resolveOutputPath, getFileProperties } from './files/fileManager'
import { validateSetting } from './settings/settingsManager'
import * as db from './db/repository'

// Largest A/V sync shift accepted for a merge, either direction. Keep in step
// with MAX_OFFSET_MS in the renderer's SyncControls.
const MAX_AUDIO_OFFSET_MS = 600_000

export function setupIPCHandlers(mainWindow: BrowserWindow) {
  // 1. File Dialog selection. `kind` restricts what the picker offers:
  // 'audio' shows only audio formats (no "All Files" escape hatch).
  ipcMain.handle('open-file-dialog', async (_event, kind?: 'audio' | 'video') => {
    const videoFilter = {
      name: 'Video Files',
      extensions: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'm4v', '3gp'],
    }
    const audioFilter = {
      name: 'Audio Files',
      extensions: ['mp3', 'aac', 'flac', 'wav', 'm4a', 'ogg', 'wma', 'mka'],
    }
    const allFilter = { name: 'All Files', extensions: ['*'] }
    const filters =
      kind === 'audio'
        ? [audioFilter]
        : kind === 'video'
          ? [videoFilter, allFilter]
          : [videoFilter, audioFilter, allFilter]

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters,
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

  // 2c. Folder selection → enumerate its media files (non-recursive).
  // `extensions` (lowercase, no dot) filters the result; omit to return all files.
  ipcMain.handle('open-folder-dialog', async (_event, extensions?: string[]) => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, filePaths: [] as string[] }
    }
    const folder = result.filePaths[0]
    const exts = extensions?.map((e) => e.toLowerCase())
    try {
      const entries = await fs.promises.readdir(folder, { withFileTypes: true })
      const filePaths = entries
        .filter((e) => e.isFile())
        .map((e) => path.join(folder, e.name))
        .filter((fp) => {
          if (!exts || exts.length === 0) return true
          return exts.includes(path.extname(fp).slice(1).toLowerCase())
        })
      return { canceled: false, folder, filePaths }
    } catch (err: any) {
      return { canceled: false, folder, filePaths: [] as string[], error: err.message }
    }
  })

  // 3. Probing streams
  ipcMain.handle('probe-streams', async (_event, filePath: string) => {
    try {
      const result = await probeStreams(filePath)
      return {
        success: true,
        duration: result.duration,
        streams: result.streams,
        videoCodec: result.videoCodec,
        resolution: result.resolution,
      }
    } catch (err: any) {
      console.error(`Failed to probe streams for ${filePath}:`, err)
      return { success: false, error: err.message, streams: [] }
    }
  })

  // 3b. Video thumbnail (one extracted frame, as a data URL)
  ipcMain.handle('get-video-thumbnail', async (_event, filePath: string) => {
    try {
      const dataUrl = await getThumbnailDataUrl(filePath)
      return { success: true, dataUrl }
    } catch (err: any) {
      console.error(`Failed to extract thumbnail for ${filePath}:`, err)
      return { success: false, error: err.message }
    }
  })

  // 3c. A/V sync preview: a short clip of the video with the chosen audio
  // track shifted by the given offset (MP4), plus the video's own audio over
  // the same window (M4A) when it has any, returned as bytes for the
  // renderer to play from blob URLs.
  ipcMain.handle(
    'render-sync-preview',
    async (
      _event,
      payload: {
        key: string
        videoPath: string
        audioPath: string
        audioStreamIndex?: number
        offsetMs?: number
        startSec?: number
        durationSec: number
      },
    ) => {
      const offsetMs = Math.round(payload.offsetMs ?? 0)
      const startSec = Math.max(0, payload.startSec ?? 0)
      const durationSec = payload.durationSec
      if (!Number.isFinite(offsetMs) || Math.abs(offsetMs) > MAX_AUDIO_OFFSET_MS) {
        return { success: false, error: `Audio offset must be within ±${MAX_AUDIO_OFFSET_MS / 1000} s` }
      }
      if (!Number.isFinite(startSec) || ![10, 20, 30].includes(durationSec)) {
        return { success: false, error: 'Invalid preview range' }
      }
      for (const p of [payload.videoPath, payload.audioPath]) {
        const check = validateInputFile(p)
        if (!check.valid) return { success: false, error: check.error }
      }
      try {
        const videoInfo = await probeStreams(payload.videoPath).catch(() => null)
        const { clip, original } = await renderSyncPreview({
          key: String(payload.key),
          videoPath: payload.videoPath,
          audioPath: payload.audioPath,
          audioStreamIndex: Math.max(0, payload.audioStreamIndex ?? 0),
          offsetMs,
          startSec,
          durationSec,
          includeOriginal: !!videoInfo && videoInfo.streams.length > 0,
        })
        return { success: true, clip, original }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    },
  )

  ipcMain.handle('cancel-sync-preview', (_event, key: string) => {
    cancelSyncPreview(String(key))
  })

  // 3c2. Test encode: a few seconds encoded with exactly the merge's video
  // settings (encoder, quality, full resolution), returned as bytes with how
  // long it took, so the renderer can show it and project the full file.
  ipcMain.handle(
    'render-encode-preview',
    async (
      _event,
      payload: {
        key: string
        videoPath: string
        audioPath: string
        audioStreamIndex?: number
        offsetMs?: number
        startSec?: number
        durationSec: number
        outContainer: string
        copyVideo: boolean
        quality?: 'fast' | 'balanced' | 'quality'
        encoder?: string
      },
    ) => {
      const offsetMs = Math.round(payload.offsetMs ?? 0)
      const startSec = Math.max(0, payload.startSec ?? 0)
      if (!Number.isFinite(offsetMs) || Math.abs(offsetMs) > MAX_AUDIO_OFFSET_MS) {
        return { success: false, error: `Audio offset must be within ±${MAX_AUDIO_OFFSET_MS / 1000} s` }
      }
      if (!Number.isFinite(startSec) || ![5, 10, 20].includes(payload.durationSec)) {
        return { success: false, error: 'Invalid preview range' }
      }
      if (!['mkv', 'mp4', 'webm'].includes(payload.outContainer)) {
        return { success: false, error: 'Unknown output container' }
      }
      for (const p of [payload.videoPath, payload.audioPath]) {
        const check = validateInputFile(p)
        if (!check.valid) return { success: false, error: check.error }
      }
      try {
        const videoInfo = await probeStreams(payload.videoPath).catch(() => null)
        const res = await renderEncodePreview({
          key: String(payload.key),
          videoPath: payload.videoPath,
          audioPath: payload.audioPath,
          audioStreamIndex: Math.max(0, payload.audioStreamIndex ?? 0),
          offsetMs,
          startSec,
          durationSec: payload.durationSec,
          videoInfo,
          outContainer: payload.outContainer,
          copyVideo: !!payload.copyVideo,
          quality: payload.quality,
          encoder: payload.encoder,
        })
        return { success: true, ...res }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    },
  )

  // Full-resolution PNG frames, original vs. the test encode, at one moment.
  ipcMain.handle('grab-compare-frames', async (_event, payload: { key: string; atSec: number }) => {
    try {
      const frames = await grabCompareFrames(String(payload.key), Number(payload.atSec))
      return { success: true, ...frames }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('cancel-encode-preview', (_event, key: string) => {
    cancelEncodePreview(String(key))
  })

  // Fallback for codecs the app's player can't decode: open the clip in the
  // system's default player.
  ipcMain.handle('open-encode-preview', async (_event, key: string) => {
    const clipPath = getEncodePreviewPath(String(key))
    if (!clipPath) return { success: false, error: 'Render a test encode first' }
    const error = await shell.openPath(clipPath)
    return error ? { success: false, error } : { success: true }
  })

  // 3d. Waveform peaks (one per 5 ms, mono) for a window of one audio stream,
  // drawn by the sync panel. The window may start before 0 (the new track
  // shifted later); that part comes back as silence.
  ipcMain.handle(
    'get-sync-waveform',
    async (_event, payload: { path: string; audioStreamIndex?: number; startSec: number; durationSec: number }) => {
      const { startSec, durationSec } = payload
      if (!Number.isFinite(startSec) || !Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 120) {
        return { success: false, error: 'Invalid waveform range' }
      }
      const check = validateInputFile(payload.path)
      if (!check.valid) return { success: false, error: check.error }
      const bucketMs = 5
      try {
        const peaks = await getPeaks({
          path: payload.path,
          audioStreamIndex: Math.max(0, payload.audioStreamIndex ?? 0),
          startSec,
          durationSec,
          bucketMs,
        })
        return { success: true, peaks, bucketMs }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    },
  )

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

  // 6. Submit Merge Job
  ipcMain.handle(
    'start-merge',
    async (
      _event,
      payload: {
        id: string
        videoPath: string
        // Omitted for a title-only edit of the video's own tracks.
        audioPath?: string
        // Ordinal position (0-based) among audioPath's own audio streams —
        // the "N" in FFmpeg's "1:a:N" — letting the audio source be a video
        // (or any multi-track file) with a specific channel picked. Defaults
        // to 0, matching the previous hardcoded "always take the first track".
        audioStreamIndex?: number
        outContainer: string
        outFolder: string
        copyVideo: boolean
        mergeMode: 'replace' | 'secondary'
        duration: number
        overwrite?: boolean
        backend?: 'auto' | 'mkvmerge' | 'ffmpeg'
        quality?: 'fast' | 'balanced' | 'quality'
        // User-picked hardware encoder (from the GPU Acceleration dropdown).
        // Omitted/empty means "auto-pick the best available".
        encoder?: string
        // A/V sync correction for the added audio track, in milliseconds:
        // positive delays it, negative plays it earlier. The video and any
        // original audio tracks are never shifted. Omitted means no shift.
        audioOffsetMs?: number
        // Title override for the added track; omitted keeps the donor's, blank clears it.
        audioTitle?: string
        // Title overrides for the video's own audio tracks, keyed by 0-based
        // ordinal among the video's audio streams.
        videoTrackTitles?: Record<string, string>
      },
    ) => {
      const { id, videoPath, audioPath, outContainer, outFolder, copyVideo, mergeMode, duration, overwrite } = payload
      const backend = payload.backend ?? 'auto'
      const audioStreamIndex = Math.max(0, payload.audioStreamIndex ?? 0)
      const audioOffsetMs = Math.round(payload.audioOffsetMs ?? 0)

      if (!Number.isFinite(audioOffsetMs) || Math.abs(audioOffsetMs) > MAX_AUDIO_OFFSET_MS) {
        return { success: false, error: `Audio offset must be within ±${MAX_AUDIO_OFFSET_MS / 1000} s` }
      }

      const cleanTitle = (t: unknown): string | null => {
        if (typeof t !== 'string') return null
        // eslint-disable-next-line no-control-regex
        const v = t.replace(/[ -]/g, '').trim().slice(0, 200)
        return v
      }
      const audioTitle = cleanTitle(payload.audioTitle)
      const videoTitles: [number, string][] = []
      for (const [k, v] of Object.entries(payload.videoTrackTitles ?? {})) {
        const ord = Number(k)
        const title = cleanTitle(v)
        if (Number.isInteger(ord) && ord >= 0 && title !== null) videoTitles.push([ord, title])
      }

      for (const p of audioPath ? [videoPath, audioPath] : [videoPath]) {
        const check = validateInputFile(p)
        if (!check.valid) {
          return { success: false, error: check.error }
        }
      }

      const videoName = path.basename(videoPath)
      const baseName = videoName.substring(0, videoName.lastIndexOf('.'))
      // A title-only edit is a plain remux, so keep the video's own container.
      const outExt = audioPath ? outContainer : path.extname(videoPath).slice(1).toLowerCase() || outContainer
      let outPath = path.join(outFolder, `${baseName}_merged.${outExt}`)

      const outCheck = validateOutputPath(outPath)
      if (!outCheck.valid) {
        return { success: false, error: outCheck.error }
      }
      outPath = resolveOutputPath(outPath, overwrite ?? false)

      const mkvPath = getMkvmergePath()
      if (backend === 'mkvmerge' && mkvPath === null) {
        return { success: false, error: 'mkvmerge backend requested but mkvmerge is not installed' }
      }
      if (!audioPath) {
        if (videoTitles.length === 0) {
          return { success: false, error: 'Nothing to merge: no audio file and no title changes' }
        }
        if (backend === 'mkvmerge' && outExt !== 'mkv') {
          return { success: false, error: 'mkvmerge can only write MKV. Use Auto or Force FFmpeg.' }
        }
        const vAudio =
          outExt === 'mkv' && mkvPath !== null && backend !== 'ffmpeg'
            ? (identifyMkv(videoPath) ?? []).filter((t) => t.type === 'audio')
            : []
        let titleArgs: string[]
        let titleBinary: Job['binary'] = 'ffmpeg'
        if (vAudio.length > 0) {
          const opts: string[] = []
          for (const [ord, title] of videoTitles) {
            if (vAudio[ord]) opts.push('--track-name', `${vAudio[ord].id}:${title}`)
          }
          titleArgs = ['-o', outPath, ...opts, videoPath]
          titleBinary = 'mkvmerge'
        } else {
          titleArgs = ['-y', '-i', videoPath, '-map', '0', '-c', 'copy']
          for (const [ord, title] of videoTitles) titleArgs.push(`-metadata:s:a:${ord}`, `title=${title}`)
          titleArgs.push(outPath)
        }
        enqueueJob({
          id,
          type: 'merge',
          inputPath: videoPath,
          outputPath: outPath,
          args: titleArgs,
          duration,
          binary: titleBinary,
        })
        return { success: true, outPath, note: undefined, detail: 'title-only edit (no audio added, streams copied)' }
      }

      // mkvmerge only writes Matroska: given an .mp4 name it still writes MKV
      // data, and it can't transcode for WebM.
      if (backend === 'mkvmerge' && outContainer !== 'mkv') {
        return {
          success: false,
          error: `mkvmerge can only write MKV, not ${outContainer.toUpperCase()}. Use Auto or Force FFmpeg.`,
        }
      }
      let useMkvMerge =
        backend === 'mkvmerge' ||
        (backend === 'auto' && outContainer === 'mkv' && mkvPath !== null)

      let args: string[] = []
      // Explains in the job log when the output differs from the chosen
      // options (e.g. WebM forcing a re-encode despite "Copy video stream").
      let note: string | undefined
      // Informational job-log line (e.g. a timing correction applied).
      let detail: string | undefined
      // Options scoping `audioPath` down to exactly the chosen audio track —
      // needed because it may now be a whole video (with its own video/
      // subtitle/other-audio tracks) rather than a plain audio file.
      let audioSourceOpts: string[] = []

      if (useMkvMerge) {
        // mkvmerge tracks are identified by its own per-file track IDs, not
        // FFmpeg's absolute stream index, so translate the chosen ordinal via
        // `mkvmerge -J` (works on any container mkvmerge can read, not just .mkv).
        const audioTracks = (identifyMkv(audioPath) ?? []).filter((t) => t.type === 'audio')
        if (audioTracks.length > 0) {
          const ordinal = Math.min(audioStreamIndex, audioTracks.length - 1)
          const track = audioTracks[ordinal]
          audioSourceOpts = ['--no-video', '--no-subtitles', '--audio-tracks', String(track.id)]
          // mkvmerge lines the two files up differently from FFmpeg (it
          // ignores MP4 edit-list and MP3 gapless skips, and keeps a
          // negative MKV start that FFmpeg moves to 0), so correct by the
          // difference; the new track then lands where the sync preview and
          // an FFmpeg merge put it. See ffmpeg/startShift.ts.
          const [videoShift, audioShift] = await Promise.all([
            mkvmergeStartShift(videoPath, { video: true, audio: mergeMode !== 'replace' }),
            mkvmergeStartShift(audioPath, { audioOrdinal: ordinal }),
          ])
          const correctionMs = Math.round((videoShift - audioShift) * 1000)
          const syncMs = audioOffsetMs + correctionMs
          if (correctionMs !== 0) {
            detail = `correcting the new track by ${correctionMs > 0 ? '+' : ''}${correctionMs} ms so mkvmerge matches the preview`
          }
          if (syncMs !== 0) {
            // A negative shift makes mkvmerge drop whatever lands before 0.
            audioSourceOpts.push('--sync', `${track.id}:${syncMs}`)
          }
          if (audioTitle !== null) audioSourceOpts.push('--track-name', `${track.id}:${audioTitle}`)
        } else {
          // Couldn't identify audioPath's tracks — don't risk an unscoped
          // mkvmerge command pulling in a donor video's other tracks.
          useMkvMerge = false
        }
      }

      // If exporting to MKV and mkvmerge is installed, use it!
      if (useMkvMerge) {
        // Existing-track renames (only meaningful when the tracks are kept).
        // mkvmerge addresses tracks by its own IDs, so map ordinal -> ID.
        const videoNameOpts: string[] = []
        if (mergeMode !== 'replace' && videoTitles.length > 0) {
          const vAudio = (identifyMkv(videoPath) ?? []).filter((t) => t.type === 'audio')
          for (const [ord, title] of videoTitles) {
            if (vAudio[ord]) videoNameOpts.push('--track-name', `${vAudio[ord].id}:${title}`)
          }
        }
        if (mergeMode === 'replace') {
          // Replace: omit old audio tracks from source video
          args = ['-o', outPath, '--no-audio', videoPath, ...audioSourceOpts, audioPath]
        } else {
          // Keep secondary: append all tracks
          args = ['-o', outPath, ...videoNameOpts, videoPath, ...audioSourceOpts, audioPath]
        }
      } else {
        // Fallback or default FFmpeg merging engine
        // What's in the video decides the audio output numbering and whether
        // its video can go into WebM untouched. If probing fails, assume one
        // audio track and a codec WebM can't take; both fail safe.
        const videoInfo = await probeStreams(videoPath).catch(() => null)
        const videoAudioCount = videoInfo ? videoInfo.streams.length : 1
        const videoHasAudio = videoAudioCount > 0
        const webm = outContainer === 'webm'

        args = ['-y', '-i', videoPath, '-i', audioPath]

        if (mergeMode === 'replace') {
          args.push('-map', '0:v:0', '-map', `1:a:${audioStreamIndex}`)
        } else {
          // The trailing ? lets a video with no audio of its own through.
          args.push('-map', '0:v:0', '-map', '0:a?', '-map', `1:a:${audioStreamIndex}`)
        }
        // Output position of the added track among the output's audio streams
        // (all of the video's own audio tracks come first in secondary mode).
        const addedTrack = mergeMode === 'secondary' && videoHasAudio ? videoAudioCount : 0

        if (audioTitle !== null) args.push(`-metadata:s:a:${addedTrack}`, `title=${audioTitle}`)
        if (mergeMode === 'secondary') {
          for (const [ord, title] of videoTitles) {
            if (ord < videoAudioCount) args.push(`-metadata:s:a:${ord}`, `title=${title}`)
          }
        }

        if (audioOffsetMs !== 0) {
          // Filter only the added track. Padding with silence (or trimming
          // the start) keeps sync even in players that ignore MP4 edit
          // lists, and a per-stream filter, unlike -filter_complex, keeps the
          // track's language/title tags. The index must be right: FFmpeg
          // silently ignores a filter aimed at a stream that doesn't exist.
          const filter =
            audioOffsetMs > 0
              ? `adelay=delays=${audioOffsetMs}:all=1`
              : `atrim=start=${(-audioOffsetMs / 1000).toFixed(3)},asetpts=PTS-STARTPTS`
          args.push(`-filter:a:${addedTrack}`, filter)
        }

        const video = await buildVideoEncodeArgs({
          videoInfo,
          outContainer,
          copyVideo,
          quality: payload.quality,
          encoder: payload.encoder,
        })
        args.push(...video.args)
        note = video.note

        if (webm) {
          args.push('-c:a', 'libopus', '-b:a', '192k', outPath)
        } else {
          args.push('-c:a', 'aac', '-b:a', '192k', outPath)
        }
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
      return { success: true, outPath, note, detail }
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

  // 7c. Set how many jobs run in parallel (batch processing control)
  ipcMain.handle('set-concurrency', async (_event, limit: number) => {
    setConcurrency(limit)
    return { success: true }
  })

  // 7d. Open a produced file in the OS default app / reveal it in the file manager
  ipcMain.handle('open-path', async (_event, filePath: string) => {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File no longer exists' }
    }
    const error = await shell.openPath(filePath)
    return error ? { success: false, error } : { success: true }
  })

  ipcMain.handle('show-in-folder', async (_event, filePath: string) => {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File no longer exists' }
    }
    shell.showItemInFolder(filePath)
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

  ipcMain.handle('set-title-bar-theme', (_event, theme: 'light' | 'dark') => {
    try {
      mainWindow.setTitleBarOverlay({
        color: theme === 'light' ? '#fcfcfc' : '#2b2d31',
        symbolColor: theme === 'light' ? '#000000' : '#ffffff',
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
