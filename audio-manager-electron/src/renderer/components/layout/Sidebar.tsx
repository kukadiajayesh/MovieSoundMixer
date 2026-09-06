import React from 'react'
import { Icon, IconName } from '../design/Icon'
import { useMergeStore } from '../../stores/mergeStore'
import { useHistoryStore } from '../../stores/historyStore'

export type PageId = 'merge' | 'history' | 'showcase'

export type ThemeChoice = 'system' | 'light' | 'dark'

export interface SidebarProps {
  activePage: PageId
  onPageChange: (page: PageId) => void
  ffmpegAvailable?: boolean
  mkvmergeAvailable?: boolean
  gpuActive?: boolean
  gpuCount?: number
  theme?: ThemeChoice
  onSetTheme?: (theme: ThemeChoice) => void
}

// Click cycles through the three modes in this order.
const THEME_CYCLE: ThemeChoice[] = ['system', 'light', 'dark']
const THEME_META: Record<ThemeChoice, { label: string; icon: IconName }> = {
  system: { label: 'Auto', icon: 'auto' },
  light: { label: 'Light', icon: 'sun' },
  dark: { label: 'Dark', icon: 'moon' },
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onPageChange,
  ffmpegAvailable = false,
  mkvmergeAvailable = false,
  gpuActive = false,
  gpuCount = 0,
  theme = 'system',
  onSetTheme,
}) => {
  const mergeCount = useMergeStore((s) => s.pairs.length)
  const historyCount = useHistoryStore((s) => s.history.length)

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]
    onSetTheme?.(next)
  }
  const { label: themeLabel, icon: themeIcon } = THEME_META[theme]

  const items: Array<{ id: PageId; label: string; icon: IconName; count: number }> = [
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
      <div className="sb-theme">
        <button
          className="sb-theme-btn"
          onClick={cycleTheme}
          aria-label="Click to change theme (Auto → Light → Dark)"
          data-tip="Click to change theme (Auto → Light → Dark)"
        >
          <Icon name={themeIcon} />
          <span>{themeLabel}</span>
        </button>
      </div>
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
