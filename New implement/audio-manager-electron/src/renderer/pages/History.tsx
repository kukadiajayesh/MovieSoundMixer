import React, { useState } from 'react'
import { useHistoryStore, HistoryItem } from '../stores/historyStore'
import { Toolbar, ToolbarGroup } from '../components/layout/Toolbar'
import { Button } from '../components/buttons/Button'
import { Input } from '../components/forms/Input'
import { Divider } from '../components/layout/Divider'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/tables/Table'
import { StatusBadge } from '../components/indicators/StatusBadge'
import { Modal } from '../components/overlays/Modal'
import { LogViewer } from '../components/specialized/LogViewer'
import { ToastContainer } from '../components/overlays/Toast'

export const History: React.FC = () => {
  // Store Subscriptions
  const { history, clearHistory, removeHistoryItem, loadHistory } = useHistoryStore()

  // Load history records from SQLite database on mount
  React.useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Local Selection/Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'extract' | 'merge'>('all')
  const [selectedLogsItem, setSelectedLogsItem] = useState<HistoryItem | null>(null)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>>([])

  // Toast Helpers
  const triggerToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newToast = { id: Math.random().toString(), message, type }
    setToasts((prev) => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Clear handler
  const handleClearHistory = () => {
    clearHistory()
    setIsClearConfirmOpen(false)
    triggerToast('Conversion history cleared.', 'warning')
  }

  // Export CSV mock handler
  const handleExportHistory = () => {
    if (history.length === 0) {
      triggerToast('No history records to export!', 'error')
      return
    }
    triggerToast('Exported conversion history successfully to downloads folder!', 'success')
  }

  // Filter history records
  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.operation.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      activeCategory === 'all' ||
      (activeCategory === 'extract' && item.operation.toUpperCase().includes('EXTRACT')) ||
      (activeCategory === 'merge' && item.operation.toUpperCase().includes('MERGE'))

    return matchesSearch && matchesCategory
  })

  return (
    <div className="page-container animate-fade-in">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Filter and operation category Toolbar */}
      <Toolbar>
        <ToolbarGroup>
          {/* Category Selector Buttons */}
          <button
            onClick={() => setActiveCategory('all')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeCategory === 'all' ? 'var(--accent)' : 'transparent',
              color: activeCategory === 'all' ? '#000000' : 'var(--fg-1)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            All Operations
          </button>
          <button
            onClick={() => setActiveCategory('extract')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeCategory === 'extract' ? 'var(--accent)' : 'transparent',
              color: activeCategory === 'extract' ? '#000000' : 'var(--fg-1)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            Extractions
          </button>
          <button
            onClick={() => setActiveCategory('merge')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: activeCategory === 'merge' ? 'var(--accent)' : 'transparent',
              color: activeCategory === 'merge' ? '#000000' : 'var(--fg-1)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            Merges
          </button>

          <Divider orientation="vertical" margin="0 8px" />

          {/* Action CTAs */}
          <Button variant="ghost" size="sm" onClick={handleExportHistory} disabled={history.length === 0}>
            Export CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsClearConfirmOpen(true)} disabled={history.length === 0}>
            Clear History
          </Button>
        </ToolbarGroup>

        <ToolbarGroup>
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '220px', height: '32px', padding: '4px 8px' }}
          />
        </ToolbarGroup>
      </Toolbar>

      {/* History log rows list */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader style={{ width: '180px' }}>Date / Time</TableCell>
            <TableCell isHeader>Target Filename</TableCell>
            <TableCell isHeader style={{ width: '160px' }}>Operation</TableCell>
            <TableCell isHeader style={{ width: '100px' }}>Duration</TableCell>
            <TableCell isHeader style={{ width: '130px' }}>Status</TableCell>
            <TableCell isHeader style={{ width: '120px', textAlign: 'center' }}>Logs</TableCell>
            <TableCell isHeader style={{ width: '50px' }} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredHistory.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <span style={{ fontSize: '12px', color: 'var(--fg-2)', fontFamily: 'monospace' }}>
                  {item.date}
                </span>
              </TableCell>
              <TableCell>
                <span style={{ fontWeight: 600, color: 'var(--fg-0)' }}>
                  {item.file}
                </span>
              </TableCell>
              <TableCell>
                <span style={{ fontSize: '12px', color: 'var(--fg-1)', fontWeight: 500 }}>
                  {item.operation}
                </span>
              </TableCell>
              <TableCell>
                <span style={{ fontSize: '12px', color: 'var(--fg-2)' }}>
                  {item.duration}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status === 'Completed' ? 'ok' : 'error'}>
                  {item.status.toUpperCase()}
                </StatusBadge>
              </TableCell>
              <TableCell style={{ textAlign: 'center' }}>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLogsItem(item)}>
                  View Logs
                </Button>
              </TableCell>
              <TableCell style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => removeHistoryItem(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--fg-2)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '4px',
                  }}
                  title="Remove record"
                >
                  ✕
                </button>
              </TableCell>
            </TableRow>
          ))}
          {filteredHistory.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--fg-2)' }}>
                No completed records matched filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* LOGS MODAL DIALOG OVERLAY */}
      {selectedLogsItem && (
        <Modal
          isOpen={!!selectedLogsItem}
          onClose={() => setSelectedLogsItem(null)}
          title={`FFmpeg Execution Logs - ${selectedLogsItem.file}`}
          footer={
            <Button variant="primary" onClick={() => setSelectedLogsItem(null)}>
              Close Terminal
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--fg-1)', margin: 0 }}>
              Below is the raw terminal console stream recorded for the `{selectedLogsItem.operation}` operation executed on `{selectedLogsItem.date}`:
            </p>
            <LogViewer
              logs={selectedLogsItem.logs}
              onClear={() => setSelectedLogsItem({ ...selectedLogsItem, logs: [] })}
              onExport={() => navigator.clipboard.writeText(selectedLogsItem.logs.join('\n'))}
              maxHeight="300px"
            />
          </div>
        </Modal>
      )}

      {/* CLEAR HISTORY CONFIRMATION OVERLAY */}
      <Modal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        title="Confirm History Reset"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsClearConfirmOpen(false)} style={{ marginRight: '8px' }}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleClearHistory}>
              Yes, Clear History
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0 }}>Are you absolutely sure you want to permanently delete all completed conversion logs and history statistics?</p>
          <p style={{ color: 'var(--err)', fontWeight: 600, margin: 0 }}>This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  )
}
