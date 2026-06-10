import React, { useMemo, useState } from 'react'
import { useHistoryStore } from '../stores/historyStore'
import { Icon } from '../components/design/Icon'
import { useToast } from '../components/design/Toasts'

export const History: React.FC = () => {
  const { history, removeHistoryItem, clearHistory } = useHistoryStore()
  const [search, setSearch] = useState('')
  const toast = useToast()

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
              <button className="btn btn-sm" onClick={() => removeHistoryItem(h.id)} title="Remove entry">
                <Icon name="close" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
