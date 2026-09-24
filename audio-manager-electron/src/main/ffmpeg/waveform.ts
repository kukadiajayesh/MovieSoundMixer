import { spawn } from 'child_process'
import { getFFmpegPath } from './detector'

// Decode rate for peak extraction. High enough that speech and sharp sounds
// (claps, beeps) survive resampling; 5 ms buckets are 80 samples.
const SAMPLE_RATE = 16000

export interface PeaksRequest {
  path: string
  // Which audio stream, as FFmpeg's ordinal among the file's audio streams.
  audioStreamIndex: number
  // Window in the file's own timeline. May start before 0; that part is
  // returned as silence so bucket 0 always lines up with startSec.
  startSec: number
  durationSec: number
  bucketMs: number
}

// Returns the peak absolute sample value of each bucketMs slice of the
// window (mono mix), for drawing a waveform. Buckets past the end of the
// audio stay 0.
export function getPeaks(req: PeaksRequest): Promise<Float32Array> {
  const bucketCount = Math.ceil((req.durationSec * 1000) / req.bucketMs)
  const peaks = new Float32Array(bucketCount)
  const samplesPerBucket = (SAMPLE_RATE * req.bucketMs) / 1000

  // Leading silence for a window that starts before the audio does.
  const leadSec = Math.max(0, -req.startSec)
  const decodeSec = req.durationSec - leadSec
  if (decodeSec <= 0) return Promise.resolve(peaks)
  let sample = Math.round(leadSec * SAMPLE_RATE)

  const args = [
    '-v', 'error',
    '-ss', Math.max(0, req.startSec).toFixed(3),
    '-t', decodeSec.toFixed(3),
    '-i', req.path,
    '-map', `0:a:${req.audioStreamIndex}`,
    '-ac', '1', '-ar', String(SAMPLE_RATE),
    '-f', 'f32le', 'pipe:1',
  ]

  return new Promise((resolve, reject) => {
    const child = spawn(getFFmpegPath(), args)
    // A float can straddle two chunks; carry the partial bytes over.
    let rest: Buffer = Buffer.alloc(0)
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      const buf = rest.length ? Buffer.concat([rest, chunk]) : chunk
      const whole = buf.length - (buf.length % 4)
      for (let off = 0; off < whole; off += 4, sample++) {
        const b = Math.floor(sample / samplesPerBucket)
        if (b >= bucketCount) break
        const v = Math.abs(buf.readFloatLE(off))
        if (v > peaks[b]) peaks[b] = v
      }
      rest = buf.subarray(whole)
    })
    child.stderr.on('data', (d) => {
      stderr = (stderr + d.toString()).slice(-1000)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(peaks)
      else reject(new Error(stderr.trim().split('\n').pop() || `FFmpeg exited with code ${code}`))
    })
  })
}
