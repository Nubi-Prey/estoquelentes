import { ThemeToggle } from '@renderer/components/ThemeToggle'
import { Label } from '@renderer/components/ui/label'

export function SettingsView(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <h2 className="text-lg font-semibold">Configurações</h2>

      <div className="flex items-center justify-between rounded-md border p-4">
        <div>
          <Label>Tema</Label>
          <p className="text-sm text-muted-foreground">
            Alterna entre modo claro e escuro (padrão: segue o sistema).
          </p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
