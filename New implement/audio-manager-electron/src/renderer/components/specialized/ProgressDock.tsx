import React from 'react'
import { ProgressBar } from '../indicators/ProgressBar'
import { Button } from '../buttons/Button'

export interface ProgressStats {
  queued: number
  active: number
  completed: number
  failed: number
}

export interface ProgressDockProps {
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'failed'
  totalFiles: number
  processedFiles: number
  activeFileName?: string
  percentComplete: number
  stats: ProgressStats
  onCancel: () => void
  onPause?: () => void
  showLogs: boolean
  onToggleLogs: () => void
}

export const ProgressDock: React.FC<ProgressDockProps> = ({
  status,
  totalFiles,
  processedFiles,
  activeFileName,
  percentComplete,
  stats,
  onCancel,
  onPause,
  showLogs,
  onToggleLogs,
}) => {
  if (status === 'idle') return null

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return `Extracting tracks: ${processedFiles} of ${totalFiles} complete`
      case 'paused':
        return 'Queue paused'
      case 'completed':
        return 'All tasks successfully completed!'
      case 'failed':
        return 'Queue finished with errors'
      default:
        return ''
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '260px', // Matches sidebar width
        right: 0,
        backgroundColor: 'var(--bg-1)',
        borderTop: '1px solid var(--line)',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.2)',
        padding: 'var(--spacing-4) var(--spacing-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-3)',
        zIndex: 500,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--spacing-6)',
          flexWrap: 'wrap',
        }}
      >
        {/* Status text & details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '240px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg-0)' }}>
            {getStatusText()}
          </span>
          {status === 'processing' && activeFileName && (
            <span style={{ fontSize: '12px', color: 'var(--fg-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
              Active: {activeFileName}
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '10px', color: 'var(--fg-2)', fontWeight: 600 }}>QUEUED</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fg-1)' }}>{stats.queued}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>ACTIVE</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>{stats.active}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '10px', color: 'var(--ok)', fontWeight: 600 }}>COMPLETED</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ok)' }}>{stats.completed}</span>
          </div>
          {stats.failed > 0 && (
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--err)', fontWeight: 600 }}>FAILED</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--err)' }}>{stats.failed}</span>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLogs}
            icon={
              <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            }
          >
            {showLogs ? 'Hide Logs' : 'Show Logs'}
          </Button>

          {onPause && status === 'processing' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPause}
              icon={
                <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                </svg>
              }
            >
              Pause
            </Button>
          )}

          {status !== 'completed' && status !== 'failed' && (
            <Button
              variant="danger"
              size="sm"
              onClick={onCancel}
              icon={
                <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              }
            >
              Cancel
            </Button>
          )}

          {(status === 'completed' || status === 'failed') && (
            <Button variant="primary" size="sm" onClick={onCancel}>
              Clear Queue
            </Button>
          )}
        </div>
      </div>

      {/* Progress tracking bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginTop: '4px' }}>
        <ProgressBar value={percentComplete} showPercentage height="8px" style={{ flex: 1 }} />
      </div>
    </div>
  )
}
