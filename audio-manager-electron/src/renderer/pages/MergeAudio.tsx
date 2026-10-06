import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMergeStore, MergePair, MergeSource, isVideoFile, audioOrdinal, isRunnable, changedVideoTitles } from '../stores/mergeStore'
import { useJobStore, selectOverall } from '../stores/jobStore'
import { fmtOffset } from '../lib/mediaLabels'
import { SyncPanel } from '../components/design/SyncPanel'
import { probeSource } from '../lib/probeSource'
import { Icon, IconName } from '../components/design/Icon'
import { ThemeToggle } from '../components/design/ThemeToggle'
import { Dropzone } from '../components/design/Dropzone'
import { MergeRow } from '../components/design/MergeRow'
import { RunFooter } from '../components/design/RunFooter'
import { RowStatus } from '../components/design/StatusCell'
import { StreamPicker } from '../components/design/StreamPicker'
import { useToast } from '../components/design/Toasts'
import appLogo from '../../../assets/icon.png'

type Backend = 'auto' | 'mkvmerge' | 'ffmpeg'

// Video + external-audio extensions the folder importer should pull in.
const MEDIA_EXTS = [
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'm4v', '3gp', 'ts', 'm2ts',
  'mp3', 'aac', 'flac', 'wav', 'm4a', 'ogg', 'wma', 'eac3', 'ac3', 'dts', 'mka',
]

type PanelId = 'backend' | 'output'
const PANELS: Array<{ id: PanelId; label: string; icon: IconName }> = [
  { id: 'backend', label: 'Merge Backend', icon: 'layers' },
  { id: 'output', label: 'Output', icon: 'settings' },
]

