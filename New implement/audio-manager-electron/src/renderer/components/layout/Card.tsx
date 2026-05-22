import React from 'react'

export interface CardProps {
  title?: string | React.ReactNode
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  actions?: React.ReactNode
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  style,
  actions,
}) => {
  return (
    <div className={`card ${className}`} style={style}>
      {title && (
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {typeof title === 'string' ? <h3>{title}</h3> : title}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'inherit' }}>
        {children}
      </div>
    </div>
  )
}
