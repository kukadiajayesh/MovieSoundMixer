import { spawn } from 'child_process'
import { getFFmpegPath } from './detector'

export interface AudioStreamInfo {
  index: number
  language?: string
  codec: string
  channels: number
  title?: string
  bitrate?: string
}

export interface ProbeResult {
  duration: number // total duration in seconds
  streams: AudioStreamInfo[]
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

        // Split stderr by lines
        const lines = stderrData.split('\n')

        // Regular expressions to match Audio Streams & Duration
        const audioStreamRegex = /Stream #0:(\d+)(?:\(([^)]+)\))?:\s*Audio:\s*([^,\s\()]+)/i
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

            streams.push({
              index,
              language,
              codec,
              channels,
              bitrate,
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

        resolve({ duration, streams })
      } catch (err) {
        reject(err)
      }
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}
