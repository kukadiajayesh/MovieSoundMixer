import React, { useState } from 'react'
import { Icon } from './Icon'

interface DropzoneProps {
  slim?: boolean
  title: string
  sub: string
  kind?: 'video' | 'audio' | 'folder'
  onAddFiles?: () => void
  onAddFolder?: () => void
  onDropFiles?: (files: File[]) => void
}

export const Dropzone: React.FC<DropzoneProps> = ({
  slim,
  title,
  sub,
  kind = 'video',
  onAddFiles,
  onAddFolder,
  onDropFiles,
}) => {
  const [drag, setDrag] = useState(false)

  return (
    <div
      className={`dropzone ${slim ? 'slim' : ''} ${drag ? 'drag' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onAddFiles}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAddFiles?.()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        if (onDropFiles && e.dataTransfer.files.length > 0) {
          onDropFiles(Array.from(e.dataTransfer.files))
        }
      }}
    >
      <div className="dz-icon">
        <Icon name={kind === 'audio' ? 'music' : kind === 'folder' ? 'folder' : 'file'} />
      </div>
      <div className="dz-text">
        <p className="dz-title">{title}</p>
        <p className="dz-sub">{sub}</p>
      </div>
      <div className="dz-actions">
        {onAddFiles && (
          <button
            className="btn"
            onClick={(e) => {
              e.stopPropagation()
              onAddFiles()
            }}
          >
            <Icon name="plus" />
            Add files
          </button>
        )}
        {onAddFolder && (
          <button
            className="btn"
            onClick={(e) => {
              e.stopPropagation()
              onAddFolder?.()
            }}
          >
            <Icon name="folder" />
            Add folder
          </button>
        )}
      </div>
    </div>
  )
}
