import React from 'react'
import { MergePair, MergeSource } from '../../stores/mergeStore'
import { channelLabel, containerLabel, fileExt, fmtDuration } from '../../lib/mediaLabels'
import { Icon } from './Icon'
import { StatusCell, RowStatus } from './StatusCell'

interface MergeRowProps {
  pair: MergePair
  status: RowStatus
  assigning: boolean
  onAssignClick: () => void
  onOpenChannelPicker: (audio: MergeSource, anchor: HTMLElement) => void
  onClearAudio: () => void
  onRetry: () => void
  onCancel: () => void
  onRemove: () => void
  onOpenOutput: (path: string) => void
}

// One embedded/selected audio stream's codec+channel badges, shared by both
// cards — the video's own (informational, non-interactive) track and the
// fallback rendering when a source audio file hasn't been probed yet.
const StreamBadges: React.FC<{ source: MergeSource }> = ({ source }) => {
  if (!source.streams || source.streams.length === 0) return null
  const picked = source.streams.find((s) => s.index === source.selectedStreamIndex) ?? source.streams[0]
  const ch = channelLabel(picked.channels)
  return (
    <>
      <span className="mc-tag">{picked.codec.toUpperCase()}</span>
      {ch && <span className="mc-tag">{ch}</span>}
    </>
  )
}

export const MergeRow: React.FC<MergeRowProps> = ({
  pair: p,
  status,
  assigning,
  onAssignClick,
  onOpenChannelPicker,
  onClearAudio,
  onRetry,
  onCancel,
  onRemove,
  onOpenOutput,
}) => {
  const videoDuration = fmtDuration(p.video.duration)
  const audioDuration = fmtDuration(p.audio?.duration)

  return (
    <div className="merge-row">
      <div className="media-card video">
        <div className="mc-head">
          <span className="mc-icon video">
            <Icon name="play" />
          </span>
          <span className="mc-cap">Target Video</span>
        </div>
        <div className="mc-title" title={p.video.name}>
          {p.video.name}
        </div>
        <div className="mc-meta">
          {videoDuration && (
            <span>
              <Icon name="history" /> {videoDuration}
            </span>
          )}
          <span>
            <Icon name="file" /> {containerLabel(fileExt(p.video.name))}
          </span>
          {p.episode && <span className="mono">{p.episode}</span>}
        </div>
        <div className="mc-badges">
          {p.video.resolution && <span className="mc-tag">{p.video.resolution}</span>}
          {p.video.videoCodec && <span className="mc-tag">{p.video.videoCodec}</span>}
          <StreamBadges source={p.video} />
        </div>
      </div>

      {p.audio ? (
        <div className="media-card audio">
          <button
            className="mc-close"
            aria-label="Remove audio assignment"
            data-tip="Remove this audio assignment"
            onClick={(e) => {
              e.stopPropagation()
              onClearAudio()
            }}
          >
            <Icon name="close" />
          </button>
          <div
            className="mc-clickable"
            onClick={onAssignClick}
            data-tip="Click to choose a different audio or video file"
          >
            <div className="mc-head">
              <span className="mc-icon audio">
                <Icon name="music" />
              </span>
              <span className="mc-cap">Source Video File</span>
            </div>
            <div className="mc-title" title={p.audio.name}>
              {p.audio.name}
            </div>
            <div className="mc-meta">
              {audioDuration && (
                <span>
                  <Icon name="history" /> {audioDuration}
                </span>
              )}
              <span>
                <Icon name="file" /> {containerLabel(fileExt(p.audio.name))}
              </span>
            </div>
          </div>
          {p.audio.streams && p.audio.streams.length > 0 && (() => {
            const picked =
              p.audio!.streams!.find((s) => s.index === p.audio!.selectedStreamIndex) ?? p.audio!.streams![0]
            return (
              <span
                className="stream-pick"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenChannelPicker(p.audio!, e.currentTarget)
                }}
                data-tip="Click to choose a different audio channel"
              >
                <span className="badge">{picked.codec.toUpperCase()}</span>
                {picked.language && <span className="lang">{picked.language.toUpperCase()}</span>}
                <span className="ch">{picked.channels}ch</span>
                <Icon name="chevron" className="caret" />
              </span>
            )
          })()}
        </div>
      ) : (
        <div className="media-card audio placeholder" onClick={onAssignClick} data-tip="Click to assign an audio file">
          <div className="mc-head">
            <span className="mc-icon audio">
              <Icon name="music" />
            </span>
            <span className="mc-cap">Source Video File</span>
          </div>
          <div className="mc-placeholder">{assigning ? 'Choosing…' : '⚠ No match — click to assign manually'}</div>
        </div>
      )}

      <div className="merge-row-side">
        <div className="row-actions">
          {p.status === 'success' && p.outputPath && (
            <button
              className="btn btn-ghost btn-sm"
              aria-label="Open merged file"
              data-tip="Open merged file"
              onClick={() => onOpenOutput(p.outputPath!)}
            >
              <Icon name="play" />
            </button>
          )}
          {p.status === 'error' && (
            <button className="btn btn-ghost btn-sm" aria-label="Retry this file" data-tip="Retry this file" onClick={onRetry}>
              <Icon name="retry" />
            </button>
          )}
          {p.status === 'processing' ? (
            <button className="btn btn-ghost btn-sm" aria-label="Cancel this file" data-tip="Cancel this file" onClick={onCancel}>
              <Icon name="stop" />
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" aria-label="Remove this file" data-tip="Remove this file" onClick={onRemove}>
              <Icon name="close" />
            </button>
          )}
        </div>
        <StatusCell status={status} progress={p.progress} error={p.error} />
      </div>
    </div>
  )
}
