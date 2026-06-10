import React from 'react'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
  style?: React.CSSProperties
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'var(--accent)',
  className = '',
  style,
}) => {
  const getPixelSize = () => {
    switch (size) {
      case 'sm':
        return '16px'
      case 'lg':
        return '40px'
      default:
        return '24px'
    }
  }

  const pixelSize = getPixelSize()

  return (
    <svg
      className={`animate-spin ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        color,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
        style={{ opacity: 0.2 }}
      />
      <path
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        fill="currentColor"
      />
    </svg>
  )
}
