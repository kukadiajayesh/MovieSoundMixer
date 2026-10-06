import React from 'react'
import { useThemeStore, ThemeType } from '../../stores/themeStore'
import { Icon, IconName } from './Icon'

// Theme toggle cycles through these three modes in this order.
const THEME_CYCLE: ThemeType[] = ['system', 'light', 'dark']
const THEME_META: Record<ThemeType, { label: string; icon: IconName }> = {
  system: { label: 'Auto', icon: 'auto' },
  light: { label: 'Light', icon: 'sun' },
  dark: { label: 'Dark', icon: 'moon' },
}

// The page-header button that cycles the theme (Auto → Light → Dark).
export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useThemeStore()
  const { label, icon } = THEME_META[theme]
  return (
    <button
      className="btn btn-ghost"
      onClick={() => setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length])}
      aria-label="Click to change theme (Auto → Light → Dark)"
      data-tip="Click to change theme (Auto → Light → Dark)"
    >
      <Icon name={icon} />
      {label}
    </button>
  )
}
