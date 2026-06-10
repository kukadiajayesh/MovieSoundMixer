import React from 'react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-3)',
        borderBottom: '1px solid var(--line)',
        paddingBottom: 'var(--spacing-4)',
        marginBottom: 'var(--spacing-2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--spacing-4)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 'var(--title-size)', fontWeight: 'var(--title-weight)', color: 'var(--fg-0)', margin: 0 }}>
            {title}
          </h2>
          {subtitle && (
            <span style={{ fontSize: '12px', color: 'var(--fg-2)', marginTop: '4px' }}>
              {subtitle}
            </span>
          )}
        </div>
        {children && <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{children}</div>}
      </div>
    </div>
  )
}
