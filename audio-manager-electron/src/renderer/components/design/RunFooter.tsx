import React from 'react'
import { Icon } from './Icon'

export interface OverallProgress {
  pct: number // 0..1
  completed: number
  total: number
  currentFile: string
}

interface RunFooterProps {
  outputDir: string
  setOutputDir: (dir: string) => void
  onBrowse: () => void
  running: boolean
  onRun: () => void
  onStop: () => void
  overall: OverallProgress
  runLabel: string
  canRun: boolean
  children?: React.ReactNode // extra controls (e.g. format selector) shown left of the run button
}

const fmtPct = (n: number) => `${Math.round(n * 100)}%`

export const RunFooter: React.FC<RunFooterProps> = ({
  outputDir,
  setOutputDir,
  onBrowse,
  running,
  onRun,
  onStop,
  overall,
  runLabel,
  canRun,
  children,
}) => {
  return (
    <div className="run-footer">
      {running ? (
        <>
          <div className="run-progress">
            <div className="rp-row">
              <span className="rp-current">{overall.currentFile || 'Processing…'}</span>
              <span className="rp-stats">
                {overall.completed}/{overall.total} · {fmtPct(overall.pct)}
              </span>
            </div>
            <div className="rp-bar">
              <span className="fill" style={{ transform: `scaleX(${overall.pct})` }} />
            </div>
          </div>
          <button className="btn btn-danger" onClick={onStop}>
            <Icon name="stop" />
            Stop
          </button>
        </>
      ) : (
        <>
          <div className="rf-output">
            <label>Output</label>
            <div className="rf-input">
              <input
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="Choose output folder…"
              />
              <button onClick={onBrowse}>Browse…</button>
            </div>
          </div>
          {children}
          <button className="btn btn-primary" disabled={!canRun || !outputDir} onClick={onRun}>
            <Icon name="play" />
            {runLabel}
          </button>
        </>
      )}
    </div>
  )
}
