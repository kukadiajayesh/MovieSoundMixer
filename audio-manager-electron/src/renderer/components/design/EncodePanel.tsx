import React, { useEffect, useRef, useState } from 'react'
import { MergeSource } from '../../stores/mergeStore'
import { fmtClock, fmtDuration, fmtSize, parseClock } from '../../lib/mediaLabels'
import { Icon } from './Icon'
import { toArrayBuffer } from './SyncPanel'

const TEST_LENGTHS = [5, 10, 20] as const
type TestLength = (typeof TEST_LENGTHS)[number]
export type Quality = 'fast' | 'balanced' | 'quality'
export type ReencodeContainer = 'source' | 'mkv' | 'mp4' | 'webm'

type Result =
  | { status: 'idle' }
  | { status: 'rendering' }
  | {
      status: 'ready'
      clipUrl: string
      bytes: number
      elapsedMs: number
      encoderLabel: string
      notes: string[]
      startSec: number
      length: number
      settings: string // what it was rendered with, to flag a stale clip
    }
  | { status: 'error'; error: string }

type Frames =
  | { status: 'idle' }
  | { status: 'grabbing' }
  | { status: 'ready'; originalUrl: string; encodedUrl: string; atSec: number; width: number; height: number }
  | { status: 'error'; error: string }

interface EncodePanelProps {
  item: { id: string; video: MergeSource }
  // The settings the test encodes with — the same values a re-encode job gets.
  outContainer: ReencodeContainer
  quality: Quality
  encoder: string
  onClose: () => void
}

export const QUALITY_LABEL: Record<Quality, string> = { fast: 'Fast', balanced: 'Balanced', quality: 'Quality' }

const loadSize = (url: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not read the frame'))
    img.src = url
  })

