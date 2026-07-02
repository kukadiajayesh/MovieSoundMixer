import React, { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useFileStore, FileEntry } from '../stores/fileStore'
import { useJobStore, selectOverall } from '../stores/jobStore'
import { useSettingsStore } from '../stores/settingsStore'
import { Icon } from '../components/design/Icon'
import { Dropzone } from '../components/design/Dropzone'
import { RunFooter } from '../components/design/RunFooter'
import { StatusCell, RowStatus } from '../components/design/StatusCell'
import { StreamPicker } from '../components/design/StreamPicker'
import { useToast } from '../components/design/Toasts'

type AudioFormat = 'copy' | 'mp3' | 'aac' | 'flac'

const FORMATS: AudioFormat[] = ['copy', 'mp3', 'aac', 'flac']
const VIDEO_EXTS = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'm4v', '3gp', 'ts', 'm2ts']

const fileExt = (name: string) => (name.split('.').pop() || '').toLowerCase()
const baseName = (name: string) => name.replace(/\.[^.]+$/, '')
const dirName = (fp: string) => {
  const sep = fp.includes('\\') ? '\\' : '/'
  const idx = fp.lastIndexOf(sep)
  return idx >= 0 ? { dir: fp.slice(0, idx), sep } : null
}
const parseEpisodeTag = (name: string) => {
  const m = name.match(/S(\d{1,2})\s*E(\d{1,3})/i)
  return m ? `S${m[1].padStart(2, '0')}E${m[2].padStart(2, '0')}` : null
}

