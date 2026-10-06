import React from 'react'
import { ReencodeItem } from '../../stores/reencodeStore'
import { Icon } from './Icon'
import { StatusCell, RowStatus } from './StatusCell'
import { VideoCard } from './VideoCard'

interface ReencodeRowProps {
  item: ReencodeItem
  disabled?: boolean
  testOpen: boolean
  onOpenTest: () => void
  onOpenVideo: (path: string) => void
  onRetry: () => void
  onCancel: () => void
  onRemove: () => void
}

const toRowStatus = (status: ReencodeItem['status']): RowStatus =>
  status === 'processing' ? 'running' : status === 'success' ? 'done' : status === 'error' ? 'error' : 'ready'

// One target video on the Re-encode Video page: its card, a Test button that
// encodes a few seconds with the current settings, and the run status.
export const ReencodeRow: React.FC<ReencodeRowProps> = ({
  item,
  disabled = false,
  testOpen,
  onOpenTest,
  onOpenVideo,
  onRetry,
  onCancel,
  onRemove,
}) => (
  <div className={`merge-row reencode-row ${disabled ? 'is-disabled' : ''}`}>
    <VideoCard
      video={item.video}
      disabled={disabled}
      onOpenVideo={onOpenVideo}
      badgesExtra={
        <button
          type="button"
          className={`sync-pick ${testOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onOpenTest()
          }}
          disabled={disabled || !item.video.videoCodec}
          aria-label="Test encode a few seconds with the current settings"
          aria-expanded={testOpen}
          data-tip={disabled ? undefined : 'Test encode a few seconds with the current settings'}
        >
          <Icon name="zap" className="ico" />
          <span className="lbl">Test</span>
        </button>
      }
    />

    <div className="merge-row-side">
      <div className="row-actions">
        {item.status === 'success' && item.outputPath && (
          <button
            className="btn btn-ghost btn-sm"
            aria-label="Open re-encoded file"
            data-tip={disabled ? undefined : 'Open re-encoded file'}
            onClick={() => onOpenVideo(item.outputPath!)}
            disabled={disabled}
          >
            <Icon name="play" />
          </button>
        )}
        {item.status === 'error' && (
          <button
            className="btn btn-ghost btn-sm"
            aria-label="Retry this file"
            data-tip={disabled ? undefined : 'Retry this file'}
            onClick={onRetry}
            disabled={disabled}
          >
            <Icon name="retry" />
          </button>
        )}
        {item.status === 'processing' ? (
          <button className="btn btn-ghost btn-sm" aria-label="Cancel this file" data-tip="Cancel this file" onClick={onCancel}>
            <Icon name="stop" />
          </button>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            aria-label="Remove this file"
            data-tip={disabled ? undefined : 'Remove this file'}
            onClick={onRemove}
            disabled={disabled}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <StatusCell status={toRowStatus(item.status)} progress={item.progress} error={item.error} hasAudio />
    </div>
  </div>
)
