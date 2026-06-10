import React from 'react'

export type IconName =
  | 'extract'
  | 'merge'
  | 'queue'
  | 'settings'
  | 'folder'
  | 'upload'
  | 'plus'
  | 'trash'
  | 'close'
  | 'chevron'
  | 'search'
  | 'play'
  | 'stop'
  | 'check'
  | 'error'
  | 'info'
  | 'log'
  | 'cpu'
  | 'zap'
  | 'layers'
  | 'file'
  | 'music'
  | 'waveform'
  | 'star'
  | 'history'
  | 'sun'
  | 'moon'

const paths: Record<IconName, React.ReactNode> = {
  extract: (
    <>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
      <path d="M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
    </>
  ),
  merge: (
    <>
      <path d="M8 3v6a4 4 0 004 4h0a4 4 0 014 4v4" />
      <path d="M16 3v6a4 4 0 01-4 4" />
    </>
  ),
  queue: <path d="M3 6h18M3 12h18M3 18h12" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  upload: <path d="M12 19V5M5 12l7-7 7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  chevron: <path d="M9 18l6-6-6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  play: <path d="M5 3l14 9-14 9V3z" fill="currentColor" />,
  stop: <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" />,
  check: <path d="M5 13l4 4L19 7" />,
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  log: <path d="M4 6h16M4 10h12M4 14h16M4 18h8" />,
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </>
  ),
  zap: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
  layers: (
    <>
      <path d="M12 2l10 5-10 5L2 7l10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  waveform: <path d="M2 12h2M6 8v8M10 5v14M14 9v6M18 6v12M22 12h-2" />,
  star: <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7l3-7z" />,
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
}

export const Icon: React.FC<{ name: IconName; className?: string }> = ({ name, className = 'ico' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths[name]}
  </svg>
)
