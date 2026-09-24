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
}

const running = new Map<string, ChildProcess>()

export function cancelSyncPreview(key: string) {
  running.get(key)?.kill('SIGKILL')
  running.delete(key)
}

// Renders a short, small MP4 of the video with only the chosen audio track,
// shifted exactly as a merge would shift it, and returns the file's bytes.
// The clip is re-encoded (fast preset, ≤540p) rather than stream-copied, so it
// starts on the exact requested frame instead of the previous keyframe; a
// keyframe snap would put the audio out of step and defeat the point.
export async function renderSyncPreview(req: SyncPreviewRequest): Promise<Buffer> {
  cancelSyncPreview(req.key)

  // Output time t plays source audio from t - offset, so the audio input
  // starts `offset` before the video. When that falls before the audio's
  // start, seek to 0 and pad the difference with silence.
  const audioStart = req.startSec - req.offsetMs / 1000
  const padMs = audioStart < 0 ? Math.round(-audioStart * 1000) : 0
  const audioFilter = `${padMs > 0 ? `adelay=delays=${padMs}:all=1,` : ''}apad`

  const dir = path.join(getTempDir(), 'previews')
  fs.mkdirSync(dir, { recursive: true })
  const outPath = path.join(dir, `${req.key.replace(/[^\w-]/g, '_')}-${Date.now()}.mp4`)

  const args = [
    '-y',
    '-ss', req.startSec.toFixed(3), '-t', String(req.durationSec), '-i', req.videoPath,
    '-ss', Math.max(0, audioStart).toFixed(3), '-t', String(req.durationSec), '-i', req.audioPath,
    '-map', '0:v:0', '-map', `1:a:${req.audioStreamIndex}`,
    '-vf', "scale=-2:'trunc(min(540,ih)/2)*2'",
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26', '-pix_fmt', 'yuv420p',
    '-af', audioFilter,
    '-c:a', 'aac', '-b:a', '160k', '-ac', '2',
    // apad makes the audio endless (so a track that ends early still spans
    // the clip); -t bounds the output.
    '-t', String(req.durationSec),
    '-movflags', '+faststart',
    outPath,
  ]

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(getFFmpegPath(), args)
      running.set(req.key, child)
      let stderr = ''
      child.stderr.on('data', (d) => {
        stderr = (stderr + d.toString()).slice(-2000)
      })
      child.on('error', reject)
      child.on('close', (code, signal) => {
        if (running.get(req.key) === child) running.delete(req.key)
        if (signal) reject(new Error('Preview cancelled'))
        else if (code !== 0) reject(new Error(stderr.trim().split('\n').pop() || `FFmpeg exited with code ${code}`))
        else resolve()
      })
    })
    return fs.readFileSync(outPath)
  } finally {
    fs.rmSync(outPath, { force: true })
  }
}
