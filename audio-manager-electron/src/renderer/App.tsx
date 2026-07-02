import { useEffect, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { useUIStore } from './stores/uiStore'
import { LogDrawer } from './components/design/LogDrawer'
import { ToastHost } from './components/design/Toasts'
import { Icon } from './components/design/Icon'
import { ExtractAudio } from './pages/ExtractAudio'
import { MergeAudio } from './pages/MergeAudio'
import { History } from './pages/History'
import { ComponentShowcase } from './pages/ComponentShowcase'
import { useTheme } from './hooks/useTheme'
import { useIPC } from './hooks/useIPC'
import { useSettingsStore } from './stores/settingsStore'
import { useHistoryStore } from './stores/historyStore'

export default function App() {
  const [version, setVersion] = useState('')
  const currentPage = useUIStore((s) => s.page)
  const setCurrentPage = useUIStore((s) => s.setPage)
  const [deps, setDeps] = useState({
    ffmpegAvailable: false,
    mkvmergeAvailable: false,
    gpuActive: false,
    gpuCount: 0,
  })

  const { resolvedTheme, setTheme } = useTheme()
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
        const d = await window.electron?.ipcRenderer?.invoke('get-dependency-status')
        if (d) {
          setDeps({
            ffmpegAvailable: d.ffmpegAvailable,
            mkvmergeAvailable: d.mkvmergeAvailable,
            gpuActive: d.gpuActive,
            gpuCount: d.gpuInfo?.available?.length ?? 0,
          })
        }
      } catch (err) {
        console.error('Failed to get dependency status:', err)
      }

      try {
        await useSettingsStore.getState().loadSettings()
        await useHistoryStore.getState().loadHistory()
      } catch (err) {
        console.error('Failed to load SQLite data on boot:', err)
      }
    }

    boot()
  }, [])

  const renderActivePage = () => {
    switch (currentPage) {
      case 'extract':
        return <ExtractAudio />
      case 'merge':
        return <MergeAudio />
      case 'history':
        return <History />
      case 'showcase':
        return <ComponentShowcase />
      default:
        return null
    }
  }

  return (
    <ToastHost>
      <div className="app">
        <div className="titlebar">
          <div className="tl-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="tl-title">FFmpeg Audio Manager{version ? ` — v${version}` : ''}</div>
          <div className="tl-spacer">
            <div className="tl-actions">
              <button
                className="btn btn-ghost btn-sm"
                title="Toggle light/dark theme"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} />
              </button>
            </div>
          </div>
        </div>

        <Sidebar
          activePage={currentPage}
          onPageChange={setCurrentPage}
          ffmpegAvailable={deps.ffmpegAvailable}
          mkvmergeAvailable={deps.mkvmergeAvailable}
          gpuActive={deps.gpuActive}
          gpuCount={deps.gpuCount}
        />

        <main className="main">{renderActivePage()}</main>

        <LogDrawer />
      </div>
    </ToastHost>
  )
}
