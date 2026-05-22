import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeType = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemeType
  setTheme: (theme: ThemeType) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ffmpeg-audio-manager-theme',
    },
  ),
)
