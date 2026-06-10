import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  mono?: boolean
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  mono = false,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`

  let inputClasses = 'input-field'
  if (error) inputClasses += ' input-error'
  if (mono) inputClasses += ' input-mono'
  if (className) inputClasses += ` ${className}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--fg-1)',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={inputClasses}
        {...props}
      />
      {error && (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--err)',
            fontWeight: 500,
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
