import { Switch } from '@renderer/components/ui/switch'
import { Label } from '@renderer/components/ui/label'
import { cn } from '@renderer/lib/utils'
import type { LensCategory } from '@shared/ipc'

interface CategoryToggleProps {
  category: LensCategory
  onChange: (category: LensCategory) => void
}

export function CategoryToggle({ category, onChange }: CategoryToggleProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="category-toggle"
        className={cn(category === 'negative' && 'text-muted-foreground')}
      >
        Positivo
      </Label>
      <Switch
        id="category-toggle"
        checked={category === 'negative'}
        onCheckedChange={(checked) => onChange(checked ? 'negative' : 'positive')}
      />
      <Label
        htmlFor="category-toggle"
        className={cn(category === 'positive' && 'text-muted-foreground')}
      >
        Negativo
      </Label>
    </div>
  )
}
