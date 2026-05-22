import fs from 'fs'
import { execSync } from 'child_process'

// Resolve ffmpeg binary path
export function getFFmpegPath(): string {
  try {
    // Attempt to load pre-bundled ffmpeg-static
    const ffmpegStatic = require('ffmpeg-static')
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic
    }
  } catch (err) {
    console.warn('ffmpeg-static not found or failed to load, falling back to system ffmpeg...')
  }

  // Fallback check on standard system paths
  const isWin = process.platform === 'win32'
  const binaryName = isWin ? 'ffmpeg.exe' : 'ffmpeg'

  // Check if ffmpeg is available globally in the PATH
  try {
    execSync(isWin ? 'where ffmpeg' : 'which ffmpeg', { stdio: 'ignore' })
    return binaryName // resolved by the OS in PATH
  } catch (err) {
    // If not globally available, check standard folders
    const pathsToCheck = isWin
      ? [
          'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
          'C:\\ffmpeg\\bin\\ffmpeg.exe',
        ]
      : [
          '/usr/bin/ffmpeg',
          '/usr/local/bin/ffmpeg',
          '/opt/homebrew/bin/ffmpeg',
        ]

    for (const p of pathsToCheck) {
      if (fs.existsSync(p)) {
        return p
      }
    }
  }

  throw new Error('FFmpeg binary could not be detected on this system. Please ensure FFmpeg is installed and added to PATH.')
}

// Resolve mkvmerge binary path
export function getMkvmergePath(): string | null {
  const isWin = process.platform === 'win32'
  const binaryName = isWin ? 'mkvmerge.exe' : 'mkvmerge'

  try {
    execSync(isWin ? 'where mkvmerge' : 'which mkvmerge', { stdio: 'ignore' })
    return binaryName
  } catch (err) {
    const pathsToCheck = isWin
      ? [
          'C:\\Program Files\\MKVToolNix\\mkvmerge.exe',
          'C:\\Program Files (x86)\\MKVToolNix\\mkvmerge.exe',
        ]
      : [
          '/usr/bin/mkvmerge',
          '/usr/local/bin/mkvmerge',
          '/opt/homebrew/bin/mkvmerge',
        ]

    for (const p of pathsToCheck) {
      if (fs.existsSync(p)) {
        return p
      }
    }
  }

  return null // Optional dependency, can return null
}
