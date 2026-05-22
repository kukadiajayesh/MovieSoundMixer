import React from 'react'

export interface StatusBadgeProps {
  status: 'ok' | 'warn' | 'error' | 'accent'
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  className = '',
  style,
}) => {
  const badgeClass = `badge badge-${status}`

  return (
    <span className={`${badgeClass} ${className}`} style={style}>
      {children}
    </span>
  )
}
