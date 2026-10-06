import React, { useEffect, useRef, useState } from 'react'
import { MergePair, audioOrdinal } from '../../stores/mergeStore'
import { fmtClock, fmtOffset, parseClock } from '../../lib/mediaLabels'
import { Icon } from './Icon'
import { OffsetInput, OffsetSlider } from './SyncControls'
import { LaneState, SyncWaveform, WaveLane } from './SyncWaveform'
import { ComparePlayer, ComparePlayerHandle, Hear } from './ComparePlayer'

const PREVIEW_LENGTHS = [10, 20, 30] as const
type PreviewLength = (typeof PREVIEW_LENGTHS)[number]

// Extra seconds of the new track fetched either side of the window, so the
// offset can move (drag, slider) without refetching on every step.
const ADDED_MARGIN_SEC = 10
type Preview =
  | { status: 'idle' }
  | { status: 'rendering' }
  | {
      status: 'ready'
      clip: ArrayBuffer
      original: ArrayBuffer | null
      offsetMs: number
      startSec: number
      length: number
      track: number
    }
  | { status: 'error'; error: string }

// The new track's peaks plus what they were fetched for.
type AddedWave = { lane: WaveLane; track: number; audioPath: string }

// IPC hands Buffers over as Uint8Array views; copy out just their bytes.
export const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

const fetchPeaks = async (path: string, stream: number, start: number, duration: number): Promise<WaveLane> => {
  const ipc = window.electron?.ipcRenderer
  if (!ipc) throw new Error('Not available outside the app')
  const res = await ipc
    .invoke('get-sync-waveform', { path, audioStreamIndex: stream, startSec: start, durationSec: duration })
    .catch((err: Error) => ({ success: false, error: err.message }))
  if (!res?.success) throw new Error(res?.error || 'Could not read the audio')
  return { peaks: res.peaks as Float32Array, startSec: start, bucketMs: res.bucketMs as number }
}

interface SyncPanelProps {
  pair: MergePair
  onChange: (ms: number) => void
  // Picks which of the audio file's streams to use (absolute stream index).
  // Shared with the row's channel chip, so the preview plays what gets merged.
  onPickTrack: (streamIndex: number) => void
  onClose: () => void
}

