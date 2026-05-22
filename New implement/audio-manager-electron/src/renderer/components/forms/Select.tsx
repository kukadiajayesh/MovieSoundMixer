import React, { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  disabled = false,
  className = '',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev)
    }
  }

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`select-wrapper ${className}`}
      style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}
    >
      {label && (
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg-1)' }}>
          {label}
        </span>
      )}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="select-trigger"
          onClick={handleToggle}
          disabled={disabled}
          style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
          <svg
            style={{
              width: '12px',
              height: '12px',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
              fill: 'currentColor',
            }}
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </button>

        {isOpen && (
          <div className="select-dropdown">
            {options.map((opt) => (
              <div
                key={opt.value}
                className={`select-option ${opt.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </div>
            ))}
            {options.length === 0 && (
              <div style={{ padding: '8px 12px', color: 'var(--fg-2)', fontSize: '13px', textAlign: 'center' }}>
                No options available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
