import React, { useMemo, useState } from 'react'
import { useHistoryStore, HistoryItem } from '../stores/historyStore'
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

  // Re-queue a past merge run from its recorded source path: re-adds the video
  // to the Merge queue (the external audio track is reassigned there). Extract
  // Audio has been removed, so older EXTRACT entries can't be re-queued.
  const handleRerun = (item: HistoryItem) => {
    if (item.operation === 'EXTRACT') {
      toast({
        kind: 'info',
        title: 'Extract Audio has been removed',
        desc: 'Pick the source video directly in Merge Audio and choose its audio channel there instead.',
      })
      return
    }
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

    useMergeStore.getState().addFiles([{ name, path }])
    setPage('merge')
    toast({ kind: 'info', title: 'Video re-added to Merge', desc: 'Assign an audio track to run again.' })
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
              ? 'Completed merge runs will appear here.'
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
                  aria-label={h.inputPath ? 'Re-queue this run' : 'Source path not recorded'}
                  data-tip={h.inputPath ? 'Re-queue this run' : 'Source path not recorded'}
                >
                  <Icon name="play" />
                  Re-run
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => removeHistoryItem(h.id)}
                  aria-label="Remove entry"
                  data-tip="Remove entry"
                >
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