const fmtSize = (bytes: number) => {
  if (!bytes) return '—'
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const toRowStatus = (status: FileEntry['status']): RowStatus => {
  switch (status) {
    case 'probing':
      return 'probing'
    case 'processing':
      return 'running'
    case 'success':
      return 'done'
    case 'error':
      return 'error'
    default:
      return 'ready'
  }
}

export const ExtractAudio: React.FC = () => {
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

  const running = useJobStore((s) => s.running)
  const overall = useJobStore(useShallow(selectOverall))
  const jobs = useJobStore((s) => s.jobs)

  const { outputDirectory, defaultFormat, updateSetting } = useSettingsStore()
  const [outputDir, setOutputDir] = useState(outputDirectory)
  const [format, setFormat] = useState<AudioFormat>(
    FORMATS.includes(defaultFormat as AudioFormat) ? (defaultFormat as AudioFormat) : 'copy',
  )
  const [picker, setPicker] = useState<{ file: FileEntry; anchor: HTMLElement } | null>(null)
  const toast = useToast()

  const filtered = useMemo(
    () => files.filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [files, searchQuery],
  )

  const readyCount = files.filter((f) => f.status === 'ready' || f.status === 'success').length

  // ── File ingestion ────────────────────────────────────────────────
  const ingestPaths = async (paths: Array<{ path: string; size?: number }>) => {
    const wasEmpty = files.length === 0
    const entries: Array<{ name: string; path: string; size: number; duration: number; streams: any[] }> = []

    for (const { path: fp, size } of paths) {
      const name = fp.substring(fp.lastIndexOf(fp.includes('\\') ? '\\' : '/') + 1)
      let duration = 0
      let streams: any[] = []
      let fileSize = size ?? 0

      if (window.electron?.ipcRenderer) {
        try {
          const res = await window.electron.ipcRenderer.invoke('probe-streams', fp)
          if (res?.success) {
            duration = res.duration
            streams = res.streams
          }
        } catch (err) {
          console.error('Failed to probe file:', err)
        }
        if (!fileSize) {
          try {
            const props = await window.electron.ipcRenderer.invoke('get-file-properties', fp)
            if (props?.exists) fileSize = props.size
          } catch {
            /* size stays unknown */
          }
        }
      }

      if (streams.length === 0) {
        // No detectable audio — still list it so the user sees why it can't run
        streams = [{ index: 0, codec: 'unknown', channels: 2 }]
      }

      entries.push({ name, path: fp, size: fileSize, duration, streams })
    }

    if (entries.length > 0) {
      addFiles(entries)
      if (wasEmpty) {
        const loc = dirName(entries[0].path)
        if (loc) setOutputDir(`${loc.dir}${loc.sep}extracted_audio`)
      }
      toast({ kind: 'ok', title: `Added ${entries.length} file${entries.length !== 1 ? 's' : ''}` })
    }
  }

  const handleDropFiles = async (dropped: File[]) => {
    const paths = dropped
      .map((f) => ({
        path: window.electron?.getPathForFile?.(f) || (f as any).path || '',
        size: f.size,
      }))
      .filter((p) => p.path)
    if (paths.length === 0) {
      toast({ kind: 'error', title: 'Could not resolve dropped file paths' })
      return
    }
    await ingestPaths(paths)
  }

  const handleAddFiles = async () => {
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'File dialogs require the Electron shell' })
      return
    }
    const res = await window.electron.ipcRenderer.invoke('open-file-dialog')
    if (res && !res.canceled && res.filePaths.length > 0) {
      await ingestPaths(res.filePaths.map((fp: string) => ({ path: fp })))
    }
  }

  const handleAddFolder = async () => {
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'File dialogs require the Electron shell' })
      return
    }
    const res = await window.electron.ipcRenderer.invoke('open-folder-dialog', VIDEO_EXTS)
    if (!res || res.canceled) return
    if (res.filePaths.length === 0) {
      toast({ kind: 'info', title: 'No video files found in that folder' })
      return
    }
    await ingestPaths(res.filePaths.map((fp: string) => ({ path: fp })))
  }

  const handleBrowseOutput = async () => {
    if (!window.electron?.ipcRenderer) return
    const result = await window.electron.ipcRenderer.invoke('browse-folder')
    if (result && !result.canceled && result.filePath) {
      setOutputDir(result.filePath)
    }
  }

  // ── Run / stop ────────────────────────────────────────────────────
  const handleRun = async () => {
    const targets = files.filter((f) =>
      selectedIds.length > 0 ? selectedIds.includes(f.id) : f.status !== 'processing',
    )
    if (targets.length === 0) return

    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'Extraction requires the Electron shell' })
      return
    }

    // Persist preferences for next launch
    updateSetting('output_directory', outputDir)
    updateSetting('default_format', format)

    // Extract has no batch control of its own; run at the queue's default
    // parallelism so a prior Merge run can't leave it stuck sequential.
    await window.electron.ipcRenderer.invoke('set-concurrency', 2).catch(() => {})

    useJobStore.getState().startRun(targets.map((f) => ({ id: f.id, name: f.name })))
    useJobStore.getState().addLog(`Started extract job: ${targets.length} file(s) → ${format.toUpperCase()}`)

    for (const f of targets) {
      // FFmpeg maps audio by ordinal (0:a:N) — translate the absolute stream index
      const ordinal = Math.max(
        0,
        f.streams.findIndex((s) => s.index === f.selectedStreamIndex),
      )
      try {
        const res = await window.electron.ipcRenderer.invoke('start-extraction', {
          id: f.id,
          inputPath: f.path,
          outFolder: outputDir,
          format,
          streamIdx: ordinal,
          duration: f.duration || 0,
        })
        if (!res?.success) {
          updateFileStatus(f.id, 'error', res?.error || 'Failed to enqueue')
          useJobStore.getState().finishJob(f.id, false)
          useJobStore.getState().addLog(`${f.name}: ${res?.error || 'failed to enqueue'}`, 'error')
        }
      } catch (err: any) {
        updateFileStatus(f.id, 'error', 'Failed')
        useJobStore.getState().finishJob(f.id, false)
        useJobStore.getState().addLog(`Failed to start ${f.name}: ${err.message}`, 'error')
      }
    }
  }

  const handleStop = async () => {
    if (window.electron?.ipcRenderer) {
      for (const j of jobs) {
        if (j.progress < 1) {
          await window.electron.ipcRenderer.invoke('cancel-job', j.id).catch(() => {})
        }
      }
    }
    useJobStore.getState().stopRun()
    useJobStore.getState().addLog('Cancelled by user', 'warn')
  }

  const openOutput = async (outputPath: string) => {
    if (!window.electron?.ipcRenderer) return
    const res = await window.electron.ipcRenderer.invoke('open-path', outputPath).catch(() => null)
    if (res && !res.success) {
      toast({ kind: 'error', title: 'Could not open file', desc: res.error })
    }
  }

  const removeSelected = () => {
    const count = selectedIds.length
    removeFiles(selectedIds)
    toast({ kind: 'info', title: 'Removed', desc: `${count} file(s) removed from queue` })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="ph-title">Extract Audio</h1>
          <p className="ph-sub">Probe video files, pick a stream, save audio as a standalone file.</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-ghost" onClick={clearFiles} disabled={files.length === 0 || running}>
            <Icon name="trash" />
            Clear
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <Dropzone
          title="Drop video files here"
          sub="Or use the buttons — supports MKV, MP4, AVI, MOV, TS, M2TS"
          onAddFiles={handleAddFiles}
          onAddFolder={handleAddFolder}
          onDropFiles={handleDropFiles}
        />
      ) : (
        !running && (
          <Dropzone
            slim
            title="Drag more files anywhere"
            sub={`${files.length} file${files.length !== 1 ? 's' : ''} loaded · drop to add`}
            onAddFiles={handleAddFiles}
            onAddFolder={handleAddFolder}
            onDropFiles={handleDropFiles}
          />
        )
      )}

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            placeholder="Search files…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sep" />
        <button className="btn btn-sm" disabled={selectedIds.length === 0} onClick={removeSelected}>
          <Icon name="trash" />
          Remove ({selectedIds.length})
        </button>
        <div className="spacer" />
        <span className="chip-counter">
          {readyCount}/{files.length} ready
        </span>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  checked={files.length > 0 && selectedIds.length === files.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="col-idx">#</th>
              <th className="col-name">File</th>
              <th className="col-meta">Size</th>
              <th className="col-stream">Stream</th>
              <th className="col-status">Status</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const picked = row.streams.find((s) => s.index === row.selectedStreamIndex)
              const ep = parseEpisodeTag(row.name)
              return (
                <tr key={row.id} className={selectedIds.includes(row.id) ? 'sel' : ''}>
                  <td className="col-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelect(row.id)}
                    />
                  </td>
                  <td className="col-idx">{i + 1}</td>
                  <td className="col-name">
                    <div className={`fname ext-${fileExt(row.name)}`}>
                      <span className="ext">{fileExt(row.name)}</span>
                      <span className="label">{baseName(row.name)}</span>
                      {ep && <span className="ep">{ep}</span>}
                    </div>
                  </td>
                  <td className="col-meta">{fmtSize(row.size)}</td>
                  <td className="col-stream">
                    {picked ? (
                      <span className="stream-pick" onClick={(e) => setPicker({ file: row, anchor: e.currentTarget })}>
                        <span className="badge">{picked.codec.toUpperCase()}</span>
                        {picked.language && <span className="lang">{picked.language.toUpperCase()}</span>}
                        <span className="ch">{picked.channels}ch</span>
                        <Icon name="chevron" className="caret" />
                      </span>
                    ) : (
                      <span style={{ color: 'var(--fg-4)', fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td className="col-status">
                    <StatusCell status={toRowStatus(row.status)} progress={row.progress} error={row.statusText} />
                  </td>
                  <td className="col-actions">
                    {row.status === 'success' && row.outputPath && (
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Open extracted file"
                        onClick={() => openOutput(row.outputPath!)}
                      >
                        <Icon name="play" />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => removeFiles([row.id])}>
                      <Icon name="close" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {files.length === 0 && (
          <div className="empty">
            <Icon name="waveform" />
            <p className="title">No files loaded</p>
            <p className="sub">Drop video files above or click “Add files” to start building the extract queue.</p>
          </div>
        )}
      </div>

      {picker && (
        <StreamPicker
          streams={picker.file.streams}
          pickedIndex={picker.file.selectedStreamIndex}
          anchor={picker.anchor}
          onPick={(index) => updateStreamIndex(picker.file.id, index)}
          onClose={() => setPicker(null)}
        />
      )}

      <RunFooter
        outputDir={outputDir}
        setOutputDir={setOutputDir}
        onBrowse={handleBrowseOutput}
        running={running}
        onRun={handleRun}
        onStop={handleStop}
        overall={overall}
        runLabel="Extract Audio"
        canRun={files.length > 0}
      >
        <div className="seg" title="Output audio format">
          {FORMATS.map((f) => (
            <button key={f} className={format === f ? 'on' : ''} onClick={() => setFormat(f)}>
              {f === 'copy' ? 'Copy' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </RunFooter>
    </>
  )
}
