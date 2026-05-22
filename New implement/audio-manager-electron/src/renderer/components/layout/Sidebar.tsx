import React from 'react'
import { useTheme } from '../../hooks/useTheme'

export interface SidebarProps {
  activePage: 'extract' | 'merge' | 'history' | 'showcase'
  onPageChange: (page: 'extract' | 'merge' | 'history' | 'showcase') => void
  ffmpegAvailable?: boolean
  mkvmergeAvailable?: boolean
  gpuActive?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onPageChange,
  ffmpegAvailable = true,
  mkvmergeAvailable = false,
  gpuActive = false,
}) => {
  const { theme, setTheme } = useTheme()

  const handleThemeToggle = () => {
    if (theme === 'dark') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('system')
    } else {
      setTheme('dark')
    }
  }

  const getThemeButtonLabel = () => {
    if (theme === 'dark') return '🌙 Dark'
    if (theme === 'light') return '☀️ Light'
    return '💻 System'
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* Logo */}
        <div className="sidebar-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" />
          </svg>
          <span style={{ fontSize: '16px', letterSpacing: '0.02em' }}>Audio Manager</span>
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${activePage === 'extract' ? 'active' : ''}`}
            onClick={() => onPageChange('extract')}
            style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', font: 'inherit' }}
          >
            <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span>Extract Audio</span>
          </button>

          <button
            className={`sidebar-link ${activePage === 'merge' ? 'active' : ''}`}
            onClick={() => onPageChange('merge')}
            style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', font: 'inherit' }}
          >
            <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Merge Audio</span>
          </button>

          <button
            className={`sidebar-link ${activePage === 'history' ? 'active' : ''}`}
            onClick={() => onPageChange('history')}
            style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', font: 'inherit' }}
          >
            <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>

          <button
            className={`sidebar-link ${activePage === 'showcase' ? 'active' : ''}`}
            onClick={() => onPageChange('showcase')}
            style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', font: 'inherit' }}
          >
            <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>UI Showcase</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-bottom">
        {/* Dependency Status Indicators */}
        <div className="sidebar-statuses">
          <div className="status-row">
            <span className="status-item">
              <span className={`status-dot ${ffmpegAvailable ? 'dot-ok' : 'dot-error'}`} />
              <span>FFmpeg</span>
            </span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{ffmpegAvailable ? 'ACTIVE' : 'MISSING'}</span>
          </div>

          <div className="status-row">
            <span className="status-item">
              <span className={`status-dot ${mkvmergeAvailable ? 'dot-ok' : 'dot-warn'}`} />
              <span>mkvmerge</span>
            </span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{mkvmergeAvailable ? 'ACTIVE' : 'OPTIONAL'}</span>
          </div>

          <div className="status-row">
            <span className="status-item">
              <span className={`status-dot ${gpuActive ? 'dot-accent' : 'dot-warn'}`} />
              <span>GPU Acceleration</span>
            </span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>{gpuActive ? 'READY' : 'OFF'}</span>
          </div>
        </div>

        {/* Theme Switching Button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleThemeToggle}
          style={{ width: '100%', justifyContent: 'space-between', padding: 'var(--spacing-2) var(--spacing-3)' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 3v18" />
            </svg>
            <span>Theme Mode</span>
          </span>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>{getThemeButtonLabel()}</span>
        </button>
      </div>
    </aside>
  )
}
