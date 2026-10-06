import { spawn } from 'child_process'
import { getFFmpegPath } from './detector'

export interface AudioStreamInfo {
  index: number
  language?: string
  codec: string
  channels: number
  title?: string
  bitrate?: string
  isDefault?: boolean
}

export interface ProbeResult {
  duration: number // total duration in seconds
  streams: AudioStreamInfo[]
  videoCodec?: string // friendly label, e.g. "H.264" — absent for audio-only files
  resolution?: string // friendly label, e.g. "1080p" — absent for audio-only files
  // The first video stream's pixel format and colour, for re-encoding without
  // losing 10-bit or HDR. Colour fields use FFmpeg's names (e.g. "bt2020").
  pixFmt?: string
  bitDepth?: number
  colorSpace?: string
  colorPrimaries?: string
  colorTransfer?: string
  hdr?: boolean
  subtitleCount: number
}

// "yuv420p10le(tv, bt2020nc/bt2020/smpte2084, progressive), 3840x1600" ->
// pixel format plus colour space/primaries/transfer. A single colour token
// ("bt709") means all three are the same.
function parseVideoFormat(line: string) {
  const m = line.match(/,\s*([a-z][a-z0-9]*)(?:\(([^)]*)\))?,\s*\d{2,5}x\d{2,5}/i)
  if (!m) return {}
  const pixFmt = m[1].toLowerCase()
  const depth = pixFmt.match(/p(9|10|12|14|16)(?:le|be)?$/) ?? pixFmt.match(/^p0(10|12|16)/)
  const out: Partial<ProbeResult> = { pixFmt, bitDepth: depth ? parseInt(depth[1], 10) : 8 }
  for (const part of (m[2] ?? '').split(',').map((s) => s.trim())) {
    if (part.includes('/')) {
      const [space, primaries, transfer] = part.split('/')
      out.colorSpace = space
      out.colorPrimaries = primaries
      out.colorTransfer = transfer
    } else if (/^(bt|smpte|arib|iec|ycgco|fcc|gbr)/i.test(part)) {
      out.colorSpace = out.colorPrimaries = out.colorTransfer = part
    }
  }
  out.hdr = out.colorTransfer === 'smpte2084' || out.colorTransfer === 'arib-std-b67'
  return out
}

// ffmpeg codec token -> friendly display label.
const VIDEO_CODEC_LABELS: Record<string, string> = {
  h264: 'H.264',
  avc: 'H.264',
  hevc: 'H.265',
  h265: 'H.265',
  vp9: 'VP9',
  vp8: 'VP8',
  av1: 'AV1',
  mpeg4: 'MPEG-4',
  mpeg2video: 'MPEG-2',
  theora: 'Theora',
  prores: 'ProRes',
}

const labelForVideoCodec = (token: string): string => {
  const key = token.toLowerCase()
  return VIDEO_CODEC_LABELS[key] || token.toUpperCase()
}

const labelForResolution = (height: number): string => {
  if (height >= 2160) return '4K'
  if (height >= 1440) return '1440p'
  if (height >= 1080) return '1080p'
  if (height >= 720) return '720p'
  if (height >= 480) return '480p'
  return `${height}p`
}

export function probeStreams(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFFmpegPath()

    // Spawns: ffmpeg -i "filePath"
    const child = spawn(ffmpegPath, ['-i', filePath])
    let stderrData = ''

    child.stdout.on('data', () => {}) // ignore stdout
    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString()
    })

    child.on('close', () => {
      try {
        const streams: AudioStreamInfo[] = []
        let duration = 0
        let videoCodec: string | undefined
        let resolution: string | undefined
        let videoFormat: Partial<ProbeResult> = {}
        let subtitleCount = 0

        // Split stderr by lines
        const lines = stderrData.split('\n')

        // Regular expressions to match Audio/Video Streams & Duration. MP4/MOV
        // (and some TS) streams carry a container ID before the language,
        // e.g. "Stream #0:1[0x2](eng): Audio: aac ...", hence the optional [..].
        const audioStreamRegex = /Stream #0:(\d+)(?:\[[^\]]*\])?(?:\(([^)]+)\))?:\s*Audio:\s*([^,\s\()]+)/i
        // e.g. "Stream #0:0(und): Video: h264 (High), yuv420p, 1920x1080 [SAR ...]"
        const videoStreamRegex =
          /Stream #0:\d+(?:\[[^\]]*\])?(?:\([^)]+\))?:\s*Video:\s*([^,\s\()]+).*?(\d{2,5})x(\d{2,5})/i
        const anyStreamRegex = /Stream #0:\d+/
        const durationRegex = /Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/i
        const titleRegex = /^\s*title\s*:\s*(.+?)\s*$/i

        // Track the array position of the audio stream whose metadata block we're
        // currently inside, so a following "title :" line attaches to it. Any other
        // Stream line (video/subtitle) ends that block.
        let currentAudioArrayIdx = -1

        for (const line of lines) {
          // Check for duration match
          const durMatch = line.match(durationRegex)
          if (durMatch) {
            const hours = parseInt(durMatch[1], 10)
            const minutes = parseInt(durMatch[2], 10)
            const seconds = parseInt(durMatch[3], 10)
            const centiseconds = parseInt(durMatch[4], 10)
            duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100
          }

          // Check for video stream match — only the first one counts for display
          if (videoCodec === undefined) {
            const vMatch = line.match(videoStreamRegex)
            if (vMatch) {
              videoCodec = labelForVideoCodec(vMatch[1])
              resolution = labelForResolution(parseInt(vMatch[3], 10))
              videoFormat = parseVideoFormat(line)
            }
          }
          if (/Stream #0:\d+.*?:\s*Subtitle:/.test(line)) subtitleCount++

          // Check for audio stream match
          const match = line.match(audioStreamRegex)
          if (match) {
            const index = parseInt(match[1], 10)
            const language = match[2] || undefined
            const codec = match[3].toLowerCase()

            // Resolve channel count
            let channels = 2 // default to stereo
            if (line.includes('5.1') || line.includes('6 channels') || line.includes('6ch')) {
              channels = 6
            } else if (line.includes('mono') || line.includes('1 channels') || line.includes('1ch')) {
              channels = 1
            } else if (line.includes('stereo') || line.includes('2 channels') || line.includes('2ch')) {
              channels = 2
            } else {
              // General regex fallback for channel counts like "3 channels" or "8 channels"
              const channelMatch = line.match(/(\d+)\s*channels/i) || line.match(/(\d+)\s*ch/i)
              if (channelMatch) {
                channels = parseInt(channelMatch[1], 10)
              }
            }

            // Bitrate lives on the same Stream line, e.g. "... 640 kb/s (default)".
            const bitrateMatch = line.match(/(\d+)\s*kb\/s/i)
            const bitrate = bitrateMatch ? `${bitrateMatch[1]}k` : undefined

            const isDefault = line.toLowerCase().includes('(default)')

            streams.push({
              index,
              language,
              codec,
              channels,
              bitrate,
              isDefault,
            })
            currentAudioArrayIdx = streams.length - 1
          } else if (anyStreamRegex.test(line)) {
            // A non-audio stream line closes the previous audio metadata block.
            currentAudioArrayIdx = -1
          } else if (currentAudioArrayIdx >= 0) {
            const titleMatch = line.match(titleRegex)
            if (titleMatch) {
              streams[currentAudioArrayIdx].title = titleMatch[1]
            }
          }
        }

        resolve({ duration, streams, videoCodec, resolution, ...videoFormat, subtitleCount })
      } catch (err) {
        reject(err)
      }
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}
