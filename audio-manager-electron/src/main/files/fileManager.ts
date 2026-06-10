import fs from 'fs'
import path from 'path'
import os from 'os'

export interface FileProperties {
  exists: boolean
  size: number
  ext: string
  modified: number
  isFile: boolean
}

const VIDEO_EXTS = ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.flv', '.m4v', '.3gp']
const AUDIO_EXTS = ['.mp3', '.aac', '.flac', '.wav', '.m4a', '.ogg', '.wma', '.mka']
const ALLOWED_INPUT_EXTS = [...VIDEO_EXTS, ...AUDIO_EXTS]

export function getFileProperties(filePath: string): FileProperties {
  try {
    const stat = fs.statSync(filePath)
    return {
      exists: true,
      size: stat.size,
      ext: path.extname(filePath).toLowerCase(),
      modified: stat.mtimeMs,
      isFile: stat.isFile(),
    }
  } catch {
    return { exists: false, size: 0, ext: '', modified: 0, isFile: false }
  }
}

// Confirms a source file exists, is a regular file, and has a supported container.
export function validateInputFile(filePath: string): { valid: boolean; error?: string } {
  const props = getFileProperties(filePath)
  if (!props.exists || !props.isFile) {
    return { valid: false, error: `Input file does not exist: ${filePath}` }
  }
  if (props.size === 0) {
    return { valid: false, error: `Input file is empty: ${filePath}` }
  }
  if (!ALLOWED_INPUT_EXTS.includes(props.ext)) {
    return { valid: false, error: `Unsupported input format: ${props.ext}` }
  }
  return { valid: true }
}

// Ensures the output directory exists (creating it if needed) and is writable.
export function validateOutputPath(outputPath: string): { valid: boolean; error?: string } {
  const dir = path.dirname(outputPath)
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.accessSync(dir, fs.constants.W_OK)
  } catch {
    return { valid: false, error: `Output directory is not writable: ${dir}` }
  }
  return { valid: true }
}

// When overwrite is disabled and the target exists, derive a non-colliding name
// (e.g. "clip_extracted.mp3" -> "clip_extracted_1.mp3").
export function resolveOutputPath(outputPath: string, overwrite: boolean): string {
  if (overwrite || !fs.existsSync(outputPath)) {
    return outputPath
  }
  const dir = path.dirname(outputPath)
  const ext = path.extname(outputPath)
  const base = path.basename(outputPath, ext)
  let counter = 1
  let candidate = path.join(dir, `${base}_${counter}${ext}`)
  while (fs.existsSync(candidate)) {
    counter++
    candidate = path.join(dir, `${base}_${counter}${ext}`)
  }
  return candidate
}

// Removes leftover *.tmp / *.part files this app may have written to a folder.
export function cleanupTempFiles(dir: string): void {
  try {
    if (!fs.existsSync(dir)) return
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.tmp') || name.endsWith('.part')) {
        try {
          fs.unlinkSync(path.join(dir, name))
        } catch {
          // ignore individual failures
        }
      }
    }
  } catch {
    // ignore
  }
}

export function getTempDir(): string {
  return path.join(os.tmpdir(), 'audio-manager')
}
