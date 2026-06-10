import React, { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { AudioStream } from '../../stores/fileStore'

interface StreamPickerProps {
  streams: AudioStream[]
  pickedIndex: number
  anchor: HTMLElement
  onPick: (index: number) => void
  onClose: () => void
}

export const StreamPicker: React.FC<StreamPickerProps> = ({
  streams,
  pickedIndex,
  anchor,
  onPick,
  onClose,
}) => {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    setPos({ left: r.left, top: r.bottom + 4 })
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.popover') && !target.closest('.stream-pick')) onClose()
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [anchor, onClose])

  if (!pos) return null

  return (
    <div className="popover" style={{ left: pos.left, top: pos.top }}>
      {streams.map((s) => (
        <div
          key={s.index}
          className={`po-item ${s.index === pickedIndex ? 'active' : ''}`}
          onClick={() => {
            onPick(s.index)
            onClose()
          }}
        >
          <span className="po-check">{s.index === pickedIndex ? <Icon name="check" /> : null}</span>
          <span className="badges">
            <span className="codec">{s.codec.toUpperCase()}</span>
            {s.language && <span className="lang">{s.language.toUpperCase()}</span>}
          </span>
          <span className="label">Stream a:{s.index}</span>
          <span className="ch">{s.channels}ch</span>
        </div>
      ))}
    </div>
  )
}
