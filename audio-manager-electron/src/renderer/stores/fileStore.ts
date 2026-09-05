import { create } from 'zustand'

export interface AudioStream {
  index: number
  language?: string
  codec: string
  channels: number
  title?: string
  bitrate?: string
  isDefault?: boolean
}

export interface FileEntry {
  id: string
  name: string
  path: string
  size: number
  duration?: number
  streams: AudioStream[]
  selectedStreamIndex: number
  status: 'ready' | 'probing' | 'processing' | 'success' | 'error'
  statusText?: string
  progress: number // 0..1 while processing
  outputPath?: string // set once the job succeeds, so the file can be opened
}

interface FileState {
  files: FileEntry[]
  selectedIds: string[]
  searchQuery: string
  addFiles: (newFiles: Omit<FileEntry, 'id' | 'selectedStreamIndex' | 'status' | 'progress'>[]) => void
  removeFiles: (ids: string[]) => void
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  updateStreamIndex: (id: string, streamIndex: number) => void
  updateFileStatus: (id: string, status: FileEntry['status'], statusText?: string, outputPath?: string) => void
  updateFileProgress: (id: string, progress: number) => void
  setSearchQuery: (query: string) => void
  clearFiles: () => void
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  selectedIds: [],
  searchQuery: '',

  addFiles: (newFiles) =>
    set((state) => {
      const formattedFiles: FileEntry[] = newFiles.map((f) => {
        let bestIndex = f.streams.length > 0 ? f.streams[0].index : 0
        if (f.streams.length > 0) {
          const preferredKeywords = ['hid', 'hindi', 'hin', 'hind']
          const matchesKeyword = (s: (typeof f.streams)[number]) =>
            preferredKeywords.some(
              (kw) => s.language?.toLowerCase().includes(kw) || s.title?.toLowerCase().includes(kw),
            )
          const preferredDefault = f.streams.find((s) => s.isDefault && matchesKeyword(s))
          const preferredMatch = preferredDefault ?? f.streams.find(matchesKeyword)
          const anyDefault = f.streams.find((s) => s.isDefault)
          const chosen = preferredMatch ?? anyDefault
          if (chosen) {
            bestIndex = chosen.index
          }
        }
        return {
          ...f,
          id: `file-${Math.random().toString(36).substring(2, 9)}`,
          selectedStreamIndex: bestIndex,
          status: 'ready',
          progress: 0,
        }
      })
      // Filter out duplicates by path
      const filteredFiles = formattedFiles.filter(
        (nf) => !state.files.some((f) => f.path === nf.path),
      )
      return {
        files: [...state.files, ...filteredFiles],
      }
    }),

  removeFiles: (ids) =>
    set((state) => ({
      files: state.files.filter((f) => !ids.includes(f.id)),
      selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
    })),

  toggleSelect: (id) =>
    set((state) => {
      const isSelected = state.selectedIds.includes(id)
      return {
        selectedIds: isSelected
          ? state.selectedIds.filter((fid) => fid !== id)
          : [...state.selectedIds, id],
      }
    }),

  toggleSelectAll: () =>
    set((state) => ({
      selectedIds:
        state.selectedIds.length === state.files.length
          ? []
          : state.files.map((f) => f.id),
    })),

  updateStreamIndex: (id, streamIndex) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, selectedStreamIndex: streamIndex } : f,
      ),
    })),

  updateFileStatus: (id, status, statusText, outputPath) =>
    set((state) => ({
      files: state.files.map((f) =>
        // outputPath is intentionally replaced (not merged) so a re-run
        // clears the stale path until the new job succeeds.
        f.id === id ? { ...f, status, statusText, outputPath } : f,
      ),
    })),

  updateFileProgress: (id, progress) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, progress } : f,
      ),
    })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  clearFiles: () => set({ files: [], selectedIds: [], searchQuery: '' }),
}))