const dirName =(fp: string) => {
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
  const { pairs, unmatchedAudios, addFiles, assignAudio, updateAudioStreamIndex, setPairOffset, clearPairs } =
    useMergeStore()
  const running = useJobStore((s) => s.running)
  const overall = useJobStore(useShallow(selectOverall))
  const jobs = useJobStore((s) => s.jobs)
  const toast = useToast()

  const [outputDir, setOutputDir] = useState('')
  const [container, setContainer] = useState<'mkv' | 'mp4' | 'webm'>('mkv')
  const [mergeMode, setMergeMode] = useState<'replace' | 'secondary'>('secondary')
  const [backend, setBackend] = useState<Backend>('auto')
  const [backendAvailable, setBackendAvailable] = useState({ ffmpeg: false, mkvmerge: false })
  const [assigning, setAssigning] = useState<string | null>(null)
  const [syncPairId, setSyncPairId] = useState<string | null>(null)
  const [channelPicker, setChannelPicker] = useState<{ pairId: string; audio: MergeSource; anchor: HTMLElement } | null>(
    null,
  )

  // Settings panels start collapsed; only one can be open at a time.
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null)
  const open: Record<PanelId, boolean> = {
    backend: openPanel === 'backend',
    output: openPanel === 'output',
  }
  // Close the floating panel on any click outside the dock, or Escape.
  const dockRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!openPanel) return
    const onDown = (e: MouseEvent) => {
      if (!dockRef.current?.contains(e.target as Node)) setOpenPanel(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenPanel(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openPanel])

  // Short note shown under a chip when its settings differ from the defaults.
  const panelSummary: Record<PanelId, string | null> = {
    backend: backend !== 'auto' ? (backend === 'mkvmerge' ? 'mkvmerge' : 'FFmpeg') : null,
    output:
      [container !== 'mkv' ? container.toUpperCase() : '', mergeMode === 'replace' ? 'Replace audio' : '']
        .filter(Boolean)
        .join(' · ') || null,
  }

  // Left offset (px) so the expanded card lines up under the chip that opened it.
  const [panelOffset, setPanelOffset] = useState(0)
  const togglePanel = (id: PanelId, chip: HTMLElement) => {
    const dockW = chip.parentElement?.clientWidth ?? 0
    // 24px dock padding on each side; 340px = max card width (see .settings-dock .cards).
    setPanelOffset(Math.max(0, Math.min(chip.offsetLeft - 24, dockW - 48 - 340)))
    setOpenPanel((cur) => (cur === id ? null : id))
  }

  useEffect(() => {
    window.electron?.ipcRenderer
      ?.invoke('get-dependency-status')
      .then((d) => {
        setBackendAvailable({ ffmpeg: !!d?.ffmpegAvailable, mkvmerge: !!d?.mkvmergeAvailable })
      })
      .catch(() => {})
  }, [])

  const matched = pairs.filter(isRunnable).length
  const syncPair = syncPairId ? pairs.find((p) => p.id === syncPairId) : undefined
  // Stable, so the panel's listeners aren't re-attached on every render.
  const closeSync = useCallback(() => setSyncPairId(null), [])

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
      const audioStreamIndex = p.audio ? audioOrdinal(p.audio) : 0
      const offsetMs = p.audio ? (p.audioOffsetMs ?? 0) : 0
      const videoTitles = changedVideoTitles(p)
      const pickedTitle = p.audio?.streams?.find((s) => s.index === p.audio!.selectedStreamIndex)?.title ?? ''
      const audioTitle = p.audio && p.audioTitle !== undefined && p.audioTitle !== pickedTitle ? p.audioTitle : undefined

      // The actual pipeline is a single pass: the chosen audio track is
      // selected from the source audio file and muxed directly onto the
      // target video's stream(s) in one ffmpeg/mkvmerge invocation — there
      // is no separate "extract to a temp file" step. Log that plainly so
      // the job log reflects what really happens rather than implying a
      // two-step extract-then-append.
      const shift = offsetMs !== 0 ? `, audio shifted ${fmtOffset(offsetMs)}` : ''
      useJobStore
        .getState()
        .addLog(
          !p.audio
            ? `${p.video.name}: updating audio track titles (no audio added)`
            : `${p.video.name}: selecting audio track #${audioStreamIndex} from "${p.audio!.name}" and muxing it directly onto "${p.video.name}" (single-pass, no intermediate extract step)${shift}`,
        )

      const res = await window.electron.ipcRenderer.invoke('start-merge', {
        id: p.id,
        videoPath: p.video.path,
        audioPath: p.audio?.path,
        audioStreamIndex,
        outContainer: container,
        outFolder: outputDir,
        mergeMode,
        duration,
        backend,
        audioOffsetMs: offsetMs,
        audioTitle,
        videoTrackTitles: videoTitles,
      })
      if (res?.success && res.detail) {
        useJobStore.getState().addLog(`${p.video.name}: ${res.detail}`)
      }
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
    const targets = pairs.filter((p) => isRunnable(p) && p.status !== 'processing')
    if (targets.length === 0) {
      toast({ kind: 'error', title: 'No matched pairs to merge', desc: 'Assign audio files or edit track titles first.' })
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
    if (!p || !isRunnable(p)) return
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
          <ThemeToggle />
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
                syncOpen={syncPairId === p.id}
                onOpenSync={() => {
                  setChannelPicker(null)
                  setSyncPairId(p.id)
                }}
                onOpenChannelPicker={(audio, anchor) => {
                  setSyncPairId(null)
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


      {syncPair?.audio && !running && (
        <SyncPanel
          pair={syncPair}
          onChange={(ms) => setPairOffset(syncPair.id, ms)}
          onPickTrack={(index) => updateAudioStreamIndex(syncPair.id, index)}
          onClose={closeSync}
        />
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

      {/* Merge settings cards — hidden until at least one file is picked, and
          tucked away again while a merge is running so the running rows have
          the space; they reappear once the run stops or completes. */}
      {pairs.length > 0 && !running && (
      <div className="settings-dock" ref={dockRef}>
      <div className="panel-toggles">
        {PANELS.map((pn) => (
          <button
            key={pn.id}
            className={`panel-toggle ${open[pn.id] ? 'on' : ''}`}
            aria-expanded={open[pn.id]}
            onClick={(e) => togglePanel(pn.id, e.currentTarget)}
          >
            <Icon name={pn.icon} className="ico" />
            <span className="pt-text">
              <span>{pn.label}</span>
              {panelSummary[pn.id] && <span className="pt-sub">{panelSummary[pn.id]}</span>}
            </span>
            <Icon name="chevron" className="caret" />
          </button>
        ))}
      </div>
      {(open.backend || open.output) && (
      <div className="cards" style={{ ['--panel-offset' as string]: `${panelOffset}px` }}>
        {open.backend && (
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
                  desc:
                    container === 'mkv'
                      ? 'External track first, all originals kept'
                      : `Only writes MKV, not ${container.toUpperCase()}`,
                  available: backendAvailable.mkvmerge,
                  disabled: container !== 'mkv',
                },
                {
                  id: 'ffmpeg',
                  lbl: 'Force FFmpeg',
                  desc: 'Compatible with more containers',
                  available: backendAvailable.ffmpeg,
                },
              ] as Array<{ id: Backend; lbl: string; desc: string; available?: boolean; disabled?: boolean }>
            ).map((o) => (
              <label key={o.id} className={`radio-row ${o.disabled ? 'is-disabled' : ''}`}>
                <input
                  type="radio"
                  name="backend"
                  checked={backend === o.id}
                  disabled={o.disabled}
                  onChange={() => setBackend(o.id)}
                />
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
        )}

        {open.output && (
        <div className="card">
         <div className="card-head">
           <Icon name="settings" className="ico ico-glow ico-glow-ok" />
           <span>Output</span>
         </div>
          <div className="field">
            <label>Container</label>
            <div className="seg">
              {(['mkv', 'mp4', 'webm'] as const).map((c) => (
                <button
                  key={c}
                  className={container === c ? 'on' : ''}
                  onClick={() => {
                    setContainer(c)
                    // mkvmerge only writes MKV; don't leave it selected.
                    if (c !== 'mkv' && backend === 'mkvmerge') setBackend('auto')
                  }}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
            {container === 'webm' && (
              <div className="field-note">
                WebM re-encodes audio to Opus and only holds VP8, VP9 or AV1 video. Merging never re-encodes video, so
                re-encode other videos to VP9 on Re-encode Video first.
              </div>
            )}
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
        )}
      </div>
      )}
      </div>
      )}

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
