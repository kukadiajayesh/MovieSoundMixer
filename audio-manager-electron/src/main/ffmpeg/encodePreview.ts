import fs from 'fs'
import path from 'path'
import { getTempDir } from '../files/fileManager'
import { runTracked, cancelTracked } from './preview'
import { ProbeResult } from './prober'
import { buildVideoEncodeArgs, Quality } from './videoEncode'

export interface EncodePreviewRequest {
  // Identifies who asked (a merge row); a newer request replaces the old clip.
  key: string
  videoPath: string
  audioPath: string
  audioStreamIndex: number // ordinal among audioPath's audio streams (FFmpeg's a:N)
  offsetMs: number // same meaning as start-merge's audioOffsetMs
  startSec: number
  durationSec: number
  videoInfo: ProbeResult | null
  outContainer: string
  copyVideo: boolean
  quality?: Quality
  encoder?: string
}

export interface EncodePreview {
  clip: Buffer
  bytes: number
  elapsedMs: number
  encoderLabel: string
}

// The last rendered clip per key. Kept on disk (until replaced, cancelled or
// the app quits) so frames can be grabbed from it and it can be opened in
// the system player when the app's player can't decode its codec.
const clips = new Map<string, { path: string; videoPath: string; startSec: number; durationSec: number }>()

// Separate tracking keys, so a frame grab never cancels the clip render of
// the same row or the sync preview (which is keyed by the bare row id).
const renderKey = (key: string) => `enc:${key}`
const frameKey = (key: string) => `frm:${key}`

function removeClip(key: string) {
  const clip = clips.get(key)
  if (clip) fs.rmSync(clip.path, { force: true })
  clips.delete(key)
}

export function cancelEncodePreview(key: string) {
  cancelTracked(renderKey(key))
  cancelTracked(frameKey(key))
  removeClip(key)
}

export function clearEncodePreviews() {
  for (const key of [...clips.keys()]) cancelEncodePreview(key)
}

export function getEncodePreviewPath(key: string): string | null {
  return clips.get(key)?.path ?? null
}

// Encodes a short stretch of the video with exactly the video settings the
// merge would use (same encoder, preset and full resolution), plus the new
// audio track shifted as the merge shifts it, and times the run so the
// renderer can project the full file's encode time and size.
export async function renderEncodePreview(req: EncodePreviewRequest): Promise<EncodePreview> {
  cancelEncodePreview(req.key)

  const video = await buildVideoEncodeArgs({
    videoInfo: req.videoInfo,
    outContainer: req.outContainer,
    copyVideo: req.copyVideo,
    quality: req.quality,
    encoder: req.encoder,
  })
  if (!video.reencode) {
    throw new Error('This merge copies the video, so there is nothing to test')
  }

  const webm = req.outContainer === 'webm'
  // Output time t plays source audio from t - offset; see renderSyncPreview.
  const audioStart = req.startSec - req.offsetMs / 1000
  const padMs = audioStart < 0 ? Math.round(-audioStart * 1000) : 0
  const audioFilter = `${padMs > 0 ? `adelay=delays=${padMs}:all=1,` : ''}apad`

  const dir = path.join(getTempDir(), 'previews')
  fs.mkdirSync(dir, { recursive: true })
  // MP4/WebM rather than MKV so the app's player can load the clip.
  const clipPath = path.join(dir, `enc-${req.key.replace(/[^\w-]/g, '_')}-${Date.now()}.${webm ? 'webm' : 'mp4'}`)
  const dur = String(req.durationSec)

  const args = [
    // Errors only, so a failure reports its cause rather than a warning.
    '-hide_banner', '-loglevel', 'error',
    '-y',
    '-ss', req.startSec.toFixed(3), '-t', dur, '-i', req.videoPath,
    '-ss', Math.max(0, audioStart).toFixed(3), '-t', dur, '-i', req.audioPath,
    '-map', '0:v:0', '-map', `1:a:${req.audioStreamIndex}`,
    ...video.args,
    // HEVC in MP4 needs the hvc1 tag for most players to accept it.
    ...(video.encoderLabel.startsWith('hevc') ? ['-tag:v', 'hvc1'] : []),
    // Keep each frame's own timestamp, so a grabbed frame from the clip is
    // the same frame as the original at the same offset.
    '-fps_mode', 'passthrough',
    '-af', audioFilter,
    ...(webm ? ['-c:a', 'libopus'] : ['-c:a', 'aac']), '-b:a', '192k', '-ac', '2',
    '-t', dur,
    ...(webm ? [] : ['-movflags', '+faststart']),
    clipPath,
  ]

  const started = Date.now()
  try {
    await runTracked(renderKey(req.key), args)
  } catch (err) {
    fs.rmSync(clipPath, { force: true })
    throw err
  }
  const elapsedMs = Date.now() - started

  clips.set(req.key, {
    path: clipPath,
    videoPath: req.videoPath,
    startSec: req.startSec,
    durationSec: req.durationSec,
  })
  const clip = fs.readFileSync(clipPath)
  return { clip, bytes: clip.length, elapsedMs, encoderLabel: video.encoderLabel }
}

// One full-resolution PNG frame `atSec` into the last rendered clip, and the
// original video's frame at the same moment, for a side-by-side comparison.
export async function grabCompareFrames(key: string, atSec: number): Promise<{ original: Buffer; encoded: Buffer }> {
  const clip = clips.get(key)
  if (!clip) throw new Error('Render a test encode first')
  if (!Number.isFinite(atSec) || atSec < 0 || atSec >= clip.durationSec) {
    throw new Error('Frame time is outside the test clip')
  }
  cancelTracked(frameKey(key))

  const frameArgs = (input: string, at: number) => [
    '-hide_banner', '-loglevel', 'error',
    '-ss', at.toFixed(3), '-i', input,
    '-map', '0:v:0', '-frames:v', '1',
    '-f', 'image2pipe', '-c:v', 'png', '-',
  ]
  const original: Buffer[] = []
  const encoded: Buffer[] = []
  try {
    await Promise.all([
      runTracked(frameKey(key), frameArgs(clip.videoPath, clip.startSec + atSec), original),
      runTracked(frameKey(key), frameArgs(clip.path, atSec), encoded),
    ])
  } catch (err) {
    // One failing leaves the other running; stop it.
    cancelTracked(frameKey(key))
    throw err
  }
  if (original.length === 0 || encoded.length === 0) throw new Error('Could not read a frame at that time')
  return { original: Buffer.concat(original), encoded: Buffer.concat(encoded) }
}
