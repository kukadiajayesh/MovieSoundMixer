import { spawn } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { getFFmpegPath } from './detector'
import { getTempDir } from '../files/fileManager'

const thumbDir = () => path.join(getTempDir(), 'thumbnails')

// Runs `ffmpeg -ss <offset> -i <filePath> -frames:v 1 ...` and resolves once
// the process exits — resolution doesn't mean success, callers check the
// output file themselves (a seek past EOF just produces no/empty output).
const runFfmpeg = (filePath: string, offsetSeconds: number, outPath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const ffmpegPath = getFFmpegPath()
    const child = spawn(ffmpegPath, [
      '-y',
      '-ss', String(offsetSeconds),
      '-i', filePath,
      '-frames:v', '1',
      '-vf', 'scale=224:-2',
      '-q:v', '4',
      outPath,
    ])
    child.on('close', () => resolve())
    child.on('error', reject)
  })

const hasContent = (p: string): boolean => {
  try {
    return fs.statSync(p).size > 0
  } catch {
    return false
  }
}

// Extracts one frame from a video as a small JPEG and returns it as a
// `data:image/jpeg;base64,...` URL, ready to drop straight into an <img src>
// over IPC — no separate "read this file" round trip needed. Cached on disk
// keyed by path + mtime, so repeat calls for the same (unchanged) file are a
// cheap disk read instead of a re-encode.
export async function getThumbnailDataUrl(filePath: string): Promise<string> {
  const stat = fs.statSync(filePath) // throws if the file doesn't exist
  const key = crypto.createHash('md5').update(`${filePath}:${stat.mtimeMs}`).digest('hex')
  const dir = thumbDir()
  const cachePath = path.join(dir, `${key}.jpg`)

  if (!hasContent(cachePath)) {
    fs.mkdirSync(dir, { recursive: true })
    const tmpPath = path.join(dir, `${key}.${process.pid}.tmp.jpg`)

    // A clip shorter than 5s (or an odd seek failure) leaves no/empty output —
    // retry once from the very start before giving up.
    await runFfmpeg(filePath, 5, tmpPath)
    if (!hasContent(tmpPath)) {
      await runFfmpeg(filePath, 0, tmpPath)
    }
    if (!hasContent(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath)
      } catch {
        /* nothing to clean up */
      }
      throw new Error(`Could not extract a thumbnail frame from ${filePath}`)
    }
    fs.renameSync(tmpPath, cachePath)
  }

  const buf = fs.readFileSync(cachePath)
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}