// Per-file A/V sync: set one row's audio offset, line it up against the
// video's own audio on a waveform, and render a short clip to check it by ear
// (new track, original audio, or both at once) before merging.
export const SyncPanel: React.FC<SyncPanelProps> = ({ pair, onChange, onPickTrack, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<ComparePlayerHandle>(null)
  const [length, setLength] = useState<PreviewLength>(10)
  const [startText, setStartText] = useState('0:00')
  const [preview, setPreview] = useState<Preview>({ status: 'idle' })
  const [hear, setHear] = useState<Hear>('new')
  const [playhead, setPlayhead] = useState<number | null>(null)
  const [originalWave, setOriginalWave] = useState<LaneState>({ message: 'Loading…' })
  const [addedWave, setAddedWave] = useState<AddedWave | null>(null)
  const [addedError, setAddedError] = useState<string | null>(null)
  // Ignore a render or fetch that finishes after a newer one was requested.
  const previewReq = useRef(0)
  const originalReq = useRef(0)
  const addedReq = useRef(0)

  const offsetMs = pair.audioOffsetMs ?? 0
  const streams = pair.audio?.streams ?? []
  const track = pair.audio ? audioOrdinal(pair.audio) : 0
  const audioPath = pair.audio?.path ?? ''
  // probeSource stands in an 'unknown' stream for a file with no audio.
  const videoHasAudio = pair.video.streams ? pair.video.streams.some((s) => s.codec !== 'unknown') : true
  const maxStartFor = (len: number) =>
    pair.video.duration ? Math.max(0, Math.floor(pair.video.duration - len)) : undefined
  const startSec = parseClock(startText)
  const maxStart = maxStartFor(length)
  const startError =
    startSec === null
      ? 'Use m:ss or seconds'
      : maxStart !== undefined && startSec > maxStart
        ? `Must be ${fmtClock(maxStart)} or earlier`
        : null
  // The stretch of video the waveform and clip cover. Only valid start times
  // are committed, so it holds still while the box is mid-edit.
  const [windowStart, setWindowStart] = useState(0)

  useEffect(() => {
    panelRef.current?.querySelector<HTMLInputElement>('.sync-input input')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Stop an unfinished render when the panel closes.
  useEffect(
    () => () => {
      previewReq.current++
      window.electron?.ipcRenderer?.invoke('cancel-sync-preview', pair.id).catch(() => {})
    },
    [pair.id],
  )

  // Original lane: the video's first audio track over the window. Debounced
  // so typing a start time doesn't fire a decode per keystroke.
  useEffect(() => {
    if (!window.electron?.ipcRenderer || !videoHasAudio) return
    const id = ++originalReq.current
    const timer = setTimeout(() => {
      setOriginalWave({ message: 'Loading…' })
      fetchPeaks(pair.video.path, 0, windowStart, length)
        .then((lane) => id === originalReq.current && setOriginalWave({ lane }))
        .catch((err: Error) => id === originalReq.current && setOriginalWave({ message: err.message }))
    }, 250)
    return () => clearTimeout(timer)
  }, [pair.video.path, videoHasAudio, windowStart, length])

  const originalState: LaneState = videoHasAudio ? originalWave : { message: 'This video has no audio' }

  // New-track lane: fetched with a margin around the current offset, and
  // refetched only when the offset moves outside it (or the window, file or
  // track changes). While the offset keeps moving outside it (a long drag),
  // the debounce holds the fetch until it settles.
  const addedNeeded = { from: windowStart - offsetMs / 1000, to: windowStart + length - offsetMs / 1000 }
  const addedCovers =
    !!addedWave &&
    addedWave.track === track &&
    addedWave.audioPath === audioPath &&
    addedNeeded.from >= addedWave.lane.startSec - 1e-6 &&
    addedNeeded.to <= addedWave.lane.startSec + (addedWave.lane.peaks.length * addedWave.lane.bucketMs) / 1000 + 1e-6
  useEffect(() => {
    if (!window.electron?.ipcRenderer || !audioPath || addedCovers) return
    const id = ++addedReq.current
    const timer = setTimeout(() => {
      const from = windowStart - offsetMs / 1000 - ADDED_MARGIN_SEC
      fetchPeaks(audioPath, track, from, length + 2 * ADDED_MARGIN_SEC)
        .then((lane) => {
          if (id !== addedReq.current) return
          setAddedWave({ lane, track, audioPath })
          setAddedError(null)
        })
        .catch((err: Error) => id === addedReq.current && setAddedError(err.message))
    }, 250)
    return () => clearTimeout(timer)
  }, [audioPath, track, windowStart, length, offsetMs, addedCovers])

  const addedState: LaneState = addedError
    ? { message: addedError }
    : addedWave && addedWave.track === track && addedWave.audioPath === audioPath
      ? { lane: addedWave.lane }
      : { message: 'Loading…' }

  const renderPreview = async () => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc || !pair.audio || startSec === null || startError) return
    const id = ++previewReq.current
    setPreview({ status: 'rendering' })
    setPlayhead(null)
    const res = await ipc
      .invoke('render-sync-preview', {
        key: pair.id,
        videoPath: pair.video.path,
        audioPath: pair.audio.path,
        audioStreamIndex: track,
        offsetMs,
        startSec,
        durationSec: length,
      })
      .catch((err: Error) => ({ success: false, error: err.message }))
    if (id !== previewReq.current) return
    if (!res?.success) {
      setPreview({ status: 'error', error: res?.error || 'Preview failed' })
      return
    }
    setPreview({
      status: 'ready',
      clip: toArrayBuffer(res.clip),
      original: res.original ? toArrayBuffer(res.original) : null,
      offsetMs,
      startSec,
      length,
      track,
    })
    if (!res.original && hear !== 'new') setHear('new')
  }

  const ready = preview.status === 'ready' ? preview : null
  // Offset or track changes leave the clip's timeline valid (the playhead
  // still lines up); a new start or length doesn't.
  const sameWindow = !!ready && ready.startSec === windowStart && ready.length === length
  const stale = !!ready && (!sameWindow || ready.offsetMs !== offsetMs || ready.track !== track)

  return (
    <>
      {/* Dims and blurs the page; a click on it closes the panel. */}
      <div className="sync-backdrop" aria-hidden="true" onMouseDown={onClose} />
      <div
        ref={panelRef}
        className="sync-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Audio sync for ${pair.video.name}`}
      >
        <div className="sp-titlebar">
          <div>
            <div className="sp-head">Audio sync</div>
            <div className="sp-file" title={pair.video.name}>
              {pair.video.name}
              {pair.audio ? ` ← ${pair.audio.name}` : ''}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm sp-close" onClick={onClose} aria-label="Close audio sync">
            <Icon name="close" />
          </button>
        </div>

        <div className="sync-row sp-offset">
          <OffsetSlider offsetMs={offsetMs} onChange={onChange} />
          <OffsetInput offsetMs={offsetMs} onChange={onChange} />
          <span className="sp-desc">{offsetMs === 0 ? 'No shift' : fmtOffset(offsetMs)}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onChange(0)} disabled={offsetMs === 0}>
            Reset
          </button>
        </div>

        <div className="sync-row sp-window">
          {streams.length > 0 && (
            <div className="field sp-track">
              <label htmlFor={`sp-track-${pair.id}`}>Audio track</label>
              <select
                id={`sp-track-${pair.id}`}
                value={streams[track]?.index ?? ''}
                onChange={(e) => onPickTrack(Number(e.target.value))}
                disabled={streams.length < 2}
              >
                {streams.map((s, ordinal) => (
                  <option key={s.index} value={s.index}>
                    {[
                      s.title || `Track ${ordinal + 1}`,
                      s.language?.toUpperCase(),
                      `${s.codec.toUpperCase()} ${s.channels}ch`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Length</label>
            <div className="seg sp-lengths" role="group" aria-label="Preview length">
              {PREVIEW_LENGTHS.map((n) => (
                <button
                  key={n}
                  className={length === n ? 'on' : ''}
                  onClick={() => {
                    setLength(n)
                    // A longer window can push a late start past the end.
                    const max = maxStartFor(n)
                    if (max !== undefined && windowStart > max) {
                      setWindowStart(max)
                      setStartText(fmtClock(max))
                    }
                  }}
                >
                  {n} s
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor={`sp-start-${pair.id}`}>From</label>
            <input
              id={`sp-start-${pair.id}`}
              type="text"
              className={`sp-start ${startError ? 'invalid' : ''}`}
              value={startText}
              onChange={(e) => {
                setStartText(e.target.value)
                const sec = parseClock(e.target.value)
                if (sec !== null && (maxStart === undefined || sec <= maxStart)) setWindowStart(sec)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void renderPreview()
              }}
              aria-invalid={!!startError}
            />
          </div>
          <button
            className="btn btn-primary btn-sm sp-go"
            onClick={() => void renderPreview()}
            disabled={!pair.audio || !!startError || preview.status === 'rendering'}
          >
            <Icon name="play" />
            {preview.status === 'rendering' ? 'Rendering…' : ready ? 'Preview again' : 'Preview'}
          </button>
        </div>
        {startError && <div className="sp-note err">{startError}</div>}

        <SyncWaveform
          windowStart={windowStart}
          windowLength={length}
          original={originalState}
          added={addedState}
          offsetMs={offsetMs}
          playhead={sameWindow ? playhead : null}
          onSeek={
            sameWindow
              ? (sec) => playerRef.current?.seek(sec)
              : undefined
          }
          onOffsetChange={onChange}
        />
        <div className="sp-note">
          Line up the peaks: drag the new track sideways to shift it
          {sameWindow ? ', click to jump the player there.' : '.'}
        </div>

        {preview.status === 'error' && <div className="sp-note err">{preview.error}</div>}
        {ready && (
          <div className="sp-player">
            <ComparePlayer
              ref={playerRef}
              clip={ready.clip}
              original={ready.original}
              hear={hear}
              onTime={setPlayhead}
            >
              <div className="seg sp-hear" role="group" aria-label="Which audio to hear">
                {(
                  [
                    ['new', 'New track'],
                    ['original', 'Original'],
                    ['both', 'Both'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    className={hear === id ? 'on' : ''}
                    onClick={() => setHear(id)}
                    disabled={id !== 'new' && !ready.original}
                    data-tip={
                      id === 'both'
                        ? 'Plays both at once: if they are out of sync you hear an echo'
                        : !ready.original && id === 'original'
                          ? 'This video has no audio of its own'
                          : undefined
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className={`sp-note sp-clip-note ${stale ? 'warn' : ''}`}>
                {stale
                  ? 'Settings changed since this clip. Preview again to hear them.'
                  : `${fmtClock(ready.startSec)}–${fmtClock(ready.startSec + ready.length)} · ${
                      ready.offsetMs === 0 ? 'no shift' : fmtOffset(ready.offsetMs)
                    } · track ${ready.track + 1}`}
              </span>
            </ComparePlayer>
          </div>
        )}
      </div>
    </>
  )
}
