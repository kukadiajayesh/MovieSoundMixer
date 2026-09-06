import React, { useEffect, useMemo, useRef } from 'react'
import { Icon } from './Icon'
import { LogLine, useJobStore } from '../../stores/jobStore'

const formatLine = (l: LogLine, count = 1) =>
  `[${l.ts}] ${l.tag.toUpperCase()} ${l.msg}${count > 1 ? ` (×${count})` : ''}`

interface GroupedLog {
  line: LogLine
  count: number
}

// Collapse consecutive lines with identical tag+text into a single entry with
// a repeat count, so a noisy source (e.g. ffmpeg repeating the same status
// line) doesn't flood the drawer with duplicates.
const groupConsecutiveDuplicates = (logs: LogLine[]): GroupedLog[] => {
  const grouped: GroupedLog[] = []
  for (const line of logs) {
    const last = grouped[grouped.length - 1]
    if (last && last.line.tag === line.tag && last.line.msg === line.msg) {
      last.count += 1
      last.line = line // keep the most recent timestamp for the group
    } else {
      grouped.push({ line, count: 1 })
    }
  }
  return grouped
}

export const LogDrawer: React.FC = () => {
  const logs = useJobStore((s) => s.logs)
  const collapsed = useJobStore((s) => s.drawerCollapsed)
  const setCollapsed = useJobStore((s) => s.setDrawerCollapsed)
  const clearLogs = useJobStore((s) => s.clearLogs)
  const bodyRef = useRef<HTMLDivElement>(null)
  // Only auto-scroll while the user hasn't scrolled away from the bottom,
  // so reading older lines during a run doesn't get yanked back down.
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    // Opening the drawer always lands at the latest line.
    if (!collapsed && bodyRef.current) {
      stickToBottomRef.current = true
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [collapsed])

  useEffect(() => {
    if (stickToBottomRef.current && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [logs])

  const handleScroll = () => {
    const el = bodyRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }

  const errCount = logs.filter((l) => l.tag === 'error').length
  const groupedLogs = useMemo(() => groupConsecutiveDuplicates(logs), [logs])

  return (
    <div className={`drawer ${collapsed ? 'collapsed' : ''}`}>
      <div className="drawer-head" onClick={() => setCollapsed(!collapsed)}>
        <Icon name="chevron" className="caret" />
        <span className="title">Log Output</span>
        <span className="meta">{groupedLogs.length} lines</span>
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
              navigator.clipboard.writeText(
                groupedLogs.map((g) => formatLine(g.line, g.count)).join('\n')
              )
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
      <div className="drawer-body" ref={bodyRef} onScroll={handleScroll}>
        {groupedLogs.map((g, i) => (
          <div key={i} className={`log-line ${g.line.tag === 'cmd' ? 'cmd' : ''}`}>
            <span className="ts">{g.line.ts}</span>
            <span className={`tag ${g.line.tag}`}>[{g.line.tag.toUpperCase()}]</span>
            <span className="msg">{g.line.msg}</span>
            {g.count > 1 && <span className="repeat-count">×{g.count}</span>}
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
