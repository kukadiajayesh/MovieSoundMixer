import React, { useEffect, useState } from 'react'
import { MergePair, MergeSource, isRunnable, useMergeStore } from '../../stores/mergeStore'
import { channelLabel, containerLabel, fileExt, fmtDuration, fmtOffset, fmtOffsetShort, fmtSize } from '../../lib/mediaLabels'
import { getVideoThumbnail } from '../../lib/thumbnailCache'
import { Icon } from './Icon'
import { StatusCell, RowStatus } from './StatusCell'

interface MergeRowProps {
  pair: MergePair
  status: RowStatus
  assigning: boolean
  disabled?: boolean
  onAssignClick: () => void
  onOpenChannelPicker: (audio: MergeSource, anchor: HTMLElement) => void
  syncOpen: boolean
  onOpenSync: () => void
  onClearAudio: () => void
  onOpenVideo: (path: string) => void
  onRetry: () => void
  onCancel: () => void
  onRemove: () => void
}

// The video's own embedded audio track — informational, non-interactive
// (the pick that actually matters is the source audio file's stream-pick
// chip below, not this).
const StreamBadges: React.FC<{ source: MergeSource; pill?: boolean }> = ({ source, pill }) => {
  if (!source.streams || source.streams.length === 0) return null
  const picked = source.streams.find((s) => s.index === source.selectedStreamIndex) ?? source.streams[0]
  const ch = channelLabel(picked.channels)
  const cls = `mc-tag${pill ? ' pill' : ''}`
  // probeSource stands in an 'unknown' stream when a file has no audio.
  if (picked.codec === 'unknown') return <span className={cls}>No audio</span>
  return (
    <>
      <span className={cls}>{picked.codec.toUpperCase()}</span>
      {ch && <span className={cls}>{ch}</span>}
    </>
  )
}

