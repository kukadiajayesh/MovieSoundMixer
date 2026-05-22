import { execFileSync } from 'child_process'
import { getMkvmergePath } from './detector'

export interface MkvTrack {
  id: number
  type: 'video' | 'audio' | 'subtitles'
  codec: string
  language?: string
}

// Parse an MKV/WebM file with `mkvmerge -J` (JSON identification mode).
// Returns null when mkvmerge is unavailable or the file can't be parsed.
export function identifyMkv(filePath: string): MkvTrack[] | null {
  const mkvPath = getMkvmergePath()
  if (!mkvPath) return null

  try {
    const out = execFileSync(mkvPath, ['-J', filePath], { encoding: 'utf8' })
    const parsed = JSON.parse(out)
    const tracks = Array.isArray(parsed.tracks) ? parsed.tracks : []
    return tracks.map((t: any) => ({
      id: t.id,
      type: t.type,
      codec: t.codec,
      language: t.properties?.language,
    }))
  } catch (err) {
    console.error(`Failed to identify MKV file ${filePath}:`, err)
    return null
  }
}
