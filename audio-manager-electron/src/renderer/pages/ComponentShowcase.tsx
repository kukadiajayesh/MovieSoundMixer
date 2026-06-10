import React, { useState } from 'react'
import { Button } from '../components/buttons/Button'
import { Input } from '../components/forms/Input'
import { Select } from '../components/forms/Select'
import { Card } from '../components/layout/Card'
import { Divider } from '../components/layout/Divider'
import { Toolbar, ToolbarGroup } from '../components/layout/Toolbar'
import { Modal } from '../components/overlays/Modal'
import { ToastContainer } from '../components/overlays/Toast'
import { StatusIndicator } from '../components/indicators/StatusIndicator'
import { StatusBadge } from '../components/indicators/StatusBadge'
import { ProgressBar } from '../components/indicators/ProgressBar'
import { Spinner } from '../components/indicators/Spinner'
import { DropZone } from '../components/overlays/DropZone'
import { FormatSelector, AudioFormat } from '../components/specialized/FormatSelector'
import { StreamSelector } from '../components/specialized/StreamSelector'
import { FileTable, FileEntry } from '../components/specialized/FileTable'
import { ProgressDock } from '../components/specialized/ProgressDock'
import { LogViewer } from '../components/specialized/LogViewer'

export const ComponentShowcase: React.FC = () => {
  // Theme Switching state check (loaded via our standard useTheme inside sidebar/app, so here we just view)

  // Base State
  const [inputText, setInputText] = useState('')
  const [selectValue, setSelectValue] = useState('val-1')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>>([])

  // Specialized State
  const [activeFormat, setActiveFormat] = useState<AudioFormat>('copy')
  const [selectedStreamIdx, setSelectedStreamIdx] = useState(1)

  // File Table state
  const [files, setFiles] = useState<FileEntry[]>([
    {
      id: 'file-1',
      name: 'summer_vacation_vlog.mp4',
      path: '/Users/vlogs/summer_vacation_vlog.mp4',
      size: 45281900,
      streams: [
        { index: 1, language: 'eng', codec: 'aac', channels: 2 },
        { index: 2, language: 'spa', codec: 'ac3', channels: 6 },
      ],
      selectedStreamIndex: 1,
      status: 'ready',
    },
    {
      id: 'file-2',
      name: 'guitar_tutorial_recording.mov',
      path: '/Users/music/guitar_tutorial_recording.mov',
      size: 157281000,
      streams: [
        { index: 1, codec: 'pcm_s16le', channels: 2 },
      ],
      selectedStreamIndex: 1,
      status: 'ready',
    },
  ])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(['file-1'])

  // Mock batch conversion progress state
  const [dockStatus, setDockStatus] = useState<'idle' | 'processing' | 'paused' | 'completed' | 'failed'>('idle')
  const [processedFilesCount, setProcessedFilesCount] = useState(0)
  const [overallProgress, setOverallProgress] = useState(0)
  const [activeFileName, setActiveFileName] = useState('')
  const [dockStats, setDockStats] = useState({ queued: 0, active: 0, completed: 0, failed: 0 })
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)

  // Handler helpers
  const triggerToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newToast = { id: Math.random().toString(), message, type }
    setToasts((prev) => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const handleFilesDropped = (droppedFiles: File[]) => {
    droppedFiles.forEach((f) => {
      const newFile: FileEntry = {
        id: `dropped-${Math.random()}`,
        name: f.name,
        path: (f as any).path || `C:/User/Downloads/${f.name}`,
        size: f.size,
        streams: [
          { index: 1, language: 'eng', codec: 'aac', channels: 2 },
        ],
        selectedStreamIndex: 1,
        status: 'ready',
      }
      setFiles((prev) => [...prev, newFile])
    })
    triggerToast(`Imported ${droppedFiles.length} file(s) successfully!`, 'success')
  }

  const handleToggleSelect = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([])
    } else {
      setSelectedFileIds(files.map((f) => f.id))
    }
  }

  const handleStreamChange = (id: string, streamIdx: number) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selectedStreamIndex: streamIdx } : f))
    )
    triggerToast(`Stream updated for file ${id}!`, 'info')
  }

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setSelectedFileIds((prev) => prev.filter((fid) => fid !== id))
    triggerToast('File removed from queue.', 'warning')
  }

  // Real-time Mock processing runner
  const startMockProcessing = () => {
    if (files.length === 0) {
      triggerToast('Please add at least one file to run the progress dock!', 'error')
      return
    }

    setLogs([])
    setShowLogs(true)
    setDockStatus('processing')
    setProcessedFilesCount(0)
    setOverallProgress(0)
    setDockStats({ queued: files.length, active: 1, completed: 0, failed: 0 })

    // Reset file statuses
    setFiles((prev) => prev.map((f) => ({ ...f, status: 'ready', statusText: undefined })))

    const logMessages = [
      'Initializing FFmpeg core...',
      'Hardware acceleration: NVIDIA NVENC detected.',
      'Checking file read permissions...',
      'Spawning process worker threads (count: 4)...',
    ]

    // Load initial logs
    logMessages.forEach((m, i) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, `[2026-05-23 00:00:${i + 10}] ${m}`])
      }, i * 250)
    })

    // Process file index 0
    setTimeout(() => {
      setActiveFileName(files[0].name)
      setFiles((prev) =>
        prev.map((f, idx) => (idx === 0 ? { ...f, status: 'processing' } : f))
      )
      setLogs((prev) => [
        ...prev,
        `[2026-05-23 00:00:15] [JOB-1] Starting audio extraction for ${files[0].name}`,
        `[2026-05-23 00:00:16] [JOB-1] command: ffmpeg -y -i "${files[0].path}" -map 0:a:${files[0].selectedStreamIndex - 1} -c:a libmp3lame -q:a 2 "output_01.mp3"`,
      ])
      setDockStats({ queued: files.length - 1, active: 1, completed: 0, failed: 0 })
    }, 1200)

    // Progress updates
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setOverallProgress(progress)

      if (progress === 30) {
        setLogs((prev) => [...prev, '[2026-05-23 00:00:18] [JOB-1] Frame copy 35% complete. bitrate=192kbps'])
      } else if (progress === 50) {
        // Complete file 0, start file 1 if exists
        setFiles((prev) =>
          prev.map((f, idx) => (idx === 0 ? { ...f, status: 'success', statusText: 'Extracted' } : f))
        )
        setProcessedFilesCount(1)
        setDockStats((prev) => ({ ...prev, active: files.length > 1 ? 1 : 0, completed: 1, queued: Math.max(0, prev.queued - 1) }))
        setLogs((prev) => [
          ...prev,
          `[2026-05-23 00:00:20] [JOB-1] Audio track extracted successfully. File written to output_01.mp3`,
        ])

        if (files.length > 1) {
          setActiveFileName(files[1].name)
          setFiles((prev) =>
            prev.map((f, idx) => (idx === 1 ? { ...f, status: 'processing' } : f))
          )
          setLogs((prev) => [
            ...prev,
            `[2026-05-23 00:00:21] [JOB-2] Starting audio extraction for ${files[1].name}`,
            `[2026-05-23 00:00:21] [JOB-2] command: ffmpeg -y -i "${files[1].path}" -map 0:a:${files[1].selectedStreamIndex - 1} -c:a copy "output_02.mp3"`,
          ])
        }
      } else if (progress === 80) {
        if (files.length > 1) {
          setLogs((prev) => [...prev, '[2026-05-23 00:00:24] [JOB-2] Stream copy complete. Frame size verified.'])
        }
      } else if (progress >= 100) {
        clearInterval(interval)
        setFiles((prev) =>
          prev.map((f, idx) => {
            if (idx === 1) return { ...f, status: 'success', statusText: 'Extracted' }
            return f
          })
        )
        setProcessedFilesCount(files.length)
        setDockStatus('completed')
        setDockStats({ queued: 0, active: 0, completed: files.length, failed: 0 })
        setLogs((prev) => [
          ...prev,
          '[2026-05-23 00:00:26] Batch conversion queue finished. Total execution time: 14.5 seconds.',
          '[2026-05-23 00:00:26] All worker threads terminated cleanly.',
        ])
        triggerToast('All audio extractions completed successfully!', 'success')
      }
    }, 800)
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Toast Notifications Box */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Intro Toolbar */}
      <Toolbar>
        <ToolbarGroup>
          <span style={{ fontSize: '13px', color: 'var(--fg-1)', fontWeight: 600 }}>Interactive UI Playground</span>
          <Divider orientation="vertical" margin="0 8px" />
          <Button variant="primary" size="sm" onClick={() => triggerToast('Playground toast triggered!', 'info')}>
            Test Toast
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
            Open Test Modal
          </Button>
        </ToolbarGroup>
        <ToolbarGroup>
          <span style={{ fontSize: '12px', color: 'var(--fg-2)' }}>Verify design tokens spacing & alignment</span>
        </ToolbarGroup>
      </Toolbar>

      {/* Section 1: Buttons and Forms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--spacing-6)' }}>
        <Card title="Base Buttons">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {/* Button Sizes */}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
              <Button size="sm">Small size</Button>
              <Button size="md">Medium size</Button>
              <Button size="lg">Large size</Button>
            </div>

            {/* Button Variants */}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
              <Button variant="primary">Primary button</Button>
              <Button variant="ghost">Ghost button</Button>
              <Button variant="danger">Danger button</Button>
            </div>

            {/* Icons & Loading States */}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
              <Button
                variant="primary"
                icon={
                  <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                }
              >
                Forward Icon
              </Button>
              <Button
                variant="ghost"
                iconPosition="right"
                icon={
                  <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                }
              >
                Back Icon
              </Button>
              <Button variant="primary" isLoading>
                Loading Mode
              </Button>
              <Button variant="ghost" disabled>
                Disabled Button
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Forms & Dropdowns">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
              <Input
                label="Standard TextInput"
                placeholder="Type something..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Input
                label="Error Input state"
                placeholder="This input is errored..."
                error="Value is invalid"
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
              <Input
                label="Monospace display input"
                placeholder="Console commands..."
                mono
                value="ffmpeg -i video.mp4 -f mp3"
                readOnly
              />
              <Select
                label="Custom Menu Select"
                value={selectValue}
                onChange={setSelectValue}
                options={[
                  { value: 'val-1', label: 'Option A (Stereo Mix)' },
                  { value: 'val-2', label: 'Option B (Dolby 5.1 Surround)' },
                  { value: 'val-3', label: 'Option C (Mono Feed)' },
                ]}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Section 2: Indicators and Badges */}
      <Card title="Badges, Spinners, and Progress Lines">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {/* Status dots & solid colorful pills */}
          <div style={{ display: 'flex', gap: 'var(--spacing-5)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <StatusIndicator status="ok" label="FFmpeg status OK" />
              <StatusIndicator status="warn" label="Optional dependency warning" />
              <StatusIndicator status="error" label="Failed connection state" />
              <StatusIndicator status="inactive" label="GPU off state" />
            </div>

            <Divider orientation="vertical" margin="0 8px" />

            <div style={{ display: 'flex', gap: '8px' }}>
              <StatusBadge status="ok">SUCCESS</StatusBadge>
              <StatusBadge status="warn">PENDING</StatusBadge>
              <StatusBadge status="error">FAILED</StatusBadge>
              <StatusBadge status="accent">PROCESSING</StatusBadge>
            </div>

            <Divider orientation="vertical" margin="0 8px" />

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          </div>

          <Divider orientation="horizontal" margin="8px 0" />

          {/* Determinate / Indeterminate loaders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--fg-2)', fontWeight: 600 }}>DETERMINATE PROGRESS LINE (65%)</span>
              <ProgressBar value={65} showPercentage height="8px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--fg-2)', fontWeight: 600 }}>INDETERMINATE PULSING LOADER</span>
              <ProgressBar indeterminate height="8px" />
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: Specialized Elements */}
      <Card title="Specialized Audio Components">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
          {/* Drag & drop Zone */}
          <DropZone onFilesDropped={handleFilesDropped} />

          {/* Selector Components */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--spacing-6)', alignItems: 'flex-start' }}>
            <FormatSelector value={activeFormat} onChange={setActiveFormat} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-1)' }}>Stream selector dropdown</span>
              <StreamSelector
                streams={[
                  { index: 1, language: 'eng', codec: 'aac', channels: 2 },
                  { index: 2, language: 'spa', codec: 'ac3', channels: 6 },
                  { index: 3, language: 'fre', codec: 'flac', channels: 2 },
                ]}
                value={selectedStreamIdx}
                onChange={setSelectedStreamIdx}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Section 4: Complex Interactive Files Management Table & Real-time queue simulations */}
      <Card
        title="Interactive Process Queue Simulator"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={startMockProcessing}
            disabled={dockStatus === 'processing'}
            icon={
              <svg style={{ width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            }
          >
            Start Conversion Demo
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <p style={{ fontSize: '12px', color: 'var(--fg-2)', margin: 0 }}>
            Click "Start Conversion Demo" in the top right to simulate real-time parallel audio stream extraction with live-updated indicators, statistics, progress bars, and shell logs inside the ProgressDock and LogViewer below! You can also drag files directly into the dropzone above to populate this list dynamically.
          </p>
          <FileTable
            files={files}
            selectedIds={selectedFileIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onStreamChange={handleStreamChange}
            onRemoveFile={handleRemoveFile}
          />
        </div>
      </Card>

      {/* Conditional Terminal log viewer inside the main body if expanded */}
      {showLogs && (
        <div className="animate-fade-in" style={{ marginTop: '-4px' }}>
          <LogViewer logs={logs} onClear={() => setLogs([])} onExport={() => navigator.clipboard.writeText(logs.join('\n'))} />
        </div>
      )}

      {/* Bottom Floating Progress Dock */}
      <ProgressDock
        status={dockStatus}
        totalFiles={files.length}
        processedFiles={processedFilesCount}
        activeFileName={activeFileName}
        percentComplete={overallProgress}
        stats={dockStats}
        onCancel={() => {
          setDockStatus('idle')
          setFiles((prev) => prev.map((f) => ({ ...f, status: 'ready', statusText: undefined })))
        }}
        showLogs={showLogs}
        onToggleLogs={() => setShowLogs((prev) => !prev)}
      />

      {/* Test Modal Overlay */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Settings & Configurations (Mock Modal)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} style={{ marginRight: '8px' }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => { setIsModalOpen(false); triggerToast('Configurations saved!', 'success'); }}>
              Save Settings
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>This is a custom reusable overlay modal dialog styled with design system tokens and supporting fully fluid animations.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>Hardware Encoder Threads</span>
            <Input type="number" defaultValue="4" style={{ width: '80px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="gpu-chk" defaultChecked style={{ cursor: 'pointer' }} />
            <label htmlFor="gpu-chk" style={{ cursor: 'pointer' }}>Use GPU Encoders if available</label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
