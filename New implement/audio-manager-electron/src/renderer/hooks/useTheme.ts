import { useEffect } from 'react'
import { useThemeStore, ThemeType } from '../stores/themeStore'

export const useTheme = () => {
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (currentTheme: ThemeType) => {
      if (currentTheme === 'system') {
        const isSystemLight = window.matchMedia('(prefers-color-scheme: light)').matches
        const resolvedTheme = isSystemLight ? 'light' : 'dark'
        root.setAttribute('data-theme', resolvedTheme)
      } else {
        root.setAttribute('data-theme', currentTheme)
      }
    }

    applyTheme(theme)

    // Listener for system preference changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
      const handleChange = () => applyTheme('system')

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Get active resolved theme ('light' | 'dark')
  const getResolvedTheme = (): 'light' | 'dark' => {
    if (theme === 'system') {
      const isSystemLight = window.matchMedia('(prefers-color-scheme: light)').matches
      return isSystemLight ? 'light' : 'dark'
    }
    return theme
  }

  return {
    theme,
    resolvedTheme: getResolvedTheme(),
    setTheme,
  }
}
