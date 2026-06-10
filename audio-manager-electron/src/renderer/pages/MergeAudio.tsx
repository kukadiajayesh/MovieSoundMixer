import React, { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMergeStore, MergePair, isVideoFile } from '../stores/mergeStore'
import { useJobStore, selectOverall } from '../stores/jobStore'
import { useSettingsStore } from '../stores/settingsStore'
import { Icon } from '../components/design/Icon'
import { Dropzone } from '../components/design/Dropzone'
import { RunFooter } from '../components/design/RunFooter'
import { StatusCell, RowStatus } from '../components/design/StatusCell'
import { Switch } from '../components/design/Switch'
import { useToast } from '../components/design/Toasts'

type Backend = 'auto' | 'mkvmerge' | 'ffmpeg'
type Quality = 'fast' | 'balanced' | 'quality'

const fileExt = (name: string) => (name.split('.').pop() || '').toLowerCase()
const baseName = (name: string) => name.replace(/\.[^.]+$/, '')

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
  const { pairs, unmatchedAudios, addFiles, assignAudio, clearPairs } = useMergeStore()
  const running = useJobStore((s) => s.running)
  const overall = useJobStore(useShallow(selectOverall))
  const jobs = useJobStore((s) => s.jobs)
  const { gpuEnabled, updateSetting } = useSettingsStore()
  const toast = useToast()

  const [outputDir, setOutputDir] = useState('')
  const [container, setContainer] = useState<'mkv' | 'mp4' | 'webm'>('mkv')
  const [mergeMode, setMergeMode] = useState<'replace' | 'secondary'>('secondary')
  const [copyVideo, setCopyVideo] = useState(true)
  const [backend, setBackend] = useState<Backend>('auto')
  const [quality, setQuality] = useState<Quality>('balanced')
  const [gpuEncoders, setGpuEncoders] = useState<string[]>([])
  const [assigning, setAssigning] = useState<string | null>(null)

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

  const handleAddFiles = async (pairId?: string) => {
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'File dialogs require the Electron shell' })
      return
    }
    const res = await window.electron.ipcRenderer.invoke('open-file-dialog')
    if (res && !res.canceled && res.filePaths.length > 0) {
      const entries = res.filePaths.map((fp: string) => ({
        name: fp.substring(fp.lastIndexOf(fp.includes('\\') ? '\\' : '/') + 1),
        path: fp,
      }))
      if (pairId) {
        // Manual audio assignment for one row
        const audio = entries.find((e: { name: string }) => !isVideoFile(e.name)) || entries[0]
        assignAudio(pairId, audio)
        setAssigning(null)
      } else {
        ingest(entries)
      }
    }
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
    const targets = pairs.filter((p) => p.audio && p.status !== 'processing')
    if (targets.length === 0) {
      toast({ kind: 'error', title: 'No matched pairs to merge', desc: 'Assign audio files first.' })
      return
    }
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'Merging requires the Electron shell' })
      return
    }

    useJobStore.getState().startRun(targets.map((p) => ({ id: p.id, name: p.video.name })))
    useJobStore
      .getState()
      .addLog(`Started merge job: ${targets.length} pair(s) → ${container.toUpperCase()} via ${backend}`)

    for (const p of targets) {
      try {
        // Probe the video duration so FFmpeg progress can be mapped to %
        let duration = 0
        try {
          const probe = await window.electron.ipcRenderer.invoke('probe-streams', p.video.path)
          if (probe?.success) duration = probe.duration
        } catch {
          /* progress will just be indeterminate */
        }

        const res = await window.electron.ipcRenderer.invoke('start-merge', {
          id: p.id,
          videoPath: p.video.path,
          audioPath: p.audio!.path,
          outContainer: container,
          outFolder: outputDir,
          copyVideo,
          mergeMode,
          duration,
          backend,
          quality,
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="ph-title">Merge Audio</h1>
          <p className="ph-sub">Add an external audio track to videos. Auto-matches by episode (SxxExx).</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-ghost" onClick={clearPairs} disabled={pairs.length === 0 || running}>
            <Icon name="trash" />
            Clear
          </button>
        </div>
      </div>

      {pairs.length === 0 ? (
        <Dropzone
          title="Drop videos and audio files"
          sub="Files are paired automatically by episode number"
          kind="folder"
          onAddFiles={() => handleAddFiles()}
          onAddFolder={() => handleAddFiles()}
          onDropFiles={handleDropFiles}
        />
      ) : (
        <>
          <Dropzone
            slim
            title="Drag more files"
            sub={`${pairs.length} pair${pairs.length !== 1 ? 's' : ''} · auto-matched by episode`}
            kind="folder"
            onAddFiles={() => handleAddFiles()}
            onDropFiles={handleDropFiles}
          />
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
                <th>Video</th>
                <th>Audio</th>
                <th className="col-meta">Episode</th>
                <th className="col-status">Status</th>
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
                    title="Click to choose a different audio file"
                  >
                    {p.audio ? (
                      <div className={`fname ext-${fileExt(p.audio.name)}`}>
                        <span className="ext">{fileExt(p.audio.name)}</span>
                        <span className="label">{baseName(p.audio.name)}</span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Merge settings cards */}
      <div className="cards">
        <div className="card">
          <div className="card-head">
            <Icon name="zap" />
            <span>GPU Acceleration</span>
            <span className={`badge ${gpuEnabled ? 'on' : ''}`}>{gpuEnabled ? 'ON' : 'OFF'}</span>
          </div>
          <Switch
            on={gpuEnabled}
            onChange={(v) => updateSetting('gpu_enabled', String(v))}
            label="Enable hardware encoding"
          />
          {gpuEnabled && (
            <>
              <div className="field">
                <label>
                  {gpuEncoders.length > 0
                    ? `Encoder (${gpuEncoders.length} detected — best is picked automatically)`
                    : 'No GPU encoders detected — CPU libx264 will be used'}
                </label>
                {gpuEncoders.length > 0 && (
                  <select value={gpuEncoders[0]} disabled>
                    {gpuEncoders.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="field">
                <label>Quality (used when re-encoding)</label>
                <div className="seg">
                  {(['fast', 'balanced', 'quality'] as Quality[]).map((q) => (
                    <button key={q} className={quality === q ? 'on' : ''} onClick={() => setQuality(q)}>
                      {q[0].toUpperCase() + q.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <Switch on={copyVideo} onChange={setCopyVideo} label="Copy video stream (no re-encode, fastest)" />
        </div>

        <div className="card">
          <div className="card-head">
            <Icon name="layers" />
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
            <Icon name="cpu" />
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
