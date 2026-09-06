import React, { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMergeStore, MergePair, MergeSource, isVideoFile } from '../stores/mergeStore'
import { useJobStore, selectOverall } from '../stores/jobStore'
import { useSettingsStore } from '../stores/settingsStore'
import { Icon } from '../components/design/Icon'
import { Dropzone } from '../components/design/Dropzone'
import { RunFooter } from '../components/design/RunFooter'
import { StatusCell, RowStatus } from '../components/design/StatusCell'
import { StreamPicker } from '../components/design/StreamPicker'
import { Switch } from '../components/design/Switch'
import { useToast } from '../components/design/Toasts'

type Backend = 'auto' | 'mkvmerge' | 'ffmpeg'
type Quality = 'fast' | 'balanced' | 'quality'

// Video + external-audio extensions the folder importer should pull in.
const MEDIA_EXTS = [
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'm4v', '3gp', 'ts', 'm2ts',
  'mp3', 'aac', 'flac', 'wav', 'm4a', 'ogg', 'wma', 'eac3', 'ac3', 'dts', 'mka',
]

const fileExt = (name: string) => (name.split('.').pop() || '').toLowerCase()
const baseName = (name: string) => name.replace(/\.[^.]+$/, '')
const dirName = (fp: string) => {
  const sep = fp.includes('\\') ? '\\' : '/'
  const idx = fp.lastIndexOf(sep)
  return idx >= 0 ? { dir: fp.slice(0, idx), sep } : null
}

