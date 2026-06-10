import React, { useState, useRef, useEffect } from 'react'

export interface AudioStream {
  index: number
  language?: string
  codec: string
  channels: number
}

export interface StreamSelectorProps {
  streams: AudioStream[]
  value: number
  onChange: (index: number) => void
  disabled?: boolean
  className?: string
}

export const StreamSelector: React.FC<StreamSelectorProps> = ({
  streams,
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedStream = streams.find((s) => s.index === value) || streams[0]

  const handleToggle = () => {
    if (!disabled && streams.length > 0) {
      setIsOpen((prev) => !prev)
    }
  }

  const handleSelect = (idx: number) => {
    onChange(idx)
    setIsOpen(false)
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const renderStreamLabel = (stream: AudioStream) => {
    if (!stream) return 'No audio streams found'
    const langSuffix = stream.language ? ` [${stream.language.toUpperCase()}]` : ''
    const channelLabel = stream.channels === 1 ? '1ch' : stream.channels === 2 ? 'Stereo' : `${stream.channels}ch`
    return `#${stream.index}: ${stream.codec.toUpperCase()} (${channelLabel})${langSuffix}`
  }

  return (
    <div
      ref={containerRef}
      className={`select-wrapper ${className}`}
      style={{ minWidth: '180px' }}
    >
      <button
        type="button"
        className="select-trigger"
        onClick={handleToggle}
        disabled={disabled || streams.length === 0}
        style={{
          opacity: disabled || streams.length === 0 ? 0.5 : 1,
          cursor: disabled || streams.length === 0 ? 'not-allowed' : 'pointer',
          padding: 'var(--spacing-1) var(--spacing-3)',
          fontSize: '12px',
          height: '32px',
        }}
      >
        <span>{selectedStream ? renderStreamLabel(selectedStream) : 'No audio tracks'}</span>
        <svg style={{ width: '10px', height: '10px', fill: 'currentColor' }} viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {isOpen && (
        <div className="select-dropdown" style={{ minWidth: '220px', right: 0 }}>
          {streams.map((stream) => (
            <div
              key={stream.index}
              className={`select-option ${stream.index === value ? 'selected' : ''}`}
              onClick={() => handleSelect(stream.index)}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              {renderStreamLabel(stream)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
