import { useEffect, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { PageHeader } from './components/layout/PageHeader'
import { ExtractAudio } from './pages/ExtractAudio'
import { MergeAudio } from './pages/MergeAudio'
import { History } from './pages/History'
import { ComponentShowcase } from './pages/ComponentShowcase'
import { useTheme } from './hooks/useTheme'
import { useIPC } from './hooks/useIPC'
import { useSettingsStore } from './stores/settingsStore'
import { useHistoryStore } from './stores/historyStore'

type PageType = 'extract' | 'merge' | 'history' | 'showcase'

export default function App() {
  const [version, setVersion] = useState('')
  const [currentPage, setCurrentPage] = useState<PageType>('extract') // Production workspace default
  const [deps, setDeps] = useState({
    ffmpegAvailable: false,
    mkvmergeAvailable: false,
    gpuActive: false,
  })

  // Initialize theme and global IPC hook listeners
  useTheme()
  useIPC()

  useEffect(() => {
    const getVersion = async () => {
      try {
        const v = await window.electron?.ipcRenderer?.invoke('get-version')
        setVersion(v)
      } catch (error) {
        console.error('Failed to get version:', error)
      }
    }

    const checkDeps = async () => {
      try {
        const d = await window.electron?.ipcRenderer?.invoke('get-dependency-status')
        if (d) {
          setDeps({
            ffmpegAvailable: d.ffmpegAvailable,
            mkvmergeAvailable: d.mkvmergeAvailable,
            gpuActive: d.gpuActive,
          })
        }
      } catch (err) {
        console.error('Failed to get dependency status:', err)
      }
    }

    const loadData = async () => {
      try {
        await useSettingsStore.getState().loadSettings()
        await useHistoryStore.getState().loadHistory()
      } catch (err) {
        console.error('Failed to load SQLite data on boot:', err)
      }
    }

    getVersion()
    checkDeps()
    loadData()
  }, [])

  const getPageTitle = () => {
    switch (currentPage) {
      case 'extract':
        return 'Extract Audio Track'
      case 'merge':
        return 'Merge Audio Tracks'
      case 'history':
        return 'Conversion History'
      case 'showcase':
        return 'Design System Component Showcase'
      default:
        return 'FFmpeg Audio Manager'
    }
  }

  const getPageSubtitle = () => {
    switch (currentPage) {
      case 'extract':
        return 'Isolate and save high quality audio tracks from video files'
      case 'merge':
        return 'Combine multiple audio tracks or add them back to source videos'
      case 'history':
        return 'Review completed file operations, duration states, and conversion logs'
      case 'showcase':
        return 'Verify color accessibility contrast ratios, fluid transition animations, and complex specialized components'
      default:
        return ''
    }
  }

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
    <div className="app-layout">
      {/* Navigation Sidebar */}
      <Sidebar
        activePage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        ffmpegAvailable={deps.ffmpegAvailable}
        mkvmergeAvailable={deps.mkvmergeAvailable}
        gpuActive={deps.gpuActive}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <header className="app-header">
          <PageHeader title={getPageTitle()} subtitle={getPageSubtitle()} />
          {version && (
            <span
              className="version"
              style={{
                fontSize: '11px',
                color: 'var(--fg-2)',
                backgroundColor: 'var(--bg-2)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
                fontWeight: 600,
              }}
            >
              v{version}
            </span>
          )}
        </header>

        {renderActivePage()}
      </div>
    </div>
  )
}
