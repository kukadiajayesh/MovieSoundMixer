import React from 'react'

export interface StatusIndicatorProps {
  status: 'ok' | 'warn' | 'error' | 'accent' | 'inactive'
  label: string
  className?: string
  style?: React.CSSProperties
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className = '',
  style,
}) => {
  const getDotClass = () => {
    switch (status) {
      case 'ok':
        return 'dot-ok'
      case 'warn':
        return 'dot-warn'
      case 'error':
        return 'dot-error'
      case 'accent':
        return 'dot-accent'
      default:
        return ''
    }
  }

  const dotStyle: React.CSSProperties = {
    backgroundColor: status === 'inactive' ? 'var(--bg-3)' : undefined,
    border: status === 'inactive' ? '1px solid var(--line)' : undefined,
  }

  return (
    <div
      className={`status-item ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-2)', ...style }}
    >
      <span className={`status-dot ${getDotClass()}`} style={dotStyle} />
      <span style={{ fontSize: '13px', color: 'var(--fg-1)' }}>{label}</span>
    </div>
  )
}
