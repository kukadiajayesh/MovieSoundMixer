import React from 'react'

export interface ProgressBarProps {
  value?: number
  indeterminate?: boolean
  showPercentage?: boolean
  height?: string
  className?: string
  style?: React.CSSProperties
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  indeterminate = false,
  showPercentage = false,
  height = '6px',
  className = '',
  style,
}) => {
  const boundedValue = Math.min(100, Math.max(0, value))

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        ...style,
      }}
      className={className}
    >
      <div
        className="progress-bar-container"
        style={{ height }}
      >
        {indeterminate ? (
          <div className="progress-bar-indeterminate" />
        ) : (
          <div
            className="progress-bar-fill"
            style={{ width: `${boundedValue}%` }}
          />
        )}
      </div>
      {showPercentage && !indeterminate && (
        <span style={{ fontSize: '11px', color: 'var(--fg-2)', alignSelf: 'flex-end', fontWeight: 500 }}>
          {Math.round(boundedValue)}%
        </span>
      )}
    </div>
  )
}
