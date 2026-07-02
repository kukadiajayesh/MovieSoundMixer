import { create } from 'zustand'

export type PageId = 'extract' | 'merge' | 'history' | 'showcase'

interface UIState {
  page: PageId
  setPage: (page: PageId) => void
}

/**
 * App-level navigation state. Lives in a store (rather than App-local useState)
 * so any component — e.g. the History "Re-run" action — can switch pages.
 */
export const useUIStore = create<UIState>((set) => ({
  page: 'extract',
  setPage: (page) => set({ page }),
}))
