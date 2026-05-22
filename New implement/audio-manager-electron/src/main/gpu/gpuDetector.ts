import { execSync } from 'child_process'
import { getFFmpegPath } from '../ffmpeg/detector'

export interface GPUEncoderInfo {
  nvidia: boolean     // NVENC
  amd: boolean        // AMF
  intel: boolean      // QSV
  apple: boolean      // VideoToolbox
  available: string[] // List of available hardware encoders (e.g. ['h264_nvenc', 'hevc_nvenc'])
}

export function detectGPUEncoders(): GPUEncoderInfo {
  const info: GPUEncoderInfo = {
    nvidia: false,
    amd: false,
    intel: false,
    apple: false,
    available: [],
  }

  try {
    const ffmpegPath = getFFmpegPath()
    const output = execSync(`"${ffmpegPath}" -encoders`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })

    const encodersToCheck = [
      { name: 'h264_nvenc', vendor: 'nvidia' as const },
      { name: 'hevc_nvenc', vendor: 'nvidia' as const },
      { name: 'h264_amf', vendor: 'amd' as const },
      { name: 'hevc_amf', vendor: 'amd' as const },
      { name: 'h264_qsv', vendor: 'intel' as const },
      { name: 'hevc_qsv', vendor: 'intel' as const },
      { name: 'h264_videotoolbox', vendor: 'apple' as const },
      { name: 'hevc_videotoolbox', vendor: 'apple' as const },
    ]

    for (const enc of encodersToCheck) {
      if (output.includes(enc.name)) {
        info[enc.vendor] = true
        info.available.push(enc.name)
      }
    }
  } catch (err) {
    console.error('Failed to query FFmpeg hardware encoders:', err)
  }

  return info
}

// Pick the best available hardware H.264 encoder, preferring NVENC > QSV > AMF > VideoToolbox.
// Returns null when no hardware encoder is present (caller should fall back to libx264).
export function pickPreferredEncoder(info: GPUEncoderInfo): string | null {
  const preference = ['h264_nvenc', 'h264_qsv', 'h264_amf', 'h264_videotoolbox']
  for (const enc of preference) {
    if (info.available.includes(enc)) return enc
  }
  return null
}

export function getGPUEncoderArgs(
  encoder: string,
  preset: 'fast' | 'balanced' | 'quality',
): string[] {
  const args: string[] = []

  // NVIDIA presets (p1 - p7)
  if (encoder.includes('nvenc')) {
    args.push('-c:v', encoder)
    if (preset === 'fast') {
      args.push('-preset', 'p1')
    } else if (preset === 'quality') {
      args.push('-preset', 'p7')
    } else {
      args.push('-preset', 'p4') // balanced
    }
  }
  // AMD presets (speed, balanced, quality)
  else if (encoder.includes('amf')) {
    args.push('-c:v', encoder)
    if (preset === 'fast') {
      args.push('-preset', 'speed')
    } else if (preset === 'quality') {
      args.push('-preset', 'quality')
    } else {
      args.push('-preset', 'balanced')
    }
  }
  // Intel QSV presets (speed, balanced, quality)
  else if (encoder.includes('qsv')) {
    args.push('-c:v', encoder)
    if (preset === 'fast') {
      args.push('-preset', 'speed')
    } else if (preset === 'quality') {
      args.push('-preset', 'quality')
    } else {
      args.push('-preset', 'balanced')
    }
  }
  // Apple VideoToolbox presets
  else if (encoder.includes('videotoolbox')) {
    args.push('-c:v', encoder)
    if (preset === 'fast') {
      args.push('-realtime', '1')
    } else {
      args.push('-realtime', '0')
    }
  }
  // CPU Fallback (libx264)
  else {
    args.push('-c:v', 'libx264')
    if (preset === 'fast') {
      args.push('-preset', 'veryfast')
    } else if (preset === 'quality') {
      args.push('-preset', 'slow')
    } else {
      args.push('-preset', 'medium')
    }
  }

  return args
}
