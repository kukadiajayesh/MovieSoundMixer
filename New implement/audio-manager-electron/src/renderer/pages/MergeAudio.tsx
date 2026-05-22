import React, { useState } from 'react'
import { Card } from '../components/layout/Card'
import { Button } from '../components/buttons/Button'
import { Input } from '../components/forms/Input'
import { Select } from '../components/forms/Select'
import { useJobStore } from '../stores/jobStore'
import { ProgressDock } from '../components/specialized/ProgressDock'
import { LogViewer } from '../components/specialized/LogViewer'
import { ToastContainer } from '../components/overlays/Toast'

export const MergeAudio: React.FC = () => {
  // Store Subscriptions
  const {
    status: dockStatus,
    percentComplete,
    activeFileName,
    stats: dockStats,
    logs,
    showLogs,
    startQueue,
    addLog,
    clearLogs,
    setShowLogs,
    resetQueue,
  } = useJobStore()

  // Selection States
  const [videoFile, setVideoFile] = useState<{ name: string; path: string; size: string } | null>(null)
  const [audioFile, setAudioFile] = useState<{ name: string; path: string; size: string } | null>(null)

  // Configuration States
  const [copyVideo, setCopyVideo] = useState(true)
  const [mergeMode, setMergeMode] = useState<'replace' | 'secondary'>('replace')
  const [container, setContainer] = useState('mp4')
  const [outputPath, setOutputPath] = useState('C:/Users/Downloads/Audio_Merged')
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>>([])

  // Toast Helpers
  const triggerToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newToast = { id: Math.random().toString(), message, type }
    setToasts((prev) => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Browse Native File Dialog triggers
  const handleBrowseVideo = async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('open-file-dialog')
        if (res && !res.canceled && res.filePaths.length > 0) {
          const fp = res.filePaths[0]
          const name = fp.substring(fp.lastIndexOf(fp.includes('\\') ? '\\' : '/') + 1)
          setVideoFile({
            name,
            path: fp,
            size: 'Video Track Ready',
          })
          triggerToast('Video file selected successfully!', 'success')
        }
      } catch (err) {
        console.error('Failed to open video file browser:', err)
      }
    } else {
      triggerToast('Native file browsing is only supported inside Electron frame.', 'warning')
    }
  }

  const handleBrowseAudio = async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('open-file-dialog')
        if (res && !res.canceled && res.filePaths.length > 0) {
          const fp = res.filePaths[0]
          const name = fp.substring(fp.lastIndexOf(fp.includes('\\') ? '\\' : '/') + 1)
          setAudioFile({
            name,
            path: fp,
            size: 'Audio Track Ready',
          })
          triggerToast('Audio track selected successfully!', 'success')
        }
      } catch (err) {
        console.error('Failed to open audio file browser:', err)
      }
    } else {
      triggerToast('Native file browsing is only supported inside Electron frame.', 'warning')
    }
  }

  // Clear slots
  const handleClearSlots = () => {
    setVideoFile(null)
    setAudioFile(null)
    triggerToast('Dual source slots cleared.', 'info')
  }

  // Start Merge Subprocess Run
  const handleStartMerge = async () => {
    if (!videoFile || !audioFile) {
      triggerToast('Please select both a video file and an audio file to merge!', 'error')
      return
    }

    startQueue(1, videoFile.name)
    clearLogs()

    addLog('Main process multiplexing queue initialized...')
    addLog(`Video path: ${videoFile.path}`)
    addLog(`Audio path: ${audioFile.path}`)
    addLog(`Output Container target: ${container.toUpperCase()}`)

    if (window.electron?.ipcRenderer) {
      try {
        await window.electron.ipcRenderer.invoke('start-merge', {
          id: 'merge-job-1',
          videoPath: videoFile.path,
          audioPath: audioFile.path,
          outContainer: container,
          outFolder: outputPath,
          copyVideo,
          mergeMode,
          duration: 0,
        })
      } catch (err: any) {
        console.error('Failed to trigger background merge:', err)
        addLog(`[ERROR] Merging failed: ${err.message}`)
      }
    } else {
      triggerToast('Multiplexing on disk is only supported inside Electron frame.', 'warning')
    }
  }

  return (
    <div className="page-container animate-fade-in">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Dual file selector cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)' }}>
        {/* Source Video File */}
        <Card title="Source Video Input">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', minHeight: '150px', justifyContent: 'center' }}>
            {videoFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg-0)' }}>{videoFile.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--fg-2)' }}>Path: {videoFile.path}</span>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>{videoFile.size}</span>
                <Button variant="ghost" size="sm" onClick={() => setVideoFile(null)} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                  Remove Video
                </Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--fg-2)' }}>
                <svg style={{ width: '40px', height: '40px', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="2" y1="7" x2="7" y2="7" />
                  <line x1="2" y1="17" x2="7" y2="17" />
                  <line x1="17" y1="17" x2="22" y2="17" />
                  <line x1="17" y1="7" x2="22" y2="7" />
                </svg>
                <span style={{ fontSize: '13px' }}>Select input video track container</span>
                <Button variant="ghost" size="md" onClick={handleBrowseVideo}>
                  Browse Video...
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Source Audio File */}
        <Card title="Target Audio Track Input">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', minHeight: '150px', justifyContent: 'center' }}>
            {audioFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg-0)' }}>{audioFile.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--fg-2)' }}>Path: {audioFile.path}</span>
                <span style={{ fontSize: '12px', color: 'var(--ok)', fontWeight: 500 }}>{audioFile.size}</span>
                <Button variant="ghost" size="sm" onClick={() => setAudioFile(null)} style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                  Remove Audio
                </Button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--fg-2)' }}>
                <svg style={{ width: '40px', height: '40px', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <span style={{ fontSize: '13px' }}>Select high quality audio soundtrack to merge</span>
                <Button variant="ghost" size="md" onClick={handleBrowseAudio}>
                  Browse Audio...
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Clear dual slots */}
      {(videoFile || audioFile) && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button variant="ghost" size="sm" onClick={handleClearSlots}>
            Clear Both Slots
          </Button>
        </div>
      )}

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)' }}>
        {/* Multiplexer Options */}
        <Card title="Multiplex Options">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Copy Video Option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setCopyVideo(!copyVideo)}>
              <input type="checkbox" checked={copyVideo} readOnly style={{ cursor: 'pointer' }} />
              <label style={{ fontSize: '13px', color: 'var(--fg-1)', cursor: 'pointer' }}>
                Copy Video Stream (Extreme Speed - recommended)
              </label>
            </div>

            {/* Audio Merge Mode Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-1)' }}>Audio track merge mode:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMergeMode('replace')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: mergeMode === 'replace' ? 'var(--accent)' : 'var(--line)',
                    backgroundColor: mergeMode === 'replace' ? 'rgba(0, 217, 255, 0.08)' : 'var(--bg-1)',
                    color: mergeMode === 'replace' ? 'var(--accent)' : 'var(--fg-1)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Replace Active Audio Track
                </button>
                <button
                  type="button"
                  onClick={() => setMergeMode('secondary')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid',
                    borderColor: mergeMode === 'secondary' ? 'var(--accent)' : 'var(--line)',
                    backgroundColor: mergeMode === 'secondary' ? 'rgba(0, 217, 255, 0.08)' : 'var(--bg-1)',
                    color: mergeMode === 'secondary' ? 'var(--accent)' : 'var(--fg-1)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add as Secondary Language Track
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Output folder & Target container selection */}
        <Card title="Target Container & Output Path">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Select
                label="Output Container"
                value={container}
                onChange={setContainer}
                options={[
                  { value: 'mp4', label: 'MP4 (.mp4)' },
                  { value: 'mkv', label: 'MKV (.mkv)' },
                  { value: 'webm', label: 'WebM (.webm)' },
                ]}
                style={{ width: '150px' }}
              />
              <Input
                label="Output Folder Path"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom merging start CTA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-2)' }}>
        <Button
          variant="primary"
          size="lg"
          onClick={handleStartMerge}
          disabled={dockStatus === 'processing'}
          icon={
            <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          ▸ Start Merging soundtrack
        </Button>
      </div>

      {/* Logs and Progress docking bars */}
      {showLogs && (
        <div className="animate-fade-in" style={{ marginTop: 'var(--spacing-4)' }}>
          <LogViewer logs={logs} onClear={clearLogs} onExport={() => navigator.clipboard.writeText(logs.join('\n'))} />
        </div>
      )}

      <ProgressDock
        status={dockStatus}
        totalFiles={1}
        processedFiles={dockStatus === 'completed' ? 1 : 0}
        activeFileName={activeFileName}
        percentComplete={percentComplete}
        stats={dockStats}
        onCancel={resetQueue}
        showLogs={showLogs}
        onToggleLogs={() => setShowLogs(!showLogs)}
      />
    </div>
  )
}
