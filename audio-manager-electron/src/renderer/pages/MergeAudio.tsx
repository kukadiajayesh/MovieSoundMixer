import React, { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMergeStore, MergePair, MergeSource, isVideoFile } from '../stores/mergeStore'
import { useJobStore, selectOverall } from '../stores/jobStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useThemeStore, ThemeType } from '../stores/themeStore'
import { Icon, IconName } from '../components/design/Icon'
import { Dropzone } from '../components/design/Dropzone'
import { MergeRow } from '../components/design/MergeRow'
import { RunFooter } from '../components/design/RunFooter'
import { RowStatus } from '../components/design/StatusCell'
import { StreamPicker } from '../components/design/StreamPicker'
import { Switch } from '../components/design/Switch'
import { useToast } from '../components/design/Toasts'
import appLogo from '../../../assets/icon.png'

type Backend = 'auto' | 'mkvmerge' | 'ffmpeg'
type Quality = 'fast' | 'balanced' | 'quality'

// Video + external-audio extensions the folder importer should pull in.
const MEDIA_EXTS = [
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'm4v', '3gp', 'ts', 'm2ts',
  'mp3', 'aac', 'flac', 'wav', 'm4a', 'ogg', 'wma', 'eac3', 'ac3', 'dts', 'mka',
]

