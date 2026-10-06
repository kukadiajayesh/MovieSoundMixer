import { execSync, spawn } from 'child_process'
import { getFFmpegPath } from '../ffmpeg/detector'

export interface EncoderSupport {
  working: string[] // hardware encoders that opened and encoded a test clip
  tenBit: string[] // the subset that also encoded 10-bit (p010)
}

// Encodes a fraction of a second of a generated test pattern with `encoder`.
// FFmpeg lists every encoder it was built with, so this is the only way to
// know one actually runs here (NVENC without an NVIDIA GPU fails to open).
const trialEncode = (encoder: string, extra: string[] = []): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn(getFFmpegPath(), [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc2=s=640x360:d=0.2',
      '-c:v', encoder, ...extra,
      '-f', 'null', '-',
    ])
    const timer = setTimeout(() => child.kill('SIGKILL'), 15000)
    child.on('error', () => resolve(false))
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0)
    })
  })

let support: Promise<EncoderSupport> | null = null

// Which listed hardware encoders really work, tested once per app run.
export function getEncoderSupport(): Promise<EncoderSupport> {
  if (!support) {
    support = (async () => {
      const listed = detectGPUEncoders().available
      const working: string[] = []
      const tenBit: string[] = []
      for (const enc of listed) {
        if (!(await trialEncode(enc))) continue
        working.push(enc)
        // Hardware H.264 is 8-bit only in practice; only HEVC can carry 10-bit.
        if (enc.startsWith('hevc') && (await trialEncode(enc, ['-pix_fmt', 'p010le', '-profile:v', 'main10']))) {
          tenBit.push(enc)
        }
      }
      return { working, tenBit }
    })()
  }
  return support
}

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

// Pick the best of `available` for the codec, preferring NVENC > QSV > AMF > VideoToolbox.
// Returns null when none is present (caller falls back to a CPU encoder).
export function pickPreferredEncoder(available: string[], codec: 'h264' | 'hevc' = 'h264'): string | null {
  for (const vendor of ['nvenc', 'qsv', 'amf', 'videotoolbox']) {
    const enc = `${codec}_${vendor}`
    if (available.includes(enc)) return enc
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
  // CPU H.265 (libx265), the only encoder here that always keeps 10-bit
  else if (encoder === 'libx265') {
    args.push('-c:v', 'libx265')
    if (preset === 'fast') {
      args.push('-preset', 'veryfast')
    } else if (preset === 'quality') {
      args.push('-preset', 'slow')
    } else {
      args.push('-preset', 'medium')
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
