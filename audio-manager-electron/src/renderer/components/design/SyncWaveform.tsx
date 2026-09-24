import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fmtClock, fmtOffsetShort } from '../../lib/mediaLabels'
import { MAX_OFFSET_MS } from './SyncControls'

// Peaks for a stretch of one audio stream, in that file's own timeline.
export interface WaveLane {
  peaks: Float32Array
  startSec: number // file time of peaks[0]
  bucketMs: number
}

// What a lane shows: its peaks, or why there are none.
export type LaneState = { lane: WaveLane } | { message: string }

interface SyncWaveformProps {
  // The stretch of the video on screen (video time).
  windowStart: number
  windowLength: number
  original: LaneState
  added: LaneState
  offsetMs: number
  // Seconds into the window, or null to hide the playhead.
  playhead: number | null
  onSeek?: (secIntoWindow: number) => void
  onOffsetChange: (ms: number) => void
}

const LANE_H = 52
const GAP = 8
const HEIGHT = LANE_H * 2 + GAP
// Pointer travel below this is a click (seek), not a drag.
const DRAG_THRESHOLD_PX = 3

// Draws one lane: for each pixel column, the loudest peak in the stretch of
// file time it covers, as a bar centred on the lane's midline. `shiftSec` maps
// video time to the lane's file time (the new track plays offset later).
function drawLane(
  ctx: CanvasRenderingContext2D,
  lane: WaveLane,
  top: number,
  width: number,
  windowStart: number,
  windowLength: number,
  shiftSec: number,
  color: string,
) {
  const { peaks, startSec, bucketMs } = lane
  // Scale each lane to its own loudest peak so quiet tracks stay readable.
  let norm = 0.1
  for (let i = 0; i < peaks.length; i++) if (peaks[i] > norm) norm = peaks[i]
  const mid = top + LANE_H / 2
  const secPerPx = windowLength / width
  ctx.fillStyle = color
  for (let x = 0; x < width; x++) {
    const fileT0 = windowStart + x * secPerPx - shiftSec
    const i0 = Math.floor(((fileT0 - startSec) * 1000) / bucketMs)
    const i1 = Math.max(i0 + 1, Math.ceil(((fileT0 + secPerPx - startSec) * 1000) / bucketMs))
    if (i1 <= 0 || i0 >= peaks.length) continue
    let v = 0
    for (let i = Math.max(0, i0); i < Math.min(peaks.length, i1); i++) if (peaks[i] > v) v = peaks[i]
    const h = Math.max(1, (v / norm) * (LANE_H - 4))
    ctx.fillRect(x, mid - h / 2, 1, h)
  }
}

// Two stacked waveforms over the same stretch of video: the video's own audio
// and the new track with the current offset applied. Lining up their peaks
// lines up the sync. Drag the new track to shift it; click to seek.
export const SyncWaveform: React.FC<SyncWaveformProps> = ({
  windowStart,
  windowLength,
  original,
  added,
  offsetMs,
  playhead,
  onSeek,
  onOffsetChange,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  // Bumped when the theme changes, so the lanes redraw in the new colours.
  const [themeTick, setThemeTick] = useState(0)
  const drag = useRef<{ x: number; startOffset: number; moved: boolean } | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(Math.floor(el.clientWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const mo = new MutationObserver(() => setThemeTick((n) => n + 1))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = HEIGHT * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, HEIGHT)
    const css = getComputedStyle(canvas)
    const laneBg = css.getPropertyValue('--bg-3').trim()
    for (const top of [0, LANE_H + GAP]) {
      ctx.fillStyle = laneBg
      ctx.fillRect(0, top, width, LANE_H)
    }
    if ('lane' in original) {
      drawLane(ctx, original.lane, 0, width, windowStart, windowLength, 0, css.getPropertyValue('--fg-3').trim())
    }
    if ('lane' in added) {
      drawLane(
        ctx,
        added.lane,
        LANE_H + GAP,
        width,
        windowStart,
        windowLength,
        offsetMs / 1000,
        css.getPropertyValue('--audio').trim(),
      )
    }
  }, [width, original, added, offsetMs, windowStart, windowLength, themeTick])

  const secAt = (clientX: number) => {
    const r = wrapRef.current!.getBoundingClientRect()
    return Math.max(0, Math.min(windowLength, ((clientX - r.left) / r.width) * windowLength))
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const onAddedLane = e.clientY - r.top > LANE_H + GAP / 2
    if (onAddedLane) {
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { x: e.clientX, startOffset: offsetMs, moved: false }
    } else {
      onSeek?.(secAt(e.clientX))
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || width === 0) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return
    d.moved = true
    // Dragging right plays the new track later (a positive offset).
    const ms = Math.round((d.startOffset + (dx * windowLength * 1000) / width) / 10) * 10
    onOffsetChange(Math.max(-MAX_OFFSET_MS, Math.min(MAX_OFFSET_MS, ms)))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) onSeek?.(secAt(e.clientX))
  }

  const laneMessage = (s: LaneState) => ('message' in s ? <span className="sw-msg">{s.message}</span> : null)

  return (
    <div className="sw">
      <div
        ref={wrapRef}
        className={`sw-canvas ${onSeek ? 'seekable' : ''}`}
        style={{ height: HEIGHT }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: HEIGHT }} aria-hidden="true" />
        <div className="sw-lane-label" style={{ top: 4 }}>
          Original audio {laneMessage(original)}
        </div>
        <div className="sw-lane-label added" style={{ top: LANE_H + GAP + 4 }}>
          New track{offsetMs !== 0 ? ` · ${fmtOffsetShort(offsetMs)}` : ''} {laneMessage(added)}
        </div>
        <div className="sw-added-hit" style={{ top: LANE_H + GAP, height: LANE_H }} data-tip="Drag to shift the new track" />
        {playhead !== null && <div className="sw-playhead" style={{ left: `${(playhead / windowLength) * 100}%` }} />}
      </div>
      <div className="sw-axis">
        <span>{fmtClock(windowStart)}</span>
        <span>{fmtClock(windowStart + windowLength / 2)}</span>
        <span>{fmtClock(windowStart + windowLength)}</span>
      </div>
    </div>
  )
}