// Theme toggle cycles through these three modes in this order.
const THEME_CYCLE: ThemeType[] = ['system', 'light', 'dark']
const THEME_META: Record<ThemeType, { label: string; icon: IconName }> = {
  system: { label: 'Auto', icon: 'auto' },
  light: { label: 'Light', icon: 'sun' },
  dark: { label: 'Dark', icon: 'moon' },
}

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
  const [backendAvailable, setBackendAvailable] = useState({ ffmpeg: false, mkvmerge: false })
  const [assigning, setAssigning] = useState<string | null>(null)
  const [channelPicker, setChannelPicker] = useState<{ pairId: string; audio: MergeSource; anchor: HTMLElement } | null>(
    null,
  )

  const { theme, setTheme } = useThemeStore()
  const cycleTheme = () => setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length])
  const { label: themeLabel, icon: themeIcon } = THEME_META[theme]

  useEffect(() => {
    window.electron?.ipcRenderer
      ?.invoke('get-dependency-status')
      .then((d) => {
        setGpuEncoders(d?.gpuInfo?.available ?? [])
        setBackendAvailable({ ffmpeg: !!d?.ffmpegAvailable, mkvmerge: !!d?.mkvmergeAvailable })
      })
      .catch(() => {})
  }, [])

  const matched = pairs.filter((p) => p.audio).length

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
    // Background-fill duration/codec/resolution for the row cards. Not
    // awaited — ingest() stays synchronous and rows render immediately with
    // just the filename, filling in the rest as each probe resolves.
    void probeUnprobedPairs()
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

  // Probes one source file for duration, video info (resolution/codec, if
  // it's a video), and audio streams — the same probe whether the file ends
  // up playing the "video" or "audio" role in a pair, and whether it's a
  // plain audio file or a video used as the audio donor with a channel picked.
  const probeSource = async (entry: { name: string; path: string }): Promise<Partial<MergeSource>> => {
    if (!window.electron?.ipcRenderer) return {}
    try {
      const res = await window.electron.ipcRenderer.invoke('probe-streams', entry.path)
      if (!res?.success) return {}
      let streams: MergeSource['streams'] = res.streams
      if (!streams || streams.length === 0) {
        // No detectable audio — still surface it so the reason is visible in the UI
        streams = [{ index: 0, codec: 'unknown', channels: 2 }]
      }
      const preferred = streams.find((s) => s.isDefault) ?? streams[0]
      return {
        streams,
        selectedStreamIndex: preferred.index,
        duration: res.duration,
        videoCodec: res.videoCodec,
        resolution: res.resolution,
      }
    } catch (err) {
      console.error('Failed to probe source:', err)
      return {}
    }
  }

  // Fills in duration/codec/resolution for every pair whose video or audio
  // side hasn't been probed yet. Runs after addFiles() so auto-matching has
  // already happened synchronously — this is what makes it work for
  // auto-matched (drag-a-folder) audio too, not just manual assignment.
  // Sequential, not Promise.all, so a big folder import doesn't spawn dozens
  // of ffmpeg processes at once.
  const probeUnprobedPairs = async () => {
    const targets = useMergeStore
      .getState()
      .pairs.filter((p) => p.video.duration === undefined || (p.audio && p.audio.duration === undefined))
    for (const p of targets) {
      if (p.video.duration === undefined) {
        const meta = await probeSource(p.video)
        useMergeStore.getState().updateSourceMeta(p.id, 'video', meta)
      }
      const current = useMergeStore.getState().pairs.find((x) => x.id === p.id)
      if (current?.audio && current.audio.duration === undefined) {
        const meta = await probeSource(current.audio)
        useMergeStore.getState().updateSourceMeta(p.id, 'audio', meta)
      }
    }
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
        // duration, audio streams (so a channel can be picked), and video
        // info if a video file was picked as the audio donor.
        const meta = await probeSource(entries[0])
        assignAudio(pairId, { ...entries[0], ...meta })
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

  const handleOpenOutputDir = async () => {
    if (!outputDir) return
    if (!window.electron?.ipcRenderer) return
    const res = await window.electron.ipcRenderer.invoke('open-path', outputDir).catch(() => null)
    if (res && !res.success) {
      toast({ kind: 'error', title: 'Could not open folder', desc: res.error })
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
        <div className="ph-titlegroup">
          <span className="ph-badge">
            <img src={appLogo} alt="" />
          </span>
          <div>
            <h1 className="ph-title">Merge Audio</h1>
            <p className="ph-sub">Append an audio stream into the target video file.</p>
          </div>
        </div>
        <div className="ph-actions">
          <button
            className="btn btn-ghost"
            onClick={cycleTheme}
            aria-label="Click to change theme (Auto → Light → Dark)"
            data-tip="Click to change theme (Auto → Light → Dark)"
          >
            <Icon name={themeIcon} />
            {themeLabel}
          </button>
          <button className="btn btn-ghost" onClick={clearPairs} disabled={pairs.length === 0 || running}>
            <Icon name="trash" />
            Clear
          </button>
        </div>
      </div>

      {pairs.length === 0 ? (
        <div className="dropzone-stage">
          <Dropzone
            title="Upload video files and append audio"
            sub="Fuse with other audio tracks"
            kind="folder"
            onAddFiles={() => handleAddFiles()}
            onAddFolder={handleAddFolder}
            onDropFiles={handleDropFiles}
          />
        </div>
      ) : (
        !running && (
          <Dropzone
            slim
            title="Upload video files and append audio"
            sub={`${pairs.length} pair${pairs.length !== 1 ? 's' : ''} · auto-matched by episode — fuse with other audio tracks`}
            kind="folder"
            onAddFiles={() => handleAddFiles()}
            onAddFolder={handleAddFolder}
            onDropFiles={handleDropFiles}
          />
        )
      )}

      {pairs.length > 0 && (
        <div className={`merge-table ${running ? 'is-running' : ''}`}>
          <div className="merge-row-header">
            <div className="mc-head">
              <span className="mc-icon video">
                <Icon name="play" />
              </span>
              <span className="mc-cap">Target Video</span>
            </div>
            <div className="merge-row-header-spacer" aria-hidden="true" />
            <div className="mc-head">
              <span className="mc-icon audio">
                <Icon name="music" />
              </span>
              <span className="mc-cap">Source Audio File</span>
            </div>
            <div className="merge-row-header-side" aria-hidden="true" />
          </div>

          <div className="merge-rows">
            {pairs.map((p) => (
              <MergeRow
                key={p.id}
                pair={p}
                status={toRowStatus(p.status)}
                disabled={running}
                assigning={assigning === p.id}
                onAssignClick={() => {
                  setAssigning(p.id)
                  handleAddFiles(p.id)
                }}
                onOpenChannelPicker={(audio, anchor) => {
                  setChannelPicker((prev) =>
                    prev && prev.pairId === p.id ? null : { pairId: p.id, audio, anchor }
                  )
                }}
                onClearAudio={() => assignAudio(p.id, null)}
                onOpenVideo={openOutput}
                onRetry={() => handleRetryPair(p.id)}
                onCancel={() => handleCancelPair(p.id)}
                onRemove={() => handleRemovePair(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Merge settings cards — hidden until at least one file is picked, and
          tucked away again while a merge is running so the running rows have
          the space; they reappear once the run stops or completes. */}
      {pairs.length > 0 && !running && (
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
                {
                  id: 'mkvmerge',
                  lbl: 'Force mkvmerge',
                  desc: 'External track first, all originals kept',
                  available: backendAvailable.mkvmerge,
                },
                {
                  id: 'ffmpeg',
                  lbl: 'Force FFmpeg',
                  desc: 'Compatible with more containers',
                  available: backendAvailable.ffmpeg,
                },
              ] as Array<{ id: Backend; lbl: string; desc: string; available?: boolean }>
            ).map((o) => (
              <label key={o.id} className="radio-row">
                <input type="radio" name="backend" checked={backend === o.id} onChange={() => setBackend(o.id)} />
                <div>
                  <div className="lbl">
                    {o.lbl}
                    {o.available && <span className="avail-dot" data-tip="Detected on this system" />}
                  </div>
                  <div className="desc">{o.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
         <div className="card-head">
           <Icon name="settings" className="ico ico-glow ico-glow-ok" />
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
        onOpen={handleOpenOutputDir}
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
