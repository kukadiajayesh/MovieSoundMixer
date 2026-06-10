import React, { useEffect, useRef } from 'react'
import { Icon } from './Icon'
import { LogLine, useJobStore } from '../../stores/jobStore'

const formatLine = (l: LogLine) => `[${l.ts}] ${l.tag.toUpperCase()} ${l.msg}`

export const LogDrawer: React.FC = () => {
  const logs = useJobStore((s) => s.logs)
  const collapsed = useJobStore((s) => s.drawerCollapsed)
  const setCollapsed = useJobStore((s) => s.setDrawerCollapsed)
  const clearLogs = useJobStore((s) => s.clearLogs)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [logs, collapsed])

  const errCount = logs.filter((l) => l.tag === 'error').length

  return (
    <div className={`drawer ${collapsed ? 'collapsed' : ''}`}>
      <div className="drawer-head" onClick={() => setCollapsed(!collapsed)}>
        <Icon name="chevron" className="caret" />
        <span className="title">Log Output</span>
        <span className="meta">{logs.length} lines</span>
        {errCount > 0 && (
          <span className="err-badge">
            {errCount} error{errCount !== 1 ? 's' : ''}
          </span>
        )}
        <div className="actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(logs.map(formatLine).join('\n'))
            }}
          >
            Copy
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              clearLogs()
            }}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="drawer-body" ref={bodyRef}>
        {logs.map((l, i) => (
          <div key={i} className={`log-line ${l.tag === 'cmd' ? 'cmd' : ''}`}>
            <span className="ts">{l.ts}</span>
            <span className={`tag ${l.tag}`}>[{l.tag.toUpperCase()}]</span>
            <span className="msg">{l.msg}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="log-line">
            <span className="msg" style={{ color: 'var(--fg-4)' }}>
              No log output yet — start a job to see FFmpeg output here.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
