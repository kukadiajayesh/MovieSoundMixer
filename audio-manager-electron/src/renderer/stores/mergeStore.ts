import { create } from 'zustand'

// Shape returned by the `probe-streams` IPC call — one entry per audio stream
// in a probed file.
export interface AudioStream {
  index: number
  language?: string
  codec: string
  channels: number
  title?: string
  bitrate?: string
  isDefault?: boolean
}

export interface MergeSource {
  name: string
  path: string
  // Present once the source has been probed — lets a video (or multi-track
  // audio) file be used as the audio donor with a specific channel picked.
  streams?: AudioStream[]
  selectedStreamIndex?: number
  // Present once the source has been probed (see probeSource in MergeAudio.tsx).
  duration?: number // seconds
  videoCodec?: string // friendly label, e.g. "H.264" — absent for audio-only files
  resolution?: string // friendly label, e.g. "1080p" — absent for audio-only files
}

export interface MergePair {
  id: string
  video: MergeSource
  audio: MergeSource | null
  episode: string | null
  status: 'ready' | 'processing' | 'success' | 'error'
  progress: number // 0..1
  error?: string
  outputPath?: string // set once the job succeeds, so the file can be opened
}

/** Extract a normalized SxxExx episode tag from a filename, if present. */
export const parseEpisode = (name: string): string | null => {
  const m = name.match(/S(\d{1,2})\s*E(\d{1,3})/i)
  if (!m) return null
  return `S${m[1].padStart(2, '0')}E${m[2].padStart(2, '0')}`
}

const VIDEO_EXTS = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'm4v', '3gp', 'ts', 'm2ts']

export const isVideoFile = (name: string) =>
  VIDEO_EXTS.includes((name.split('.').pop() || '').toLowerCase())

interface MergeState {
  pairs: MergePair[]
  unmatchedAudios: MergeSource[]
  addFiles: (files: MergeSource[]) => void
  assignAudio: (pairId: string, audio: MergeSource | null) => void
  updateAudioStreamIndex: (pairId: string, streamIndex: number) => void
  updateSourceMeta: (pairId: string, side: 'video' | 'audio', meta: Partial<MergeSource>) => void
  removePair: (id: string) => void
  clearPairs: () => void
  updatePairStatus: (id: string, status: MergePair['status'], error?: string, outputPath?: string) => void
  updatePairProgress: (id: string, progress: number) => void
}

/** Re-run episode auto-matching between pairs missing audio and the unmatched audio pool. */
const rematch = (pairs: MergePair[], audios: MergeSource[]) => {
  const remaining = [...audios]
  const next = pairs.map((p) => {
    if (p.audio || !p.episode) return p
    const idx = remaining.findIndex((a) => parseEpisode(a.name) === p.episode)
    if (idx === -1) return p
    const [audio] = remaining.splice(idx, 1)
    return { ...p, audio }
  })
  return { pairs: next, unmatchedAudios: remaining }
}

export const useMergeStore = create<MergeState>((set) => ({
  pairs: [],
  unmatchedAudios: [],

  addFiles: (files) =>
    set((state) => {
      const newVideos = files.filter((f) => isVideoFile(f.name))
      const newAudios = files.filter((f) => !isVideoFile(f.name))

      const existingPaths = new Set(state.pairs.map((p) => p.video.path))
      const newPairs: MergePair[] = newVideos
        .filter((v) => !existingPaths.has(v.path))
        .map((v) => ({
          id: `pair-${Math.random().toString(36).substring(2, 9)}`,
          video: v,
          audio: null,
          episode: parseEpisode(v.name),
          status: 'ready' as const,
          progress: 0,
        }))

      const audioPaths = new Set(state.unmatchedAudios.map((a) => a.path))
      const pool = [...state.unmatchedAudios, ...newAudios.filter((a) => !audioPaths.has(a.path))]

      return rematch([...state.pairs, ...newPairs], pool)
    }),

  assignAudio: (pairId, audio) =>
    set((state) => ({
      pairs: state.pairs.map((p) => (p.id === pairId ? { ...p, audio } : p)),
    })),

  updateAudioStreamIndex: (pairId, streamIndex) =>
    set((state) => ({
      pairs: state.pairs.map((p) =>
        p.id === pairId && p.audio ? { ...p, audio: { ...p.audio, selectedStreamIndex: streamIndex } } : p,
      ),
    })),

  // Merges probed metadata (duration/videoCodec/resolution/streams) into one
  // side of a pair once the background probe for it resolves. A no-op if the
  // audio side has since been cleared/reassigned out from under it.
  updateSourceMeta: (pairId, side, meta) =>
    set((state) => ({
      pairs: state.pairs.map((p) => {
        if (p.id !== pairId) return p
        if (side === 'video') return { ...p, video: { ...p.video, ...meta } }
        return p.audio ? { ...p, audio: { ...p.audio, ...meta } } : p
      }),
    })),

  removePair: (id) =>
    set((state) => ({
      pairs: state.pairs.filter((p) => p.id !== id),
    })),

  clearPairs: () => set({ pairs: [], unmatchedAudios: [] }),

  updatePairStatus: (id, status, error, outputPath) =>
    set((state) => ({
      // outputPath is intentionally replaced (not merged) so a re-run
      // clears the stale path until the new job succeeds.
      pairs: state.pairs.map((p) => (p.id === id ? { ...p, status, error, outputPath } : p)),
    })),

  updatePairProgress: (id, progress) =>
    set((state) => ({
      pairs: state.pairs.map((p) => (p.id === id ? { ...p, progress } : p)),
    })),
}))
