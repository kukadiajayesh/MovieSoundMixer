import React, { useState } from 'react'

export interface DropZoneProps {
  onFilesDropped: (files: File[]) => void
  label?: string
  sublabel?: string
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesDropped,
  label = 'Drag and drop video files here',
  sublabel = 'or click to browse from computer',
}) => {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files)
      onFilesDropped(filesArray)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files)
      onFilesDropped(filesArray)
    }
  }

  return (
    <div
      className={`dropzone ${isDragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      style={{ minHeight: '180px' }}
    >
      <input
        type="file"
        id="file-upload-input"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <label htmlFor="file-upload-input" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-3)', cursor: 'pointer' }}>
        <svg
          style={{ width: '48px', height: '48px', color: isDragActive ? 'var(--accent)' : 'var(--fg-2)', transition: 'color 0.2s' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg-1)' }}>{label}</span>
          <span style={{ fontSize: '12px', color: 'var(--fg-2)' }}>{sublabel}</span>
        </div>
      </label>

      {isDragActive && (
        <div className="dropzone-overlay">
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent)' }}>
            Drop files to import
          </span>
        </div>
      )}
    </div>
  )
}
