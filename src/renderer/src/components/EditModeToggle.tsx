import { Switch } from '@renderer/components/ui/switch'
import { Label } from '@renderer/components/ui/label'

interface EditModeToggleProps {
  editMode: boolean
  onChange: (editMode: boolean) => void
}

export function EditModeToggle({ editMode, onChange }: EditModeToggleProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="edit-mode">{editMode ? 'Modo edição' : 'Modo visualização'}</Label>
      <Switch id="edit-mode" checked={editMode} onCheckedChange={onChange} />
    </div>
  )
}
