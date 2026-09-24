import React, { useState } from 'react'
import { fmtOffset } from '../../lib/mediaLabels'

// Offset controls for a row's sync popover.
//
// The slider covers everyday drift; bigger shifts (a cut intro or recap) can
// still be typed, up to MAX_OFFSET_MS. Keep MAX_OFFSET_MS in step with
// MAX_AUDIO_OFFSET_MS in src/main/ipc.ts, which rejects anything beyond it.
export const SLIDER_RANGE_MS = 5000
export const MAX_OFFSET_MS = 600_000

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))

interface OffsetProps {
  offsetMs: number
  onChange: (ms: number) => void
}

export const OffsetSlider: React.FC<OffsetProps> = ({ offsetMs, onChange }) => {
  const sliderValue = clamp(offsetMs, SLIDER_RANGE_MS)
  // Fill the track from 0 to the thumb: rightwards for a delay, leftwards
  // for an advance.
  const thumbPct = ((sliderValue + SLIDER_RANGE_MS) / (2 * SLIDER_RANGE_MS)) * 100
  const fillStyle = {
    '--fill-from': `${Math.min(50, thumbPct)}%`,
    '--fill-to': `${Math.max(50, thumbPct)}%`,
  } as React.CSSProperties

  return (
    <>
      <span className="sync-end">−{SLIDER_RANGE_MS / 1000} s</span>
      <input
        type="range"
        className="sync-slider"
        min={-SLIDER_RANGE_MS}
        max={SLIDER_RANGE_MS}
        step={10}
        value={sliderValue}
        style={fillStyle}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Audio offset"
        aria-valuetext={offsetMs === 0 ? 'No shift' : fmtOffset(offsetMs)}
      />
      <span className="sync-end">+{SLIDER_RANGE_MS / 1000} s</span>
    </>
  )
}

export const OffsetInput: React.FC<OffsetProps> = ({ offsetMs, onChange }) => {
  // Raw text while the box is being edited, so partial input like "-" isn't
  // snapped back to a number mid-keystroke. null shows the committed value.
  // Using the slider or a button moves focus away, which clears it.
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <label className="sync-input">
      <input
        type="number"
        step={1}
        min={-MAX_OFFSET_MS}
        max={MAX_OFFSET_MS}
        value={draft ?? String(offsetMs)}
        onChange={(e) => {
          const text = e.target.value
          setDraft(text)
          const ms = Number(text)
          if (text.trim() !== '' && Number.isFinite(ms)) onChange(clamp(Math.round(ms), MAX_OFFSET_MS))
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        aria-label="Audio offset in milliseconds"
      />
      ms
    </label>
  )
}
