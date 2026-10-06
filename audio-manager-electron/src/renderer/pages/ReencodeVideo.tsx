import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { MergeSource, VIDEO_EXTS } from '../stores/mergeStore'
import { useReencodeStore, ReencodeItem } from '../stores/reencodeStore'
import { useJobStore, selectOverall } from '../stores/jobStore'
import { probeSource, fileNameOf } from '../lib/probeSource'
import { Icon } from '../components/design/Icon'
import { Dropzone } from '../components/design/Dropzone'
import { ReencodeRow } from '../components/design/ReencodeRow'
import { RunFooter } from '../components/design/RunFooter'
import { ThemeToggle } from '../components/design/ThemeToggle'
import { EncodePanel, Quality, QUALITY_LABEL, ReencodeContainer } from '../components/design/EncodePanel'
import { useToast } from '../components/design/Toasts'
import appLogo from '../../../assets/icon.png'

const CONTAINERS: Array<{ id: ReencodeContainer; label: string }> = [
  { id: 'source', label: 'Same' },
  { id: 'mkv', label: 'MKV' },
  { id: 'mp4', label: 'MP4' },
  { id: 'webm', label: 'WebM' },
]

const CPU_ENCODER_LABELS: Record<string, string> = {
  libx264: 'CPU H.264 (libx264)',
  libx265: 'CPU H.265 (libx265) — keeps 10-bit/HDR',
}

const parentDir = (fp: string) => {
  const sep = fp.includes('\\') ? '\\' : '/'
  const idx = fp.lastIndexOf(sep)
  return idx >= 0 ? { dir: fp.slice(0, idx), sep } : null
}

