import { useEffect, useState } from 'react'
import { LogDrawer } from './components/design/LogDrawer'
import { ToastHost } from './components/design/Toasts'
import { TooltipHost } from './components/design/TooltipHost'
import { MergeAudio } from './pages/MergeAudio'
import { useTheme } from './hooks/useTheme'
import { useIPC } from './hooks/useIPC'
import { useSettingsStore } from './stores/settingsStore'

export default function App() {
  const [version, setVersion] = useState('')

  // No UI reads the resolved theme/setter here anymore (the toggle lives in
  // the Merge page header) — this call is kept solely for its side effect:
  // applying data-theme to the document root and syncing the titlebar theme.
  useTheme()
  useIPC()

  useEffect(() => {
    const boot = async () => {
      try {
        const v = await window.electron?.ipcRenderer?.invoke('get-version')
        if (v) setVersion(v)
      } catch (error) {
        console.error('Failed to get version:', error)
      }

      try {
        await useSettingsStore.getState().loadSettings()
      } catch (err) {
        console.error('Failed to load SQLite data on boot:', err)
      }
    }

    boot()
  }, [])

  return (
    <ToastHost>
      <div className="app">
        <div className="titlebar">
          <div className="tl-left-spacer" style={{ width: '200px' }}></div>
          <div className="tl-title">FFmpeg Audio Manager{version ? ` — v${version}` : ''}</div>
          <div className="tl-spacer" />
        </div>

        <main className="main">
          <MergeAudio />
        </main>

        <LogDrawer />
      </div>
      <TooltipHost />
    </ToastHost>
  )
}
