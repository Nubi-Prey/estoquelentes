import { FileBarChart, History, LayoutGrid, Settings } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export type AppView = 'inventory' | 'report' | 'audit' | 'settings'

interface SidebarProps {
  view: AppView
  onChange: (view: AppView) => void
}

const NAV_ITEMS: Array<{ view: AppView; label: string; icon: typeof LayoutGrid }> = [
  { view: 'inventory', label: 'Inventário', icon: LayoutGrid },
  { view: 'report', label: 'Relatório', icon: FileBarChart },
  { view: 'audit', label: 'Registro de auditoria', icon: History },
  { view: 'settings', label: 'Configurações', icon: Settings }
]

export function Sidebar({ view, onChange }: SidebarProps): React.JSX.Element {
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 border-r bg-card p-3">
      <h1 className="mb-2 px-3 text-sm font-semibold">EstoqueLentes</h1>
      {NAV_ITEMS.map(({ view: itemView, label, icon: Icon }) => (
        <button
          key={itemView}
          type="button"
          onClick={() => onChange(itemView)}
          aria-current={view === itemView ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
            view === itemView
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  )
}
