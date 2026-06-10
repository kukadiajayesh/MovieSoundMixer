import React, { useRef, useEffect } from 'react'

export interface LogViewerProps {
  logs: string[]
  onClear: () => void
  onExport?: () => void
  maxHeight?: string
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  onClear,
  onExport,
  maxHeight = '180px',
}) => {
  const terminalRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom when new logs are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--line)',
        backgroundColor: '#0c0c0c', // Pure dark for CLI terminal feel
        color: '#a9b7c6', // IntelliJ/Monospace default light gray
        fontFamily: 'Consolas, Monaco, "Courier New", Courier, monospace',
        fontSize: '11px',
        lineHeight: '1.4',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* Terminal Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #2d2d2d',
          padding: '4px 12px',
          height: '28px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
          <span style={{ marginLeft: '6px', fontWeight: 600, color: '#808080', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Console output
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {onExport && (
            <button
              onClick={onExport}
              style={{
                background: 'none',
                border: 'none',
                color: '#808080',
                cursor: 'pointer',
                fontSize: '10px',
                padding: '2px 6px',
              }}
              title="Copy all logs"
            >
              Copy
            </button>
          )}
          <button
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#808080',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px 6px',
            }}
            title="Clear logs"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={terminalRef}
        style={{
          padding: '12px',
          overflowY: 'auto',
          maxHeight,
          minHeight: '80px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '4px' }}>
            {log}
          </div>
        ))}
        {logs.length === 0 && (
          <div style={{ color: '#555555', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
            No process output logs captured yet.
          </div>
        )}
      </div>
    </div>
  )
}
