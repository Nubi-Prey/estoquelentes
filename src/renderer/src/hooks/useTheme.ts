import { useCallback, useState } from 'react'
import { applyTheme, persistTheme, type Theme } from '@renderer/lib/theme'

function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

interface UseThemeResult {
  theme: Theme
  toggleTheme: () => void
}

export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(getCurrentTheme)

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      persistTheme(next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
