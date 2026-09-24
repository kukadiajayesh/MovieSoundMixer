import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { getFFmpegPath } from './detector'
import { getTempDir } from '../files/fileManager'

export interface SyncPreviewRequest {
  // Identifies who asked (a merge row), so a newer request from the same
  // row replaces a render still in flight instead of racing it.
  key: string
  videoPath: string
  audioPath: string
  audioStreamIndex: number // ordinal among audioPath's audio streams (FFmpeg's a:N)
  offsetMs: number // same meaning as start-merge's audioOffsetMs
  startSec: number // where in the video the clip begins
  durationSec: number
  // Also render the video's own first audio track over the same window, so
  // the player can switch between it and the new track.
  includeOriginal: boolean
}

export interface SyncPreview {
  clip: Buffer // MP4: the video with the shifted new track
  original: Buffer | null // M4A: the video's original audio, same window
}

// Every process still running for a key (the clip and the original audio).
const running = new Map<string, Set<ChildProcess>>()

export function cancelSyncPreview(key: string) {
  for (const child of running.get(key) ?? []) child.kill('SIGKILL')
  running.delete(key)
}

const runTracked = (key: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(getFFmpegPath(), args)
    const set = running.get(key) ?? new Set<ChildProcess>()
    set.add(child)
    running.set(key, set)
    let stderr = ''
    child.stderr.on('data', (d) => {
      stderr = (stderr + d.toString()).slice(-2000)
    })
    child.on('error', reject)
    child.on('close', (code, signal) => {
      set.delete(child)
      if (set.size === 0 && running.get(key) === set) running.delete(key)
      if (signal) reject(new Error('Preview cancelled'))
      else if (code !== 0) reject(new Error(stderr.trim().split('\n').pop() || `FFmpeg exited with code ${code}`))
      else resolve()
    })
  })

// Renders a short, small MP4 of the video with only the chosen audio track,
// shifted exactly as a merge would shift it, and returns the file's bytes.
// The clip is re-encoded (fast preset, ≤540p) rather than stream-copied, so it
// starts on the exact requested frame instead of the previous keyframe; a
// keyframe snap would put the audio out of step and defeat the point.
export async function renderSyncPreview(req: SyncPreviewRequest): Promise<SyncPreview> {
  cancelSyncPreview(req.key)

  // Output time t plays source audio from t - offset, so the audio input
  // starts `offset` before the video. When that falls before the audio's
  // start, seek to 0 and pad the difference with silence.
  const audioStart = req.startSec - req.offsetMs / 1000
  const padMs = audioStart < 0 ? Math.round(-audioStart * 1000) : 0
  const audioFilter = `${padMs > 0 ? `adelay=delays=${padMs}:all=1,` : ''}apad`

  const dir = path.join(getTempDir(), 'previews')
  fs.mkdirSync(dir, { recursive: true })
  const base = path.join(dir, `${req.key.replace(/[^\w-]/g, '_')}-${Date.now()}`)
  const clipPath = `${base}.mp4`
  const originalPath = `${base}-original.m4a`
  const dur = String(req.durationSec)
  const start = req.startSec.toFixed(3)

  const clipArgs = [
    '-y',
    '-ss', start, '-t', dur, '-i', req.videoPath,
    '-ss', Math.max(0, audioStart).toFixed(3), '-t', dur, '-i', req.audioPath,
    '-map', '0:v:0', '-map', `1:a:${req.audioStreamIndex}`,
    '-vf', "scale=-2:'trunc(min(540,ih)/2)*2'",
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26', '-pix_fmt', 'yuv420p',
    // Keep each frame's own timestamp at full precision. By default frames
    // are re-timed on a 1/fps clock, which moves the picture by up to half a
    // frame (~20 ms) against the audio when the source's frames sit off that
    // grid (e.g. an MKV whose video starts at 21 ms).
    '-fps_mode', 'passthrough', '-enc_time_base:v', '1:90000',
    '-af', audioFilter,
    '-c:a', 'aac', '-b:a', '160k', '-ac', '2',
    // apad makes the audio endless (so a track that ends early still spans
    // the clip); -t bounds the output.
    '-t', dur,
    '-movflags', '+faststart',
    clipPath,
  ]
  // Same window and encoding as the clip's audio, so switching between the
  // two in the player changes only which track is heard.
  const originalArgs = [
    '-y',
    '-ss', start, '-t', dur, '-i', req.videoPath,
    '-map', '0:a:0',
    '-af', 'apad',
    '-c:a', 'aac', '-b:a', '160k', '-ac', '2',
    '-t', dur,
    '-movflags', '+faststart',
    originalPath,
  ]

  try {
    await Promise.all([
      runTracked(req.key, clipArgs),
      req.includeOriginal ? runTracked(req.key, originalArgs) : Promise.resolve(),
    ])
    return {
      clip: fs.readFileSync(clipPath),
      original: req.includeOriginal ? fs.readFileSync(originalPath) : null,
    }
  } catch (err) {
    // One failing leaves the other running; stop it.
    cancelSyncPreview(req.key)
    throw err
  } finally {
    fs.rmSync(clipPath, { force: true })
    fs.rmSync(originalPath, { force: true })
  }
}
