import React, { useMemo, useState } from 'react'
import { useHistoryStore, HistoryItem } from '../stores/historyStore'
import { useFileStore } from '../stores/fileStore'
import { useMergeStore } from '../stores/mergeStore'
import { useUIStore } from '../stores/uiStore'
import { Icon } from '../components/design/Icon'
import { useToast } from '../components/design/Toasts'

const basename = (p: string) => p.substring(p.lastIndexOf(p.includes('\\') ? '\\' : '/') + 1)

export const History: React.FC = () => {
  const { history, removeHistoryItem, clearHistory } = useHistoryStore()
  const setPage = useUIStore((s) => s.setPage)
  const [search, setSearch] = useState('')
  const toast = useToast()

  // Re-queue a past run from its recorded source path. Extract jobs are re-probed
  // and dropped straight back into the Extract queue; merge jobs re-add the video
  // to the Merge queue (the external audio track is reassigned there).
  const handleRerun = async (item: HistoryItem) => {
    if (!item.inputPath) {
      toast({ kind: 'error', title: 'Cannot re-run', desc: 'No source path was recorded for this entry.' })
      return
    }
    if (!window.electron?.ipcRenderer) {
      toast({ kind: 'error', title: 'Re-run requires the Electron shell' })
      return
    }
    const path = item.inputPath
    const name = basename(path)

    if (item.operation === 'EXTRACT') {
      let duration = 0
      let streams: any[] = []
      let size = 0
      try {
        const res = await window.electron.ipcRenderer.invoke('probe-streams', path)
        if (res?.success) {
          duration = res.duration
          streams = res.streams
        }
      } catch {
        /* fall through with empty stream list */
      }
      try {
        const props = await window.electron.ipcRenderer.invoke('get-file-properties', path)
        if (props?.exists) size = props.size
        else {
          toast({ kind: 'error', title: 'Source file not found', desc: name })
          return
        }
      } catch {
        /* size stays unknown */
      }
      if (streams.length === 0) streams = [{ index: 0, codec: 'unknown', channels: 2 }]
      useFileStore.getState().addFiles([{ name, path, size, duration, streams }])
      setPage('extract')
      toast({ kind: 'ok', title: 'Re-queued for extraction', desc: name })
    } else {
      useMergeStore.getState().addFiles([{ name, path }])
      setPage('merge')
      toast({ kind: 'info', title: 'Video re-added to Merge', desc: 'Assign an audio track to run again.' })
    }
  }

  const filtered = useMemo(
    () =>
      history.filter(
        (h) =>
          !search ||
          h.file.toLowerCase().includes(search.toLowerCase()) ||
          h.operation.toLowerCase().includes(search.toLowerCase()),
      ),
    [history, search],
  )

  const handleExport = () => {
    const text = history
      .map((h) => `${h.date}\t${h.operation}\t${h.file}\t${h.duration}\t${h.status}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    toast({ kind: 'ok', title: 'History copied to clipboard' })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="ph-title">History</h1>
          <p className="ph-sub">Recent runs · completed file operations and their timing</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-ghost" onClick={handleExport} disabled={history.length === 0}>
            <Icon name="log" />
            Export
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              clearHistory()
              toast({ kind: 'info', title: 'History cleared' })
            }}
            disabled={history.length === 0}
          >
            <Icon name="trash" />
            Clear
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input placeholder="Search history…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="spacer" />
        <span className="chip-counter">
          {filtered.length}/{history.length} entries
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <Icon name="history" />
          <p className="title">{history.length === 0 ? 'No history yet' : 'No matches'}</p>
          <p className="sub">
            {history.length === 0
              ? 'Completed extract and merge runs will appear here.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="recents">
          {filtered.map((h) => (
            <div key={h.id} className={`recent-item ${h.status === 'Completed' ? 'ok' : 'error'}`}>
              <div className="ico">
                <Icon name={h.operation === 'EXTRACT' ? 'extract' : 'merge'} />
              </div>
              <div className="summary">
                <div className="name">{h.file}</div>
                <div className="when">
                  {h.date} · took {h.duration} · {h.status}
                </div>
              </div>
              <span className="pill">{h.operation.toLowerCase()}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-sm"
                  onClick={() => handleRerun(h)}
                  disabled={!h.inputPath}
                  title={h.inputPath ? 'Re-queue this run' : 'Source path not recorded'}
                >
                  <Icon name="play" />
                  Re-run
                </button>
                <button className="btn btn-sm" onClick={() => removeHistoryItem(h.id)} title="Remove entry">
                  <Icon name="close" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