// Test encode: render a few seconds with the re-encode's exact video settings,
// play them, project the full file's encode time and size, and compare one
// full-resolution frame against the original.
export const EncodePanel: React.FC<EncodePanelProps> = ({ item: pair, outContainer, quality, encoder, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [length, setLength] = useState<TestLength>(10)
  const [startText, setStartText] = useState('0:00')
  const [result, setResult] = useState<Result>({ status: 'idle' })
  const [tab, setTab] = useState<'play' | 'compare'>('play')
  const [playError, setPlayError] = useState(false)
  const [frameAt, setFrameAt] = useState(0)
  const [frames, setFrames] = useState<Frames>({ status: 'idle' })
  // Ignore a render or grab that finishes after a newer one was requested.
  const renderReq = useRef(0)
  const frameReq = useRef(0)

  const settings = JSON.stringify([outContainer, quality, encoder])
  const duration = pair.video.duration

  const maxStart = duration ? Math.max(0, Math.floor(duration - length)) : undefined
  const startSec = parseClock(startText)
  const startError =
    startSec === null
      ? 'Use m:ss or seconds'
      : maxStart !== undefined && startSec > maxStart
        ? `Must be ${fmtClock(maxStart)} or earlier`
        : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Stop an unfinished encode and drop the clip when the panel closes.
  useEffect(
    () => () => {
      renderReq.current++
      frameReq.current++
      window.electron?.ipcRenderer?.invoke('cancel-encode-preview', pair.id).catch(() => {})
    },
    [pair.id],
  )

  // Blob URLs hold their bytes until revoked.
  const clipUrl = result.status === 'ready' ? result.clipUrl : null
  useEffect(() => () => void (clipUrl && URL.revokeObjectURL(clipUrl)), [clipUrl])
  useEffect(
    () => () => {
      if (frames.status !== 'ready') return
      URL.revokeObjectURL(frames.originalUrl)
      URL.revokeObjectURL(frames.encodedUrl)
    },
    [frames],
  )

  const render = async () => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc || startSec === null || startError) return
    const id = ++renderReq.current
    frameReq.current++
    setResult({ status: 'rendering' })
    setFrames({ status: 'idle' })
    setPlayError(false)
    setFrameAt(length / 2)
    const res = await ipc
      .invoke('render-encode-preview', {
        key: pair.id,
        videoPath: pair.video.path,
        startSec,
        durationSec: length,
        outContainer,
        quality,
        encoder: encoder || undefined,
      })
      .catch((err: Error) => ({ success: false, error: err.message }))
    if (id !== renderReq.current) return
    if (!res?.success) {
      setResult({ status: 'error', error: res?.error || 'Test encode failed' })
      return
    }
    // VP9 clips are WebM, everything else MP4 (see renderEncodePreview).
    const type = res.encoderLabel === 'libvpx-vp9' ? 'video/webm' : 'video/mp4'
    setResult({
      status: 'ready',
      clipUrl: URL.createObjectURL(new Blob([toArrayBuffer(res.clip)], { type })),
      bytes: res.bytes,
      elapsedMs: res.elapsedMs,
      encoderLabel: res.encoderLabel,
      notes: res.notes ?? [],
      startSec,
      length,
      settings,
    })
  }

  const cancelRender = () => {
    renderReq.current++
    window.electron?.ipcRenderer?.invoke('cancel-encode-preview', pair.id).catch(() => {})
    setResult({ status: 'idle' })
  }

  const grabFrames = async () => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc || result.status !== 'ready') return
    const id = ++frameReq.current
    // The player can report the clip's very end, which has no frame to grab.
    const atSec = Math.min(frameAt, result.length - 0.05)
    setFrames({ status: 'grabbing' })
    const res = await ipc
      .invoke('grab-compare-frames', { key: pair.id, atSec })
      .catch((err: Error) => ({ success: false, error: err.message }))
    if (id !== frameReq.current) return
    if (!res?.success) {
      setFrames({ status: 'error', error: res?.error || 'Could not grab the frames' })
      return
    }
    const originalUrl = URL.createObjectURL(new Blob([toArrayBuffer(res.original)], { type: 'image/png' }))
    const encodedUrl = URL.createObjectURL(new Blob([toArrayBuffer(res.encoded)], { type: 'image/png' }))
    const size = await loadSize(originalUrl).catch(() => ({ width: 0, height: 0 }))
    if (id !== frameReq.current) {
      URL.revokeObjectURL(originalUrl)
      URL.revokeObjectURL(encodedUrl)
      return
    }
    setFrames({ status: 'ready', originalUrl, encodedUrl, atSec, ...size })
  }

  const openInPlayer = async () => {
    const res = await window.electron?.ipcRenderer
      ?.invoke('open-encode-preview', pair.id)
      .catch((err: Error) => ({ success: false, error: err.message }))
    if (res && !res.success) setPlayError(true)
  }

  const ready = result.status === 'ready' ? result : null
  const stale = !!ready && (ready.settings !== settings || ready.startSec !== startSec || ready.length !== length)

  // Projections from the test run. Short runs include FFmpeg's start-up and
  // seek time, so the speed tends to read a little low.
  const speed = ready && ready.elapsedMs > 0 ? ready.length / (ready.elapsedMs / 1000) : null
  const estTime = speed && duration ? duration / speed : null
  // The clip carries 192 kb/s of listening audio the job doesn't make (it
  // copies the original tracks), so estimate the new video stream alone.
  const hasAudio = (pair.video.streams ?? []).some((s) => s.codec !== 'unknown')
  const clipVideoBytes = ready ? Math.max(0, ready.bytes - (hasAudio ? (192_000 / 8) * ready.length : 0)) : 0
  const estSize = ready && duration ? (clipVideoBytes / ready.length) * duration : null

  return (
    <>
      <div className="sync-backdrop" aria-hidden="true" onMouseDown={onClose} />
      <div className="sync-panel" role="dialog" aria-modal="true" aria-label={`Test encode for ${pair.video.name}`}>
        <div className="sp-titlebar">
          <div>
            <div className="sp-head">Test encode</div>
            <div className="sp-file" title={pair.video.name}>
              {pair.video.name}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm sp-close" onClick={onClose} aria-label="Close test encode">
            <Icon name="close" />
          </button>
        </div>

        <div className="sp-note">
          {[
            ready?.encoderLabel ?? (encoder && encoder !== 'auto' ? encoder : 'Auto encoder'),
            QUALITY_LABEL[quality],
            outContainer === 'source' ? 'Same container' : outContainer.toUpperCase(),
          ].join(' · ')}{' '}
          — the same video settings the re-encode will use, at full resolution.
        </div>

        <div className="sync-row sp-window">
          <div className="field">
            <label>Length</label>
            <div className="seg sp-lengths" role="group" aria-label="Test length">
              {TEST_LENGTHS.map((n) => (
                <button key={n} className={length === n ? 'on' : ''} onClick={() => setLength(n)}>
                  {n} s
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor={`ep-start-${pair.id}`}>From</label>
            <input
              id={`ep-start-${pair.id}`}
              type="text"
              className={`sp-start ${startError ? 'invalid' : ''}`}
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void render()
              }}
              aria-invalid={!!startError}
            />
          </div>
          {result.status === 'rendering' ? (
            <button className="btn btn-ghost btn-sm sp-go" onClick={cancelRender}>
              <Icon name="stop" />
              Encoding… cancel
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm sp-go"
              onClick={() => void render()}
              disabled={!!startError}
            >
              <Icon name="zap" />
              {ready ? 'Encode again' : 'Encode test'}
            </button>
          )}
        </div>
        {startError && <div className="sp-note err">{startError}</div>}
        {result.status === 'error' && <div className="sp-note err">{result.error}</div>}

        {ready && (
          <div className="sp-player">
            <div className="ep-stats">
              <span>
                <b>{speed ? `${speed.toFixed(1)}×` : '—'}</b> realtime
              </span>
              {estTime !== null && (
                <span>
                  full file ≈ <b>{fmtDuration(estTime)}</b>
                </span>
              )}
              {estSize !== null && (
                <span>
                  video ≈ <b>{fmtSize(estSize)}</b>
                  {hasAudio ? (ready.encoderLabel === 'libvpx-vp9' ? ' + Opus audio' : ' + audio/subtitles as-is') : ''}
                  {pair.video.size ? ` (file now ${fmtSize(pair.video.size)})` : ''}
                </span>
              )}
              <span className="sp-note">approx., from a {ready.length} s test</span>
            </div>
            {ready.notes.map((n) => (
              <div key={n} className="sp-note warn">
                {n}
              </div>
            ))}
            {stale && <div className="sp-note warn">Settings changed since this test. Encode again to see them.</div>}

            <div className="seg ep-tabs" role="tablist" aria-label="Test encode view">
              <button role="tab" aria-selected={tab === 'play'} className={tab === 'play' ? 'on' : ''} onClick={() => setTab('play')}>
                Play
              </button>
              <button
                role="tab"
                aria-selected={tab === 'compare'}
                className={tab === 'compare' ? 'on' : ''}
                onClick={() => setTab('compare')}
              >
                Compare frame
              </button>
            </div>

            {/* Kept mounted on the Compare tab so its time still drives the frame pick. */}
            <div hidden={tab !== 'play'}>
              {playError ? (
                <div className="sp-note warn">
                  This codec can't play inside the app. Open the clip in your system player instead.
                </div>
              ) : (
                <video
                  ref={videoRef}
                  className="sp-video"
                  src={ready.clipUrl}
                  controls
                  onError={() => setPlayError(true)}
                  onTimeUpdate={(e) => setFrameAt(e.currentTarget.currentTime)}
                />
              )}
              <div className="cp-bar">
                <button className="btn btn-ghost btn-sm" onClick={() => void openInPlayer()}>
                  <Icon name="play" />
                  Open in player
                </button>
                <span className="sp-note sp-clip-note">
                  {fmtClock(ready.startSec)}–{fmtClock(ready.startSec + ready.length)} · {fmtSize(ready.bytes)}
                </span>
              </div>
            </div>

            {tab === 'compare' && (
              <>
                <div className="cp-bar">
                  <label className="sp-note" htmlFor={`ep-at-${pair.id}`}>
                    Frame at
                  </label>
                  <input
                    id={`ep-at-${pair.id}`}
                    type="range"
                    className="ep-at"
                    min={0}
                    max={Math.max(0, ready.length - 0.05)}
                    step={0.05}
                    value={Math.min(frameAt, ready.length - 0.05)}
                    onChange={(e) => {
                      const t = Number(e.target.value)
                      setFrameAt(t)
                      if (videoRef.current) videoRef.current.currentTime = t
                    }}
                  />
                  <span className="cp-time">{frameAt.toFixed(1)} s into the clip</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => void grabFrames()}
                    disabled={frames.status === 'grabbing'}
                  >
                    {frames.status === 'grabbing' ? 'Grabbing…' : 'Grab frame'}
                  </button>
                </div>
                {frames.status === 'error' && <div className="sp-note err">{frames.error}</div>}
                {frames.status === 'idle' && (
                  <div className="sp-note">Pick a moment, then grab it to compare the original and encoded frame.</div>
                )}
                {frames.status === 'ready' && <FrameCompare frames={frames} />}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// Original and encoded frame stacked; the encoded one shows right of a
// draggable divider. "100%" shows real pixels and drag pans both together.
const FrameCompare: React.FC<{ frames: Extract<Frames, { status: 'ready' }> }> = ({ frames }) => {
  const viewRef = useRef<HTMLDivElement>(null)
  const [split, setSplit] = useState(0.5)
  const [zoom, setZoom] = useState(false)
  const [scroll, setScroll] = useState({ left: 0, width: 0 })

  const syncScroll = () => {
    const el = viewRef.current
    if (el) setScroll({ left: el.scrollLeft, width: el.clientWidth })
  }
  // Real pixels open on the middle of the frame, where detail usually is.
  useEffect(() => {
    const el = viewRef.current
    if (el && zoom) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
    }
    syncScroll()
  }, [zoom])

  const splitFromX = (clientX: number) => {
    const r = viewRef.current?.getBoundingClientRect()
    if (r && r.width > 0) setSplit(Math.min(1, Math.max(0, (clientX - r.left) / r.width)))
  }

  const onDividerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => splitFromX(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Fit: drag anywhere moves the divider. 100%: drag pans.
  const onViewDown = (e: React.PointerEvent) => {
    const el = viewRef.current
    if (!el) return
    if (!zoom) {
      splitFromX(e.clientX)
      onDividerDown(e)
      return
    }
    const start = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    const move = (ev: PointerEvent) => {
      el.scrollLeft = start.left - (ev.clientX - start.x)
      el.scrollTop = start.top - (ev.clientY - start.y)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // In 100% mode the divider stays put in the viewport while the image
  // scrolls under it, so the cut is placed in image pixels.
  const clipLeft = zoom ? `${scroll.left + split * scroll.width}px` : `${split * 100}%`
  const stageStyle = zoom && frames.width ? { width: frames.width, height: frames.height } : undefined

  return (
    <div className="ep-compare-block">
      <div className="ep-compare-wrap">
        <div
          ref={viewRef}
          className={`ep-compare ${zoom ? 'zoom' : ''}`}
          onScroll={syncScroll}
          onPointerDown={onViewDown}
        >
          <div className="ep-stage" style={stageStyle}>
            <img src={frames.originalUrl} alt="Original frame" draggable={false} />
            <img
              src={frames.encodedUrl}
              alt="Encoded frame"
              className="ep-enc"
              draggable={false}
              style={{ clipPath: `inset(0 0 0 ${clipLeft})` }}
            />
          </div>
        </div>
        <div className="ep-divider" style={{ left: `${split * 100}%` }} onPointerDown={onDividerDown} />
        <span className="ep-tag left">Original</span>
        <span className="ep-tag right">Encoded</span>
      </div>
      <div className="cp-bar">
        <div className="seg" role="group" aria-label="Frame zoom">
          <button className={!zoom ? 'on' : ''} onClick={() => setZoom(false)}>
            Fit
          </button>
          <button className={zoom ? 'on' : ''} onClick={() => setZoom(true)}>
            100%
          </button>
        </div>
        <span className="sp-note">
          {frames.width ? `${frames.width}×${frames.height}` : ''} · {zoom ? 'drag to pan, ' : ''}drag the line to
          compare
        </span>
      </div>
    </div>
  )
}