export const MergeRow: React.FC<MergeRowProps> = ({
  pair: p,
  status,
  assigning,
  disabled = false,
  onAssignClick,
  onOpenChannelPicker,
  syncOpen,
  onOpenSync,
  onClearAudio,
  onOpenVideo,
  onRetry,
  onCancel,
  onRemove,
}) => {
  const videoDuration = fmtDuration(p.video.duration)
  const audioDuration = fmtDuration(p.audio?.duration)
  const videoSize = fmtSize(p.video.size)

  const offsetMs = p.audioOffsetMs ?? 0
  const syncTip = `Audio sync: ${offsetMs === 0 ? 'no shift' : fmtOffset(offsetMs)}. Click to adjust or preview.`

  const setAudioTitle = useMergeStore((s) => s.setPairAudioTitle)
  const setVideoTrackTitle = useMergeStore((s) => s.setPairVideoTrackTitle)
  const [tracksOpen, setTracksOpen] = useState(false)
  const videoAudio = (p.video.streams ?? []).filter((s) => s.codec !== 'unknown')
  const pickedAudio = p.audio?.streams?.find((s) => s.index === p.audio!.selectedStreamIndex) ?? p.audio?.streams?.[0]

  const [thumb, setThumb] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setThumb(null)
    getVideoThumbnail(p.video.path).then((url) => {
      if (!cancelled) setThumb(url)
    })
    return () => {
      cancelled = true
    }
  }, [p.video.path])

  return (
    <div className={`merge-row ${disabled ? 'is-disabled' : ''}`}>
      <div className="media-card video">
        <div className="mc-video-body">
          <div
            className="mc-thumb"
            onClick={disabled ? undefined : () => onOpenVideo(p.video.path)}
            data-tip={disabled ? undefined : "Click to preview this video"}
          >
            {thumb ? (
              <>
                <img src={thumb} alt="" />
                <span className="mc-thumb-play">
                  <Icon name="play" />
                </span>
              </>
            ) : (
              <span className="mc-icon video">
                <Icon name="play" />
              </span>
            )}
          </div>
          <div className="mc-video-content">
            <div className="mc-title" title={p.video.name}>
              {p.video.name}
            </div>
            <div className="mc-meta divided">
              {videoDuration && (
                <span>
                  <Icon name="history" /> {videoDuration}
                </span>
              )}
              {videoSize && (
                <span>
                  <Icon name="extract" /> {videoSize}
                </span>
              )}
              <span>
                <Icon name="file" /> {containerLabel(fileExt(p.video.name))}
              </span>
              {p.episode && <span className="mono">{p.episode}</span>}
            </div>
            <div className="mc-badges">
              <Icon name="layers" className="ico mc-badges-icon" />
              {p.video.resolution && <span className="mc-tag pill">{p.video.resolution}</span>}
              {p.video.videoCodec && <span className="mc-tag pill">{p.video.videoCodec}</span>}
              <StreamBadges source={p.video} pill />
              {videoAudio.length > 0 && (
                <button
                  type="button"
                  className={`track-toggle ${tracksOpen ? 'open' : ''}`}
                  onClick={() => setTracksOpen((o) => !o)}
                  disabled={disabled}
                  data-tip="Rename this video's audio tracks"
                >
                  Titles
                </button>
              )}
            </div>
            {tracksOpen && videoAudio.length > 0 && (
              <div className="track-titles">
                {videoAudio.map((s, i) => (
                  <label key={s.index} className="track-title-row">
                    <span className="lbl">
                      #{i + 1} {s.language ? s.language.toUpperCase() : ''} {s.codec.toUpperCase()}
                    </span>
                    <input
                      type="text"
                      maxLength={200}
                      value={p.videoTrackTitles?.[i] ?? s.title ?? ''}
                      placeholder={s.title || 'Track title'}
                      disabled={disabled}
                      onChange={(e) => setVideoTrackTitle(p.id, i, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {p.audio ? (
        <div className="media-card audio">
          {!disabled && (
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
          )}
          <div
            className="mc-clickable"
            onClick={disabled ? undefined : onAssignClick}
            data-tip={disabled ? undefined : "Click to choose a different audio or video file"}
          >
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
          <div className="mc-chips">
          {p.audio.streams && p.audio.streams.length > 0 && (() => {
            const picked =
              p.audio!.streams!.find((s) => s.index === p.audio!.selectedStreamIndex) ?? p.audio!.streams![0]
            return (
              <span
                className="stream-pick"
                onClick={disabled ? undefined : (e) => {
                  e.stopPropagation()
                  onOpenChannelPicker(p.audio!, e.currentTarget)
                }}
                data-tip={disabled ? undefined : "Click to choose a different audio channel"}
              >
                <span className="badge">{picked.codec.toUpperCase()}</span>
                {picked.language && <span className="lang">{picked.language.toUpperCase()}</span>}
                <span className="ch">{picked.channels}ch</span>
                <Icon name="chevron" className="caret" />
              </span>
            )
          })()}
            <button
              type="button"
              className={`sync-pick ${offsetMs !== 0 ? 'own' : ''} ${syncOpen ? 'open' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onOpenSync()
              }}
              disabled={disabled}
              aria-label={syncTip}
              aria-expanded={syncOpen}
              data-tip={disabled ? undefined : syncTip}
            >
              <Icon name="waveform" className="ico" />
              <span className="lbl">Sync</span>
              <span className="val">{offsetMs === 0 ? '0 ms' : fmtOffsetShort(offsetMs)}</span>
            </button>
          </div>
          <input
            type="text"
            className="track-title-input"
            maxLength={200}
            value={p.audioTitle ?? pickedAudio?.title ?? ''}
            placeholder={pickedAudio?.title || 'Track title'}
            disabled={disabled}
            aria-label="Title of the added audio track"
            data-tip={disabled ? undefined : 'Title of the added audio track (blank keeps the original)'}
            onChange={(e) => setAudioTitle(p.id, e.target.value)}
          />
        </div>
      ) : (
        <div
          className="media-card audio placeholder"
          onClick={disabled ? undefined : onAssignClick}
          data-tip={disabled ? undefined : "Click to pick an audio or video file"}
        >
          <span className="mc-icon audio">
            <Icon name="music" />
          </span>
          <div className="mc-placeholder">{assigning ? 'Choosing…' : 'Click to pick audio / video file'}</div>
        </div>
      )}

      <div className="merge-row-side">
        <div className="row-actions">
          {p.status === 'success' && p.outputPath && (
            <button
              className="btn btn-ghost btn-sm"
              aria-label="Open merged file"
              data-tip={disabled ? undefined : "Open merged file"}
              onClick={() => onOpenVideo(p.outputPath!)}
              disabled={disabled}
            >
              <Icon name="play" />
            </button>
          )}
          {p.status === 'error' && (
            <button
              className="btn btn-ghost btn-sm"
              aria-label="Retry this file"
              data-tip={disabled ? undefined : "Retry this file"}
              onClick={onRetry}
              disabled={disabled}
            >
              <Icon name="retry" />
            </button>
          )}
          {p.status === 'processing' ? (
            <button className="btn btn-ghost btn-sm" aria-label="Cancel this file" data-tip="Cancel this file" onClick={onCancel}>
              <Icon name="stop" />
            </button>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              aria-label="Remove this file"
              data-tip={disabled ? undefined : "Remove this file"}
              onClick={onRemove}
              disabled={disabled}
            >
              <Icon name="close" />
            </button>
          )}
        </div>
        <StatusCell status={status} progress={p.progress} error={p.error} hasAudio={isRunnable(p)} />
      </div>
    </div>
  )
}