const toRowStatus = (status: MergePair['status']): RowStatus => {
  switch (status) {
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

export const MergeAudio: React.FC = () => {
  const { pairs, unmatchedAudios, addFiles, assignAudio, updateAudioStreamIndex, clearPairs } = useMergeStore()
  const running = useJobStore((s) => s.running)
  const overall = useJobStore(useShallow(selectOverall))
  const jobs = useJobStore((s) => s.jobs)
  const { gpuEnabled, updateSetting } = useSettingsStore()
  const toast = useToast()

  const [outputDir, setOutputDir] = useState('')
  const [container, setContainer] = useState<'mkv' | 'mp4' | 'webm'>('mkv')
  const [mergeMode, setMergeMode] = useState<'replace' | 'secondary'>('secondary')
  const copyVideo = !gpuEnabled
  const [backend, setBackend] = useState<Backend>('auto')
  const [quality, setQuality] = useState<Quality>('balanced')
  const [gpuEncoders, setGpuEncoders] = useState<string[]>([])
  const [encoder, setEncoder] = useState<string>('') // '' = auto-pick best
  const [assigning, setAssigning] = useState<string | null>(null)
  const [channelPicker, setChannelPicker] = useState<{ pairId: string; audio: MergeSource; anchor: HTMLElement } | null>(
    null,
  )

  useEffect(() => {
    window.electron?.ipcRenderer
      ?.invoke('get-dependency-status')
      .then((d) => setGpuEncoders(d?.gpuInfo?.available ?? []))
      .catch(() => {})
  }, [])

  const matched = pairs.filter((p) => p.audio).length
  const unmatched = pairs.length - matched

  // ── Ingestion ─────────────────────────────────────────────────────
  const ingest = (entries: Array<{ name: string; path: string }>) => {
    if (entries.length === 0) return
    if (pairs.length === 0 && unmatchedAudios.length === 0) {
      const loc = dirName(entries[0].path)
      if (loc) setOutputDir(`${loc.dir}${loc.sep}Merged Audio`)
    }
    addFiles(entries)
    const videos = entries.filter((e) => isVideoFile(e.name)).length
    toast({
      kind: 'ok',
      title: `Added ${entries.length} file${entries.length !== 1 ? 's' : ''}`,
      desc: `${videos} video(s), ${entries.length - videos} audio file(s) — auto-matched by episode`,
    })
  }

  const handleDropFiles = (dropped: File[]) => {
    ingest(
      dropped
        .map((f) => ({
          name: f.name,
          path: window.electron?.getPathForFile?.(f) || (f as any).path || '',
        }))
        .filter((e) => e.path),
    )
  }

  // Probe a picked audio source so a video (or any multi-track file) can be used
  // as the audio donor with a specific channel, not just a plain audio file.
  const probeAudioSource = async (entry: { name: string; path: string }): Promise<MergeSource> => {
    if (!window.electron?.ipcRenderer) return entry
    let streams: MergeSource['streams'] = []
    try {
      const res = await window.electron.ipcRenderer.invoke('probe-streams', entry.path)
      if (res?.success) streams = res.streams
    } catch (err) {
      console.error('Failed to probe audio source:', err)
    }
    if (!streams || streams.length === 0) {
      // No detectable audio — still assign it so the reason is visible in the UI
      streams = [{ index: 0, codec: 'unknown', channels: 2 }]
    }
    const preferred = streams.find((s) => s.isDefault) ?? streams[0]
    return { ...entry, streams, selectedStreamIndex: preferred.index }
  }

  const handleAddFiles = async (pairId?: string) => {
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'File dialogs require the Electron shell' })
      return
    }
    // Manual assignment now accepts either an audio file or a video file (its
    // audio channel is picked afterwards), so no `kind` restriction here.
    const res = await window.electron.ipcRenderer.invoke('open-file-dialog')
    if (pairId) setAssigning(null) // clear "Choosing…" even when the dialog is cancelled
    if (res && !res.canceled && res.filePaths.length > 0) {
      const entries = res.filePaths.map((fp: string) => ({
        name: fp.substring(fp.lastIndexOf(fp.includes('\\') ? '\\' : '/') + 1),
        path: fp,
      }))
      if (pairId) {
        // Manual audio assignment for one row — a single file, probed for its
        // audio streams so a channel can be picked.
        const audio = await probeAudioSource(entries[0])
        assignAudio(pairId, audio)
      } else {
        ingest(entries)
      }
    }
  }

  const handleAddFolder = async () => {
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'File dialogs require the Electron shell' })
      return
    }
    const res = await window.electron.ipcRenderer.invoke('open-folder-dialog', MEDIA_EXTS)
    if (!res || res.canceled) return
    if (res.filePaths.length === 0) {
      toast({ kind: 'info', title: 'No video or audio files found in that folder' })
      return
    }
    ingest(
      res.filePaths.map((fp: string) => ({
        name: fp.substring(fp.lastIndexOf(fp.includes('\\') ? '\\' : '/') + 1),
        path: fp,
      })),
    )
  }

  const handleBrowseOutput = async () => {
    if (!window.electron?.ipcRenderer) return
    const result = await window.electron.ipcRenderer.invoke('browse-folder')
    if (result && !result.canceled && result.filePath) {
      setOutputDir(result.filePath)
    }
  }

  // ── Run / stop ────────────────────────────────────────────────────
  // Enqueues the backend job for one already-matched pair. Shared by the
  // batch run below and by a single-row retry, so both paths stay in sync.
  const runPair = async (p: MergePair) => {
    if (!window.electron?.ipcRenderer) return
    try {
      // Probe the video duration so FFmpeg progress can be mapped to %
      let duration = 0
      try {
        const probe = await window.electron.ipcRenderer.invoke('probe-streams', p.video.path)
        if (probe?.success) duration = probe.duration
      } catch {
        /* progress will just be indeterminate */
      }

      // FFmpeg maps audio by ordinal (a:N) — translate the absolute stream
      // index picked in the channel popover, same convention as Extract Audio.
      const audioStreamIndex = Math.max(
        0,
        (p.audio!.streams ?? []).findIndex((s) => s.index === p.audio!.selectedStreamIndex),
      )

      // The actual pipeline is a single pass: the chosen audio track is
      // selected from the source audio file and muxed directly onto the
      // target video's stream(s) in one ffmpeg/mkvmerge invocation — there
      // is no separate "extract to a temp file" step. Log that plainly so
      // the job log reflects what really happens rather than implying a
      // two-step extract-then-append.
      useJobStore
        .getState()
        .addLog(
          `${p.video.name}: selecting audio track #${audioStreamIndex} from "${p.audio!.name}" and muxing it directly onto "${p.video.name}" (single-pass, no intermediate extract step)`,
        )

      const res = await window.electron.ipcRenderer.invoke('start-merge', {
        id: p.id,
        videoPath: p.video.path,
        audioPath: p.audio!.path,
        audioStreamIndex,
        outContainer: container,
        outFolder: outputDir,
        copyVideo,
        mergeMode,
        duration,
        backend,
        quality,
        encoder: encoder || undefined,
      })
      if (!res?.success) {
        useMergeStore.getState().updatePairStatus(p.id, 'error', res?.error || 'Failed to enqueue')
        useJobStore.getState().finishJob(p.id, false)
        useJobStore.getState().addLog(`${p.video.name}: ${res?.error || 'failed to enqueue'}`, 'error')
      }
    } catch (err: any) {
      useMergeStore.getState().updatePairStatus(p.id, 'error', 'Failed')
      useJobStore.getState().finishJob(p.id, false)
      useJobStore.getState().addLog(`Failed to start ${p.video.name}: ${err.message}`, 'error')
    }
  }

  const handleRun = async () => {
    const targets = pairs.filter((p) => p.audio && p.status !== 'processing')
    if (targets.length === 0) {
      toast({ kind: 'error', title: 'No matched pairs to merge', desc: 'Assign audio files first.' })
      return
    }
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'Merging requires the Electron shell' })
      return
    }

    // Process only single entry
    await window.electron.ipcRenderer
      .invoke('set-concurrency', 1)
      .catch(() => {})

    useJobStore.getState().startRun(targets.map((p) => ({ id: p.id, name: p.video.name })))
    useJobStore
      .getState()
      .addLog(`Started merge job: ${targets.length} pair(s) → ${container.toUpperCase()} via ${backend}`)

    for (const p of targets) {
      await runPair(p)
    }
  }

  // Restart a single row that ended in error — including one the user
  // cancelled mid-progress, which lands here too since a cancel resolves to
  // an error status. Re-enqueues just that pair without touching the others,
  // folding into an active batch if one is still running (see retryJob).
  const handleRetryPair = async (id: string) => {
    const p = pairs.find((pr) => pr.id === id)
    if (!p || !p.audio) return
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'Merging requires the Electron shell' })
      return
    }
    useMergeStore.getState().updatePairStatus(id, 'ready')
    useMergeStore.getState().updatePairProgress(id, 0)
    await window.electron.ipcRenderer.invoke('set-concurrency', 1).catch(() => {})
    useJobStore.getState().retryJob({ id: p.id, name: p.video.name })
    useJobStore.getState().addLog(`Retrying merge: ${p.video.name}`)
    await runPair(p)
  }

  const openOutput = async (outputPath: string) => {
    if (!window.electron?.ipcRenderer) return
    const res = await window.electron.ipcRenderer.invoke('open-path', outputPath).catch(() => null)
    if (res && !res.success) {
      toast({ kind: 'error', title: 'Could not open file', desc: res.error })
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

  // Cancel just one in-flight row — leaves the other queued/running rows
  // untouched. The backend emits a 'job-status' failure for this id, which
  // useIPC already turns into the row's error state and finishes the job.
  const handleCancelPair = async (id: string) => {
    if (!window.electron?.ipcRenderer) return
    await window.electron.ipcRenderer.invoke('cancel-job', id).catch(() => {})
  }

  // Remove a single row from the list. Also cancels any backend job for it
  // first (covers a row still pending/processing in a batch run) so it can't
  // silently finish after being dropped from view.
  const handleRemovePair = async (id: string) => {
    if (window.electron?.ipcRenderer) {
      await window.electron.ipcRenderer.invoke('cancel-job', id).catch(() => {})
    }
    useMergeStore.getState().removePair(id)
  }

  return (
    <>
      <div className="page-scroll">
      <div className="page-head">
        <div>
          <h1 className="ph-title">Merge Audio</h1>
          <p className="ph-sub">
            Add an external audio track to videos. Auto-matches by episode (SxxExx) — or click a row's
            audio cell and pick a video directly to pull one of its channels.
          </p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-ghost" onClick={clearPairs} disabled={pairs.length === 0 || running}>
            <Icon name="trash" />
            Clear
          </button>
        </div>
      </div>

      {pairs.length === 0 ? (
        <div className="dropzone-stage">
          <Dropzone
            title="Drop videos and audio files"
            sub="Files are paired automatically by episode number"
            kind="folder"
            onAddFiles={() => handleAddFiles()}
            onAddFolder={handleAddFolder}
            onDropFiles={handleDropFiles}
          />
        </div>
      ) : (
        <>
          {!running && (
            <Dropzone
              slim
              title="Drop videos and audio files"
              sub={`${pairs.length} pair${pairs.length !== 1 ? 's' : ''} · auto-matched by episode — drag more in, or drop here`}
              kind="folder"
              onAddFiles={() => handleAddFiles()}
              onAddFolder={handleAddFolder}
              onDropFiles={handleDropFiles}
            />
          )}
          <div className="match-preview">
            <Icon name="info" className="ico" />
            <span className="label">Episode auto-match:</span>
            <span className="stat">{matched} matched</span>
            {unmatched > 0 && (
              <>
                <span style={{ color: 'var(--fg-4)' }}>·</span>
                <span className="stat warn">{unmatched} unmatched</span>
              </>
            )}
            {unmatchedAudios.length > 0 && (
              <>
                <span style={{ color: 'var(--fg-4)' }}>·</span>
                <span className="stat warn">{unmatchedAudios.length} spare audio file(s)</span>
              </>
            )}
            <span style={{ color: 'var(--fg-4)', marginLeft: 'auto', fontSize: 11 }}>
              Click any audio cell to override
            </span>
          </div>
        </>
      )}

      {pairs.length > 0 && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="col-idx">#</th>
                <th>Target Video</th>
                <th>Source Audio File</th>
                <th className="col-meta">Episode</th>
                <th className="col-status">Status</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p, i) => (
                <tr key={p.id}>
                  <td className="col-idx">{i + 1}</td>
                  <td>
                    <div className={`fname ext-${fileExt(p.video.name)}`}>
                      <span className="ext">{fileExt(p.video.name)}</span>
                      <span className="label">{baseName(p.video.name)}</span>
                    </div>
                  </td>
                  <td
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setAssigning(p.id)
                      handleAddFiles(p.id)
                    }}
                    data-tip="Click to choose a different audio or video file"
                  >
                    {p.audio ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div className={`fname ext-${fileExt(p.audio.name)}`}>
                          <span className="ext">{fileExt(p.audio.name)}</span>
                          <span className="label">{baseName(p.audio.name)}</span>
                        </div>
                        {p.audio.streams && p.audio.streams.length > 0 && (() => {
                          const picked =
                            p.audio!.streams!.find((s) => s.index === p.audio!.selectedStreamIndex) ??
                            p.audio!.streams![0]
                          return (
                            <span
                              className="stream-pick"
                              onClick={(e) => {
                                e.stopPropagation()
                                setChannelPicker({ pairId: p.id, audio: p.audio!, anchor: e.currentTarget })
                              }}
                              data-tip="Click to choose a different audio channel"
                            >
                              <span className="badge">{picked.codec.toUpperCase()}</span>
                              {picked.language && <span className="lang">{picked.language.toUpperCase()}</span>}
                              <span className="ch">{picked.channels}ch</span>
                              <Icon name="chevron" className="caret" />
                            </span>
                          )
                        })()}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--warn)', fontSize: 11, fontStyle: 'italic' }}>
                        {assigning === p.id ? 'Choosing…' : '⚠ No match — click to assign manually'}
                      </span>
                    )}
                  </td>
                  <td className="col-meta mono" style={{ fontSize: 11 }}>
                    {p.episode || '—'}
                  </td>
                  <td className="col-status">
                    <StatusCell status={toRowStatus(p.status)} progress={p.progress} error={p.error} />
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                    {p.status === 'success' && p.outputPath && (
                      <button
                        className="btn btn-ghost btn-sm"
                        aria-label="Open merged file"
                        data-tip="Open merged file"
                        onClick={() => openOutput(p.outputPath!)}
                      >
                        <Icon name="play" />
                      </button>
                    )}
                    {p.status === 'error' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        aria-label="Retry this file"
                        data-tip="Retry this file"
                        onClick={() => handleRetryPair(p.id)}
                      >
                        <Icon name="retry" />
                      </button>
                    )}
                    {p.status === 'processing' ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        aria-label="Cancel this file"
                        data-tip="Cancel this file"
                        onClick={() => handleCancelPair(p.id)}
                      >
                        <Icon name="stop" />
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        aria-label="Remove this file"
                        data-tip="Remove this file"
                        onClick={() => handleRemovePair(p.id)}
                      >
                        <Icon name="close" />
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Merge settings cards — hidden until at least one file is picked */}
      {pairs.length > 0 && (
      <div className="cards">
        <div className="card">
          <div className="card-head">
            <Icon name="zap" className={`ico ${gpuEnabled ? 'ico-glow ico-glow-accent' : ''}`} />
            <span>GPU Acceleration</span>
            <Switch on={gpuEnabled} onChange={(v) => updateSetting('gpu_enabled', String(v))} label="" />
          </div>
          <div className="switch-desc">
            {gpuEnabled ? 'Hardware encoding (re-encodes video)' : 'Copy video stream (no re-encode, fastest)'}
          </div>
          <div className={`field ${!gpuEnabled ? 'is-disabled' : ''}`}>
            <label>
              {gpuEncoders.length > 0
                ? `Encoder (${gpuEncoders.length} detected)`
                : 'No GPU encoders detected — CPU libx264 will be used'}
            </label>
            {gpuEncoders.length > 0 && (
              <select value={encoder} onChange={(e) => setEncoder(e.target.value)} disabled={!gpuEnabled}>
                <option value="">Auto (best available)</option>
                {gpuEncoders.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className={`field ${!gpuEnabled ? 'is-disabled' : ''}`}>
            <label>Quality (used when re-encoding)</label>
            <div className="seg">
              {(['fast', 'balanced', 'quality'] as Quality[]).map((q) => (
                <button
                  key={q}
                  className={quality === q ? 'on' : ''}
                  disabled={!gpuEnabled}
                  onClick={() => setQuality(q)}
                >
                  {q[0].toUpperCase() + q.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <Icon name="layers" className="ico ico-glow ico-glow-warn" />
            <span>Merge Backend</span>
          </div>
          <div>
            {(
              [
                { id: 'auto', lbl: 'Auto', desc: 'Use mkvmerge for MKV if available, else FFmpeg' },
                { id: 'mkvmerge', lbl: 'Force mkvmerge', desc: 'External track first, all originals kept' },
                { id: 'ffmpeg', lbl: 'Force FFmpeg', desc: 'Compatible with more containers' },
              ] as Array<{ id: Backend; lbl: string; desc: string }>
            ).map((o) => (
              <label key={o.id} className="radio-row">
                <input type="radio" name="backend" checked={backend === o.id} onChange={() => setBackend(o.id)} />
                <div>
                  <div className="lbl">{o.lbl}</div>
                  <div className="desc">{o.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <Icon name="cpu" className="ico ico-glow ico-glow-ok" />
            <span>Output</span>
          </div>
          <div className="field">
            <label>Container</label>
            <div className="seg">
              {(['mkv', 'mp4', 'webm'] as const).map((c) => (
                <button key={c} className={container === c ? 'on' : ''} onClick={() => setContainer(c)}>
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            {(
              [
                { id: 'secondary', lbl: 'Add as secondary track', desc: 'Keeps the original audio tracks' },
                { id: 'replace', lbl: 'Replace audio', desc: 'Only the new external track is kept' },
              ] as Array<{ id: 'replace' | 'secondary'; lbl: string; desc: string }>
            ).map((o) => (
              <label key={o.id} className="radio-row">
                <input type="radio" name="mergeMode" checked={mergeMode === o.id} onChange={() => setMergeMode(o.id)} />
                <div>
                  <div className="lbl">{o.lbl}</div>
                  <div className="desc">{o.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
      )}

      {channelPicker && (
        <StreamPicker
          streams={channelPicker.audio.streams ?? []}
          pickedIndex={channelPicker.audio.selectedStreamIndex ?? 0}
          anchor={channelPicker.anchor}
          onPick={(index) => updateAudioStreamIndex(channelPicker.pairId, index)}
          onClose={() => setChannelPicker(null)}
        />
      )}
      </div>

      <RunFooter
        outputDir={outputDir}
        setOutputDir={setOutputDir}
        onBrowse={handleBrowseOutput}
        running={running}
        onRun={handleRun}
        onStop={handleStop}
        overall={overall}
        runLabel="Start Merging"
        canRun={matched > 0}
      />
    </>
  )
}
