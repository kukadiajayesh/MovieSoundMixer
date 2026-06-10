import React from 'react'

export type RowStatus = 'ready' | 'probing' | 'running' | 'done' | 'error'

const fmtPct = (n: number) => `${Math.round(n * 100)}%`

export const StatusCell: React.FC<{ status: RowStatus; progress?: number; error?: string }> = ({
  status,
  progress = 0,
  error,
}) => {
  if (status === 'running') {
    return (
      <div className="status running">
        <span className="dot" />
        <span className="mini-prog">
          <span className="fill" style={{ transform: `scaleX(${progress})` }} />
        </span>
        <span className="pct">{fmtPct(progress)}</span>
      </div>
    )
  }
  if (status === 'done') {
    return (
      <div className="status done">
        <span className="dot" />
        <span>Done</span>
      </div>
    )
  }
  if (status === 'probing') {
    return (
      <div className="status probing">
        <span className="dot" />
        <span>Probing…</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="status error">
        <span className="dot" />
        <span title={error}>{error || 'Error'}</span>
      </div>
    )
  }
  return (
    <div className="status ready">
      <span className="dot" />
      <span>Ready</span>
    </div>
  )
}
