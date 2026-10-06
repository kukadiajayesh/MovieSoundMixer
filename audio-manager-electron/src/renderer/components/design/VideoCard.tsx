import React, { useEffect, useState } from 'react'
import { MergeSource } from '../../stores/mergeStore'
import { channelLabel, containerLabel, fileExt, fmtDuration, fmtSize } from '../../lib/mediaLabels'
import { getVideoThumbnail } from '../../lib/thumbnailCache'
import { Icon } from './Icon'

// The video's own embedded audio track — informational, non-interactive.
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

interface VideoCardProps {
  video: MergeSource
  episode?: string | null
  disabled?: boolean
  onOpenVideo: (path: string) => void
  badgesExtra?: React.ReactNode // extra controls at the end of the badge row
  children?: React.ReactNode // extra content under the badges
}

// A target video's card: thumbnail, name, duration/size/container, and its
// video and audio format badges. Shared by Merge Audio and Re-encode Video.
export const VideoCard: React.FC<VideoCardProps> = ({ video, episode, disabled = false, onOpenVideo, badgesExtra, children }) => {
  const duration = fmtDuration(video.duration)
  const size = fmtSize(video.size)

  const [thumb, setThumb] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    setThumb(null)
    getVideoThumbnail(video.path).then((url) => {
      if (!cancelled) setThumb(url)
    })
    return () => {
      cancelled = true
    }
  }, [video.path])

  return (
    <div className="media-card video">
      <div className="mc-video-body">
        <div
          className="mc-thumb"
          onClick={disabled ? undefined : () => onOpenVideo(video.path)}
          data-tip={disabled ? undefined : 'Click to preview this video'}
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
          <div className="mc-title" title={video.name}>
            {video.name}
          </div>
          <div className="mc-meta divided">
            {duration && (
              <span>
                <Icon name="history" /> {duration}
              </span>
            )}
            {size && (
              <span>
                <Icon name="extract" /> {size}
              </span>
            )}
            <span>
              <Icon name="file" /> {containerLabel(fileExt(video.name))}
            </span>
            {episode && <span className="mono">{episode}</span>}
          </div>
          <div className="mc-badges">
            <Icon name="layers" className="ico mc-badges-icon" />
            {video.resolution && <span className="mc-tag pill">{video.resolution}</span>}
            {video.videoCodec && <span className="mc-tag pill">{video.videoCodec}</span>}
            {(video.bitDepth ?? 8) > 8 && <span className="mc-tag pill">{video.bitDepth}-bit</span>}
            {video.hdr && <span className="mc-tag pill hdr">HDR</span>}
            <StreamBadges source={video} pill />
            {badgesExtra}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
