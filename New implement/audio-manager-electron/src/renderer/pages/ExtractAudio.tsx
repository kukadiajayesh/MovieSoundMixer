import React, { useState } from 'react'
import { useFileStore } from '../stores/fileStore'
import { useJobStore } from '../stores/jobStore'
import { DropZone } from '../components/overlays/DropZone'
import { FileTable } from '../components/specialized/FileTable'
import { Toolbar, ToolbarGroup } from '../components/layout/Toolbar'
import { Button } from '../components/buttons/Button'
import { Card } from '../components/layout/Card'
import { Input } from '../components/forms/Input'
import { FormatSelector, AudioFormat } from '../components/specialized/FormatSelector'
import { ProgressDock } from '../components/specialized/ProgressDock'
import { LogViewer } from '../components/specialized/LogViewer'
import { Divider } from '../components/layout/Divider'
import { ToastContainer } from '../components/overlays/Toast'

export const ExtractAudio: React.FC = () => {
  // Store Subscriptions
  const {
    files,
    selectedIds,
    searchQuery,
    addFiles,
    removeFiles,
    toggleSelect,
    toggleSelectAll,
    updateStreamIndex,
    updateFileStatus,
    setSearchQuery,
    clearFiles,
  } = useFileStore()

  const {
    status: dockStatus,
    totalFiles,
    processedFiles: processedFilesCount,
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

  // Local State
  const [outputFolder, setOutputFolder] = useState('C:/Users/Downloads/Audio_Extracted')
  const [activeFormat, setActiveFormat] = useState<AudioFormat>('copy')
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>>([])

  // Toast Helpers
  const triggerToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newToast = { id: Math.random().toString(), message, type }
    setToasts((prev) => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Handle Mock Folder Browse
  const handleBrowseFolder = async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const result = await window.electron.ipcRenderer.invoke('browse-folder')
        if (result && !result.canceled && result.filePath) {
          setOutputFolder(result.filePath)
          triggerToast('Output directory updated!', 'success')
        }
      } catch (err) {
        // Fallback mock
        setOutputFolder('C:/Users/Downloads/Audio_Extracted/Custom_Browse')
        triggerToast('Browsed folder mock applied!', 'info')
      }
    } else {
      setOutputFolder('C:/Users/Downloads/Audio_Extracted/Custom_Browse')
      triggerToast('Folder selection simulated!', 'info')
    }
  }

  // Handle Drop Files Ingestion
  const handleFilesDropped = async (droppedFiles: File[]) => {
    const formattedFiles: any[] = []

    for (const f of droppedFiles) {
      const filePath = (f as any).path || `C:/User/Downloads/${f.name}`
      let duration = 0
      let streams: any[] = []

      if (window.electron?.ipcRenderer) {
        try {
          const res = await window.electron.ipcRenderer.invoke('probe-streams', filePath)
          if (res && res.success) {
            duration = res.duration
            streams = res.streams
          }
        } catch (err) {
          console.error('Failed to probe file stream on backend:', err)
        }
      }

      // If probing returned no audio tracks, add a fallback stereo track
      if (streams.length === 0) {
        streams = [{ index: 1, codec: 'aac', channels: 2 }]
      }

      formattedFiles.push({
        name: f.name,
        path: filePath,
        size: f.size,
        duration,
        streams,
      })
    }

    addFiles(formattedFiles)
    triggerToast(`Imported ${droppedFiles.length} file(s) into queue.`, 'success')
  }

  // Handle Toolbar Native File Dialog selection
  const handleBrowseFiles = async () => {
    if (window.electron?.ipcRenderer) {
      try {
        const res = await window.electron.ipcRenderer.invoke('open-file-dialog')
        if (res && !res.canceled && res.filePaths.length > 0) {
          const fileObjects = res.filePaths.map((fp: string) => {
            const name = fp.substring(fp.lastIndexOf(fp.includes('\\') ? '\\' : '/') + 1)
            return {
              name,
              path: fp,
              size: 15 * 1024 * 1024, // placeholder size
            } as unknown as File
          })
          handleFilesDropped(fileObjects)
        }
      } catch (err) {
        console.error('Failed to open file browser on backend:', err)
      }
    } else {
      triggerToast('Native file browse is only supported inside Electron frame.', 'warning')
    }
  }

  const handleRemoveFile = (id: string) => {
    removeFiles([id])
    triggerToast('File removed from queue.', 'warning')
  }

  // Filter visible files by search query
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Start Extraction Queue Run
  const handleStartExtraction = async () => {
    if (selectedIds.length === 0) {
      triggerToast('Please select at least one file from the table to extract!', 'error')
      return
    }

    const firstSelectedFile = files.find((f) => selectedIds.includes(f.id))!
    startQueue(selectedIds.length, firstSelectedFile.name)
    clearLogs()

    addLog('FFmpeg static background queue initiated...')
    addLog(`Save Folder destination: ${outputFolder}`)
    addLog(`Target Audio Format: ${activeFormat.toUpperCase()}`)

    if (window.electron?.ipcRenderer) {
      const selectedFilesToProcess = files.filter((f) => selectedIds.includes(f.id))

      for (const f of selectedFilesToProcess) {
        try {
          updateFileStatus(f.id, 'ready')
          await window.electron.ipcRenderer.invoke('start-extraction', {
            id: f.id,
            inputPath: f.path,
            outFolder: outputFolder,
            format: activeFormat,
            streamIdx: f.selectedStreamIndex,
            duration: f.duration || 0,
          })
        } catch (err: any) {
          console.error('Failed to trigger background extraction:', err)
          updateFileStatus(f.id, 'error', 'Failed')
          addLog(`[ERROR] Failed to spawn ffmpeg for ${f.name}: ${err.message}`)
        }
      }
    } else {
      triggerToast('Transcoding on disk is only supported inside Electron frame.', 'warning')
    }
  }

  return (
    <div className="page-container animate-fade-in">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* File Ingestion Dropzone */}
      <DropZone onFilesDropped={handleFilesDropped} />

      {/* Table Toolbar */}
      <Toolbar>
        <ToolbarGroup>
          <Button variant="primary" size="sm" onClick={handleBrowseFiles}>
            Add Video Files...
          </Button>
          <Divider orientation="vertical" margin="0 8px" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg-1)' }}>
            Imported queue: {files.length} files
          </span>
          <Divider orientation="vertical" margin="0 8px" />
          <Button
            variant="ghost"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => {
              removeFiles(selectedIds)
              triggerToast('Selected files removed.', 'warning')
            }}
          >
            Remove Selected ({selectedIds.length})
          </Button>
          <Button variant="ghost" size="sm" disabled={files.length === 0} onClick={clearFiles}>
            Clear Queue
          </Button>
        </ToolbarGroup>
        <ToolbarGroup>
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '200px', height: '32px', padding: '4px 8px' }}
          />
        </ToolbarGroup>
      </Toolbar>

      {/* File Table */}
      <FileTable
        files={filteredFiles}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onStreamChange={updateStreamIndex}
        onRemoveFile={handleRemoveFile}
      />

      {/* Output directory folder and audio formats card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)', alignItems: 'flex-start' }}>
        <Card title="Output Configurations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%' }}>
              <Input
                label="Save Folder Directory"
                value={outputFolder}
                onChange={(e) => setOutputFolder(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button variant="ghost" size="md" onClick={handleBrowseFolder} style={{ height: '38px' }}>
                Browse...
              </Button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--fg-2)', margin: 0 }}>
              Specify absolute storage paths. Defaults to standard Downloads directory.
            </p>
          </div>
        </Card>

        <Card title="Target Codec Selection">
          <FormatSelector value={activeFormat} onChange={setActiveFormat} label="" />
        </Card>
      </div>

      {/* Footer Run Actions Card */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-2)' }}>
        <Button
          variant="primary"
          size="lg"
          onClick={handleStartExtraction}
          disabled={dockStatus === 'processing'}
          icon={
            <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          }
        >
          ▸ Start Audio Extraction
        </Button>
      </div>

      {/* Expanded terminal panel */}
      {showLogs && (
        <div className="animate-fade-in" style={{ marginTop: 'var(--spacing-4)' }}>
          <LogViewer logs={logs} onClear={clearLogs} onExport={() => navigator.clipboard.writeText(logs.join('\n'))} />
        </div>
      )}

      {/* Floating progress docking bar */}
      <ProgressDock
        status={dockStatus}
        totalFiles={totalFiles}
        processedFiles={processedFilesCount}
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
