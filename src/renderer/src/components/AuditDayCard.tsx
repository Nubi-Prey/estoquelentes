import { Minus, Plus, Undo2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { cn } from '@renderer/lib/utils'
import {
  formatAuditEntryLens,
  formatAuditEntryTime,
  formatDayLabel,
  formatNetMovement,
  type AuditDay
} from '@renderer/lib/auditLog'

interface AuditDayCardProps {
  day: AuditDay
  onRollback: (day: AuditDay) => void
}

export function AuditDayCard({ day, onRollback }: AuditDayCardProps): React.JSX.Element {
  const net = day.added - day.removed
  const dayLabel = formatDayLabel(day.dayKey)

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card p-3">
        <div>
          <h3 className="font-medium">{dayLabel}</h3>
          <p
            className={cn(
              'text-sm font-medium',
              net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            {formatNetMovement(day.added, day.removed)}
          </p>
        </div>

        <ConfirmDialog
          trigger={
            <Button type="button" variant="outline" size="sm">
              <Undo2 className="h-4 w-4" />
              Rollback
            </Button>
          }
          title={`Desfazer alterações de ${dayLabel}?`}
          description={`Isso reverte ${day.entries.length} alteração(ões) desse dia e remove essas entradas do registro. Essa ação não pode ser desfeita.`}
          confirmLabel="Desfazer alterações"
          destructive
          onConfirm={() => onRollback(day)}
        />
      </div>

      <ul className="divide-y">
        {day.entries.map((entry) => {
          const isAdd = entry.delta > 0
          const colorClass = isAdd
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'

          return (
            <li key={entry.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <span className="w-12 shrink-0 tabular-nums text-xs text-muted-foreground">
                {formatAuditEntryTime(entry)}
              </span>
              <span className={cn('flex shrink-0 items-center gap-1 font-medium', colorClass)}>
                {isAdd ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {isAdd ? 'Adicionado' : 'Removido'}
              </span>
              <span className="flex-1 text-muted-foreground">{formatAuditEntryLens(entry)}</span>
              <span className={cn('shrink-0 font-semibold tabular-nums', colorClass)}>
                {isAdd ? '+' : ''}
                {entry.delta}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
