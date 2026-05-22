import React from 'react'

export interface ToolbarProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <div className={`toolbar ${className}`} style={style}>
      {children}
    </div>
  )
}

export const ToolbarGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`toolbar-group ${className}`}>{children}</div>
}
