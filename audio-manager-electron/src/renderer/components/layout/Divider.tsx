import React from 'react'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  margin?: string
  className?: string
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  margin,
  className = '',
}) => {
  const isHorizontal = orientation === 'horizontal'

  const style: React.CSSProperties = {
    backgroundColor: 'var(--line)',
    ...(isHorizontal
      ? {
          width: '100%',
          height: '1px',
          margin: margin || '12px 0',
        }
      : {
          width: '1px',
          height: '100%',
          margin: margin || '0 12px',
          alignSelf: 'stretch',
        }),
  }

  return <div className={`divider ${className}`} style={style} />
}