// Re-encode Video: pick target videos and re-encode only their video stream
// (GPU or CPU), copying every audio and subtitle track. No audio file needed.
export const ReencodeVideo: React.FC = () => {
  const { items, addVideos, clear } = useReencodeStore()
  const running = useJobStore((s) => s.running)
  const overall = useJobStore(useShallow(selectOverall))
  const jobs = useJobStore((s) => s.jobs)
  const toast = useToast()

  const [outputDir, setOutputDir] = useState('')
  const [container, setContainer] = useState<ReencodeContainer>('source')
  const [quality, setQuality] = useState<Quality>('balanced')
  const [encoder, setEncoder] = useState('auto')
  const [gpuEncoders, setGpuEncoders] = useState<string[]>([])
  const [tenBitEncoders, setTenBitEncoders] = useState<string[]>([])
  const [cpuEncoders, setCpuEncoders] = useState<string[]>(['libx264', 'libx265'])
  const [testId, setTestId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    window.electron?.ipcRenderer
      ?.invoke('get-dependency-status')
      .then((d) => {
        setGpuEncoders(d?.gpuInfo?.available ?? [])
        setTenBitEncoders(d?.gpuInfo?.tenBit ?? [])
        if (d?.cpuEncoders) setCpuEncoders(d.cpuEncoders)
      })
      .catch(() => {})
  }, [])

  // Close the floating settings card on any click outside the dock, or Escape.
  const dockRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!settingsOpen) return
    const onDown = (e: MouseEvent) => {
      if (!dockRef.current?.contains(e.target as Node)) setSettingsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSettingsOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [settingsOpen])

  const webm = container === 'webm'
  const encoderLabel = webm ? 'VP9' : encoder === 'auto' ? 'Auto' : encoder
  // Shown under the dock chip: encoder, non-default quality, container.
  const settingsSummary = [
    encoderLabel,
    quality !== 'balanced' ? QUALITY_LABEL[quality] : '',
    CONTAINERS.find((c) => c.id === container)!.label,
  ]
    .filter(Boolean)
    .join(' · ')

  const testItem = testId ? items.find((i) => i.id === testId) : undefined
  const closeTest = useCallback(() => setTestId(null), [])

  // ── Ingestion ─────────────────────────────────────────────────────
  const ingest = (entries: Array<{ name: string; path: string }>) => {
    const videos = entries.filter((e) => VIDEO_EXTS.includes(e.name.split('.').pop()?.toLowerCase() ?? ''))
    if (videos.length === 0) {
      toast({ kind: 'info', title: 'No video files', desc: 'Re-encode Video only takes video files.' })
      return
    }
    if (items.length === 0) {
      const loc = parentDir(videos[0].path)
      if (loc) setOutputDir(`${loc.dir}${loc.sep}Re-encoded`)
    }
    addVideos(videos)
    toast({ kind: 'ok', title: `Added ${videos.length} video${videos.length !== 1 ? 's' : ''}` })
    void probeUnprobed()
  }

  // Sequential, so a big folder doesn't spawn dozens of probes at once.
  const probeUnprobed = async () => {
    for (const item of useReencodeStore.getState().items.filter((i) => i.video.duration === undefined)) {
      const meta: Partial<MergeSource> = await probeSource(item.video)
      useReencodeStore.getState().updateMeta(item.id, meta)
    }
  }

  const handleAddFiles = async () => {
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'File dialogs require the Electron shell' })
      return
    }
    const res = await window.electron.ipcRenderer.invoke('open-file-dialog', 'video')
    if (res && !res.canceled && res.filePaths.length > 0) {
      ingest(res.filePaths.map((fp: string) => ({ name: fileNameOf(fp), path: fp })))
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
    ingest(res.filePaths.map((fp: string) => ({ name: fileNameOf(fp), path: fp })))
  }

  const handleDropFiles = (dropped: File[]) => {
    ingest(
      dropped
        .map((f) => ({ name: f.name, path: window.electron?.getPathForFile?.(f) || (f as any).path || '' }))
        .filter((e) => e.path),
    )
  }

  const handleBrowseOutput = async () => {
    const result = await window.electron?.ipcRenderer?.invoke('browse-folder')
    if (result && !result.canceled && result.filePath) setOutputDir(result.filePath)
  }

  const openPath = async (target: string, what: string) => {
    if (!target || !window.electron?.ipcRenderer) return
    const res = await window.electron.ipcRenderer.invoke('open-path', target).catch(() => null)
    if (res && !res.success) toast({ kind: 'error', title: `Could not open ${what}`, desc: res.error })
  }

  // ── Run / stop ────────────────────────────────────────────────────
  const runItem = async (item: ReencodeItem) => {
    const log = useJobStore.getState().addLog
    try {
      const res = await window.electron!.ipcRenderer.invoke('start-reencode', {
        id: item.id,
        videoPath: item.video.path,
        outContainer: container,
        outFolder: outputDir,
        quality,
        encoder,
      })
      if (!res?.success) {
        useReencodeStore.getState().updateStatus(item.id, 'error', res?.error || 'Failed to enqueue')
        useJobStore.getState().finishJob(item.id, false)
        log(`${item.video.name}: ${res?.error || 'failed to enqueue'}`, 'error')
        return
      }
      log(`${item.video.name}: re-encoding video with ${res.encoder}, copying audio and subtitles → ${res.outPath}`)
      for (const note of res.notes ?? []) log(`${item.video.name}: ${note}`, 'warn')
    } catch (err: any) {
      useReencodeStore.getState().updateStatus(item.id, 'error', 'Failed')
      useJobStore.getState().finishJob(item.id, false)
      log(`Failed to start ${item.video.name}: ${err.message}`, 'error')
    }
  }

  const handleRun = async () => {
    const targets = items.filter((i) => i.status !== 'processing' && i.status !== 'success')
    if (targets.length === 0) {
      toast({ kind: 'error', title: 'Nothing to re-encode', desc: 'Add videos first.' })
      return
    }
    if (!window.electron?.ipcRenderer) return
    await window.electron.ipcRenderer.invoke('set-concurrency', 1).catch(() => {})
    for (const t of targets) {
      useReencodeStore.getState().updateStatus(t.id, 'ready')
      useReencodeStore.getState().updateProgress(t.id, 0)
    }
    useJobStore.getState().startRun(targets.map((i) => ({ id: i.id, name: i.video.name })))
    useJobStore.getState().addLog(`Started re-encode: ${targets.length} video(s), encoder ${encoderLabel}`)
    for (const t of targets) await runItem(t)
  }

  const handleRetry = async (item: ReencodeItem) => {
    if (!window.electron?.ipcRenderer) return
    useReencodeStore.getState().updateStatus(item.id, 'ready')
    useReencodeStore.getState().updateProgress(item.id, 0)
    await window.electron.ipcRenderer.invoke('set-concurrency', 1).catch(() => {})
    useJobStore.getState().retryJob({ id: item.id, name: item.video.name })
    await runItem(item)
  }

  const handleStop = async () => {
    for (const j of jobs) {
      if (j.progress < 1) await window.electron?.ipcRenderer?.invoke('cancel-job', j.id).catch(() => {})
    }
    useJobStore.getState().stopRun()
    useJobStore.getState().addLog('Cancelled by user', 'warn')
  }

  const handleRemove = async (id: string) => {
    await window.electron?.ipcRenderer?.invoke('cancel-job', id).catch(() => {})
    useReencodeStore.getState().remove(id)
  }

  const pending = items.filter((i) => i.status !== 'success' && i.status !== 'processing').length

  return (
    <>
      <div className="page-scroll">
        <div className="page-head">
          <div className="ph-titlegroup">
            <span className="ph-badge">
              <img src={appLogo} alt="" />
            </span>
            <div>
              <h1 className="ph-title">Re-encode Video</h1>
              <p className="ph-sub">Re-encode the video stream; every audio and subtitle track is copied as-is.</p>
            </div>
          </div>
          <div className="ph-actions">
            <ThemeToggle />
            <button className="btn btn-ghost" onClick={clear} disabled={items.length === 0 || running}>
              <Icon name="trash" />
              Clear
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="dropzone-stage">
            <Dropzone
              title="Upload video files to re-encode"
              sub="Only the target video is needed — no audio file"
              kind="folder"
              onAddFiles={handleAddFiles}
              onAddFolder={handleAddFolder}
              onDropFiles={handleDropFiles}
            />
          </div>
        ) : (
          !running && (
            <Dropzone
              slim
              title="Upload video files to re-encode"
              sub={`${items.length} video${items.length !== 1 ? 's' : ''} — audio and subtitles are copied unchanged`}
              kind="folder"
              onAddFiles={handleAddFiles}
              onAddFolder={handleAddFolder}
              onDropFiles={handleDropFiles}
            />
          )
        )}

        {items.length > 0 && (
          <div className={`merge-table ${running ? 'is-running' : ''}`}>
            <div className="merge-row-header">
              <div className="mc-head">
                <span className="mc-icon video">
                  <Icon name="play" />
                </span>
                <span className="mc-cap">Target Video</span>
              </div>
              <div className="merge-row-header-side" aria-hidden="true" />
            </div>
            <div className="merge-rows">
              {items.map((item) => (
                <ReencodeRow
                  key={item.id}
                  item={item}
                  disabled={running}
                  testOpen={testId === item.id}
                  onOpenTest={() => setTestId(item.id)}
                  onOpenVideo={(p) => openPath(p, 'file')}
                  onRetry={() => handleRetry(item)}
                  onCancel={() => window.electron?.ipcRenderer?.invoke('cancel-job', item.id).catch(() => {})}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {testItem && !running && (
          <EncodePanel item={testItem} outContainer={container} quality={quality} encoder={encoder} onClose={closeTest} />
        )}
      </div>

      {items.length > 0 && !running && (
        <div className="settings-dock" ref={dockRef}>
          <div className="panel-toggles">
            <button
              className={`panel-toggle ${settingsOpen ? 'on' : ''}`}
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <Icon name="zap" className="ico" />
              <span className="pt-text">
                <span>Encoding</span>
                <span className="pt-sub">{settingsSummary}</span>
              </span>
              <Icon name="chevron" className="caret" />
            </button>
          </div>
          {settingsOpen && (
            <div className="cards" style={{ ['--panel-offset' as string]: '0px' }}>
              <div className="card">
                <div className="card-head">
                  <Icon name="zap" className="ico ico-glow ico-glow-accent" />
                  <span>Encoding</span>
                </div>
                <div className={`field ${webm ? 'is-disabled' : ''}`}>
                  <label>Encoder</label>
                  <select value={webm ? 'auto' : encoder} onChange={(e) => setEncoder(e.target.value)} disabled={webm}>
                    <option value="auto">Auto (best that works here)</option>
                    {gpuEncoders.map((e) => (
                      <option key={e} value={e}>
                        {e} (GPU{tenBitEncoders.includes(e) ? ', 10-bit' : ', 8-bit only'})
                      </option>
                    ))}
                    {cpuEncoders.map((e) => (
                      <option key={e} value={e}>
                        {CPU_ENCODER_LABELS[e] ?? e}
                      </option>
                    ))}
                  </select>
                  <div className="field-note">
                    {webm
                      ? 'WebM always uses VP9 (CPU, slow).'
                      : gpuEncoders.length === 0
                        ? 'No working GPU encoder found; CPU encoders are used.'
                        : 'Auto keeps 10-bit/HDR sources 10-bit, using the CPU when no GPU encoder here can.'}
                  </div>
                </div>
                <div className="field">
                  <label>Quality</label>
                  <div className="seg">
                    {(['fast', 'balanced', 'quality'] as Quality[]).map((q) => (
                      <button key={q} className={quality === q ? 'on' : ''} onClick={() => setQuality(q)}>
                        {QUALITY_LABEL[q]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Container</label>
                  <div className="seg">
                    {CONTAINERS.map((c) => (
                      <button key={c.id} className={container === c.id ? 'on' : ''} onClick={() => setContainer(c.id)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="field-note">
                    {container === 'mp4'
                      ? "MP4 can't hold most subtitle types; they're left out. Use MKV to keep them."
                      : webm
                        ? 'WebM re-encodes video to VP9 and audio to Opus, and drops subtitles.'
                        : 'MKV keeps every audio and subtitle track. "Same" keeps the source container.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <RunFooter
        outputDir={outputDir}
        setOutputDir={setOutputDir}
        onBrowse={handleBrowseOutput}
        onOpen={() => openPath(outputDir, 'folder')}
        running={running}
        onRun={handleRun}
        onStop={handleStop}
        overall={overall}
        runLabel="Start encoding"
        canRun={pending > 0 && !!outputDir}
      />
    </>
  )
}
