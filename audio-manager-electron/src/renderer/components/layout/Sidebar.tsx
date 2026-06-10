import React from 'react'
import { Icon, IconName } from '../design/Icon'
import { useFileStore } from '../../stores/fileStore'
import { useMergeStore } from '../../stores/mergeStore'
import { useHistoryStore } from '../../stores/historyStore'

export type PageId = 'extract' | 'merge' | 'history' | 'showcase'

export interface SidebarProps {
  activePage: PageId
  onPageChange: (page: PageId) => void
  ffmpegAvailable?: boolean
  mkvmergeAvailable?: boolean
  gpuActive?: boolean
  gpuCount?: number
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onPageChange,
  ffmpegAvailable = false,
  mkvmergeAvailable = false,
  gpuActive = false,
  gpuCount = 0,
}) => {
  const extractCount = useFileStore((s) => s.files.length)
  const mergeCount = useMergeStore((s) => s.pairs.length)
  const historyCount = useHistoryStore((s) => s.history.length)

  const items: Array<{ id: PageId; label: string; icon: IconName; count: number }> = [
    { id: 'extract', label: 'Extract', icon: 'extract', count: extractCount },
    { id: 'merge', label: 'Merge', icon: 'merge', count: mergeCount },
    { id: 'history', label: 'History', icon: 'history', count: historyCount },
  ]

  return (
    <aside className="sidebar">
      <div className="sb-section">Workspace</div>
      <nav className="sb-nav">
        {items.map((it) => (
          <div
            key={it.id}
            className={`sb-item ${activePage === it.id ? 'active' : ''}`}
            onClick={() => onPageChange(it.id)}
          >
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.count > 0 && <span className="count">{it.count}</span>}
          </div>
        ))}
      </nav>
      <div className="sb-section">Developer</div>
      <nav className="sb-nav">
        <div
          className={`sb-item ${activePage === 'showcase' ? 'active' : ''}`}
          onClick={() => onPageChange('showcase')}
        >
          <Icon name="layers" />
          <span>UI Showcase</span>
        </div>
      </nav>
      <div className="sb-status">
        <div className="sb-stat-row">
          <span className={`sb-dot ${ffmpegAvailable ? '' : 'off'}`} />
          <span>FFmpeg {ffmpegAvailable ? 'ready' : 'missing'}</span>
        </div>
        <div className="sb-stat-row">
          <span className={`sb-dot ${mkvmergeAvailable ? '' : 'warn'}`} />
          <span>mkvmerge {mkvmergeAvailable ? 'ready' : 'optional'}</span>
        </div>
        <div className="sb-stat-row">
          <span className={`sb-dot ${gpuActive ? '' : 'off'}`} />
          <span>{gpuActive ? `${gpuCount} GPU encoder${gpuCount !== 1 ? 's' : ''}` : 'GPU not detected'}</span>
        </div>
      </div>
    </aside>
  )
}
