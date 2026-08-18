import { Moon, Sun } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useTheme } from '@renderer/hooks/useTheme'

export function ThemeToggle(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
