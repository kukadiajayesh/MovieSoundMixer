import React from 'react'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../tables/Table'
import { StreamSelector, AudioStream } from './StreamSelector'
import { StatusBadge } from '../indicators/StatusBadge'

export interface FileEntry {
  id: string
  name: string
  path: string
  size: number
  streams: AudioStream[]
  selectedStreamIndex: number
  status: 'ready' | 'processing' | 'success' | 'error'
  statusText?: string
}

export interface FileTableProps {
  files: FileEntry[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onStreamChange: (id: string, streamIndex: number) => void
  onRemoveFile: (id: string) => void
}

export const FileTable: React.FC<FileTableProps> = ({
  files,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onStreamChange,
  onRemoveFile,
}) => {
  const allSelected = files.length > 0 && selectedIds.length === files.length

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getStatusBadge = (status: FileEntry['status'], statusText?: string) => {
    switch (status) {
      case 'processing':
        return <StatusBadge status="accent">Processing...</StatusBadge>
      case 'success':
        return <StatusBadge status="ok">{statusText || 'Success'}</StatusBadge>
      case 'error':
        return <StatusBadge status="error">{statusText || 'Error'}</StatusBadge>
      default:
        return <StatusBadge status="warn">Ready</StatusBadge>
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCell isHeader style={{ width: '40px' }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              disabled={files.length === 0}
              style={{ cursor: 'pointer' }}
            />
          </TableCell>
          <TableCell isHeader>File Name</TableCell>
          <TableCell isHeader style={{ width: '100px' }}>Size</TableCell>
          <TableCell isHeader style={{ width: '220px' }}>Audio Stream</TableCell>
          <TableCell isHeader style={{ width: '130px' }}>Status</TableCell>
          <TableCell isHeader style={{ width: '60px', textAlign: 'center' }} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => {
          const isSelected = selectedIds.includes(file.id)
          return (
            <TableRow key={file.id} selected={isSelected}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(file.id)}
                  style={{ cursor: 'pointer' }}
                />
              </TableCell>
              <TableCell>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, color: 'var(--fg-0)', wordBreak: 'break-all' }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--fg-2)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {file.path}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span style={{ fontSize: '12px', color: 'var(--fg-1)' }}>
                  {formatBytes(file.size)}
                </span>
              </TableCell>
              <TableCell>
                <StreamSelector
                  streams={file.streams}
                  value={file.selectedStreamIndex}
                  onChange={(idx) => onStreamChange(file.id, idx)}
                  disabled={file.status === 'processing' || file.streams.length === 0}
                />
              </TableCell>
              <TableCell>{getStatusBadge(file.status, file.statusText)}</TableCell>
              <TableCell style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.id)}
                  disabled={file.status === 'processing'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--fg-2)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px',
                  }}
                  title="Remove file"
                >
                  ✕
                </button>
              </TableCell>
            </TableRow>
          )
        })}
        {files.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--fg-2)' }}>
              No files added yet. Drag and drop files above to get started.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
