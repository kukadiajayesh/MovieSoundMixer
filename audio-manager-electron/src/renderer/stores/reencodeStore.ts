import { create } from 'zustand'
import { MergeSource, isVideoFile } from './mergeStore'

// One target video on the Re-encode Video page.
export interface ReencodeItem {
  id: string
  video: MergeSource
  status: 'ready' | 'processing' | 'success' | 'error'
  progress: number // 0..1
  error?: string
  outputPath?: string // set once the job succeeds, so the file can be opened
}

interface ReencodeState {
  items: ReencodeItem[]
  addVideos: (files: MergeSource[]) => void
  updateMeta: (id: string, meta: Partial<MergeSource>) => void
  remove: (id: string) => void
  clear: () => void
  updateStatus: (id: string, status: ReencodeItem['status'], error?: string, outputPath?: string) => void
  updateProgress: (id: string, progress: number) => void
}

export const useReencodeStore = create<ReencodeState>((set) => ({
  items: [],

  // Videos only; a file already in the list isn't added twice.
  addVideos: (files) =>
    set((state) => {
      const existing = new Set(state.items.map((i) => i.video.path))
      const added = files
        .filter((f) => isVideoFile(f.name) && !existing.has(f.path))
        .map((video) => ({
          id: `vid-${Math.random().toString(36).substring(2, 9)}`,
          video,
          status: 'ready' as const,
          progress: 0,
        }))
      return { items: [...state.items, ...added] }
    }),

  updateMeta: (id, meta) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, video: { ...i.video, ...meta } } : i)),
    })),

  remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  clear: () => set({ items: [] }),

  updateStatus: (id, status, error, outputPath) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, status, error, outputPath: outputPath ?? i.outputPath } : i,
      ),
    })),

  updateProgress: (id, progress) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, progress } : i)),
    })),
}))
