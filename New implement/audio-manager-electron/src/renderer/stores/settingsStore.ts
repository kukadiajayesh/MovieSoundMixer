import { create } from 'zustand'

interface SettingsState {
  outputDirectory: string
  defaultFormat: string
  gpuEnabled: boolean
  theme: 'light' | 'dark' | 'system'
  autoUpdate: boolean

  loadSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  outputDirectory: 'C:/Users/Downloads/Audio_Extracted',
  defaultFormat: 'copy',
  gpuEnabled: true,
  theme: 'system',
  autoUpdate: true,

  loadSettings: async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('get-settings')
        if (res && res.success && res.settings) {
          set({
            outputDirectory: res.settings.output_directory || 'C:/Users/Downloads/Audio_Extracted',
            defaultFormat: res.settings.default_format || 'copy',
            gpuEnabled: res.settings.gpu_enabled === 'true',
            theme: (res.settings.theme as 'light' | 'dark' | 'system') || 'system',
            autoUpdate: res.settings.auto_update === 'true',
          })
        }
      } catch (err) {
        console.error('Failed to load settings via IPC:', err)
      }
    }
  },

  updateSetting: async (key, value) => {
    // Map property name
    const stateKeyMap: { [key: string]: string } = {
      output_directory: 'outputDirectory',
      default_format: 'defaultFormat',
      gpu_enabled: 'gpuEnabled',
      theme: 'theme',
      auto_update: 'autoUpdate',
    }

    const stateKey = stateKeyMap[key]
    if (stateKey) {
      const parsedValue = value === 'true' ? true : value === 'false' ? false : value
      set({ [stateKey]: parsedValue })
    }

    if (window.electron?.ipcRenderer) {
      try {
        await window.electron.ipcRenderer.invoke('save-settings', { key, value })
      } catch (err) {
        console.error(`Failed to save setting ${key} via IPC:`, err)
      }
    }
  },
}))
