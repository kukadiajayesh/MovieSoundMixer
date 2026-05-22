import React from 'react'

export type AudioFormat = 'copy' | 'mp3' | 'aac' | 'flac'

export interface FormatSelectorProps {
  value: AudioFormat
  onChange: (format: AudioFormat) => void
  disabled?: boolean
  label?: string
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'Output Audio Format',
}) => {
  const formats: Array<{ id: AudioFormat; name: string; desc: string }> = [
    { id: 'copy', name: 'Direct Copy', desc: 'Fastest (no re-encoding)' },
    { id: 'mp3', name: 'MP3', desc: 'Standard compressed format' },
    { id: 'aac', name: 'AAC', desc: 'High quality modern format' },
    { id: 'flac', name: 'FLAC', desc: 'Lossless studio format' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && (
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-1)' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
        {formats.map((fmt) => {
          const isSelected = fmt.id === value
          return (
            <button
              key={fmt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(fmt.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: 'var(--spacing-2) var(--spacing-4)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: isSelected ? 'var(--accent)' : 'var(--line)',
                backgroundColor: isSelected ? 'rgba(0, 217, 255, 0.08)' : 'var(--bg-1)',
                color: isSelected ? 'var(--accent)' : 'var(--fg-1)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                minWidth: '140px',
                outline: 'none',
                textAlign: 'left',
                transition: 'all 0.15s ease-in-out',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--fg-0)' }}>
                {fmt.name}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--fg-2)', marginTop: '2px' }}>
                {fmt.desc}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
