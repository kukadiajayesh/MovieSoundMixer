import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MergePair, audioOrdinal } from '../../stores/mergeStore'
import { fmtOffset } from '../../lib/mediaLabels'
import { Icon } from './Icon'
import { OffsetInput, OffsetSlider } from './SyncControls'

const PREVIEW_LENGTHS = [10, 20, 30] as const
type PreviewLength = (typeof PREVIEW_LENGTHS)[number]

// "1:05", "1:02:03" or plain seconds ("65") -> seconds; null if unparseable.
const parseTime = (text: string): number | null => {
  const parts = text.trim().split(':')
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0)
}

const fmtTime = (sec: number): string => {
  const s = Math.floor(sec % 60)
  const m = Math.floor(sec / 60) % 60
  const h = Math.floor(sec / 3600)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

type Preview =
  | { status: 'idle' }
  | { status: 'rendering' }
  | {
      status: 'ready'
      url: string
      offsetMs: number
      startSec: number
      length: number
      track: number
    }
  | { status: 'error'; error: string }

interface SyncPopoverProps {
  pair: MergePair
  anchor: HTMLElement
  onChange: (ms: number) => void
  // Picks which of the audio file's streams to use (absolute stream index).
  // Shared with the row's channel chip, so the preview plays what gets merged.
  onPickTrack: (streamIndex: number) => void
  onClose: () => void
}

// Per-file A/V sync: set one row's audio offset, and render a short clip with
// the shift applied to check it by ear before merging.
export const SyncPopover: React.FC<SyncPopoverProps> = ({ pair, anchor, onChange, onPickTrack, onClose }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [length, setLength] = useState<PreviewLength>(10)
  const [startText, setStartText] = useState('0:00')
  const [preview, setPreview] = useState<Preview>({ status: 'idle' })
  // Ignores a render that finishes after a newer one was requested.
  const requestId = useRef(0)

  const offsetMs = pair.audioOffsetMs ?? 0
  const streams = pair.audio?.streams ?? []
  const track = pair.audio ? audioOrdinal(pair.audio) : 0
  const startSec = parseTime(startText)
  const maxStart = pair.video.duration ? Math.max(0, Math.floor(pair.video.duration - length)) : undefined
  const startError =
    startSec === null
      ? 'Use m:ss or seconds'
      : maxStart !== undefined && startSec > maxStart
        ? `Must be ${fmtTime(maxStart)} or earlier`
        : null

  // Below the chip if it fits, otherwise above it; kept inside the window
  // and re-placed when the clip appears and makes the popover taller.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const place = () => {
      const a = anchor.getBoundingClientRect()
      const { width, height } = el.getBoundingClientRect()
      const below = a.bottom + 4
      const top = below + height <= window.innerHeight - 8 ? below : Math.max(8, a.top - 4 - height)
      const left = Math.max(8, Math.min(a.left, window.innerWidth - width - 8))
      setPos({ left, top })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(el)
    return () => ro.disconnect()
  }, [anchor])

  // Focus the ms box once placed; it can't take focus while still hidden.
  const placed = pos !== null
  useEffect(() => {
    if (placed) ref.current?.querySelector<HTMLInputElement>('.sync-input input')?.focus()
  }, [placed])

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.sync-pop') && !target.closest('.sync-pick')) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', onDocDown), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Stop an unfinished render when the popover closes.
  useEffect(
    () => () => {
      requestId.current++
      window.electron?.ipcRenderer?.invoke('cancel-sync-preview', pair.id).catch(() => {})
    },
    [pair.id],
  )

  // Free the previous clip whenever it's replaced or the popover closes.
  const url = preview.status === 'ready' ? preview.url : null
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )

  const renderPreview = async () => {
    const ipc = window.electron?.ipcRenderer
    if (!ipc || !pair.audio || startSec === null || startError) return
    const id = ++requestId.current
    setPreview({ status: 'rendering' })
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
    if (id !== requestId.current) return
    if (!res?.success) {
      setPreview({ status: 'error', error: res?.error || 'Preview failed' })
      return
    }
    const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'video/mp4' }))
    setPreview({ status: 'ready', url: blobUrl, offsetMs, startSec, length, track })
  }

  const stale =
    preview.status === 'ready' &&
    (preview.offsetMs !== offsetMs ||
      preview.startSec !== startSec ||
      preview.length !== length ||
      preview.track !== track)

  return (
    <>
      {/* Dims the page so the popover and its preview stand out. A click on
          it is an outside click, which closes the popover. */}
      <div className="sync-backdrop" aria-hidden="true" />
      <div
        ref={ref}
        className="popover sync-pop"
        style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
        role="dialog"
        aria-label={`Audio sync for ${pair.video.name}`}
      >
        <div className="sp-head">Audio sync</div>
        <div className="sp-file" title={pair.video.name}>
          {pair.video.name}
        </div>

        <div className="sync-row">
          <OffsetSlider offsetMs={offsetMs} onChange={onChange} />
        </div>
        <div className="sync-row sp-controls">
          <OffsetInput offsetMs={offsetMs} onChange={onChange} />
          <span className="sp-desc">{offsetMs === 0 ? 'No shift' : fmtOffset(offsetMs)}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onChange(0)} disabled={offsetMs === 0}>
            Reset
          </button>
        </div>

        <div className="sp-preview">
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
          <div className="sync-row">
            <div className="seg sp-lengths" role="group" aria-label="Preview length">
              {PREVIEW_LENGTHS.map((n) => (
                <button key={n} className={length === n ? 'on' : ''} onClick={() => setLength(n)}>
                  {n} s
                </button>
              ))}
            </div>
            <label className="sync-input">
              from
              <input
                className={`sp-start ${startError ? 'invalid' : ''}`}
                value={startText}
                onChange={(e) => setStartText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void renderPreview()
                }}
                aria-label="Preview start time"
                aria-invalid={!!startError}
              />
            </label>
            <button
              className="btn btn-primary btn-sm sp-go"
              onClick={() => void renderPreview()}
              disabled={!pair.audio || !!startError || preview.status === 'rendering'}
            >
              <Icon name="play" />
              {preview.status === 'rendering' ? 'Rendering…' : preview.status === 'ready' ? 'Preview again' : 'Preview'}
            </button>
          </div>
          {startError && <div className="sp-note err">{startError}</div>}
          {preview.status === 'error' && <div className="sp-note err">{preview.error}</div>}
          {preview.status === 'ready' && (
            <>
              <video className="sp-video" src={preview.url} controls autoPlay />
              <div className={`sp-note ${stale ? 'warn' : ''}`}>
                {stale
                  ? 'Settings changed since this clip. Preview again to hear them.'
                  : `${fmtTime(preview.startSec)}–${fmtTime(preview.startSec + preview.length)} · ${
                      preview.offsetMs === 0 ? 'no shift' : fmtOffset(preview.offsetMs)
                    } · track ${preview.track + 1} of the new audio only`}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
