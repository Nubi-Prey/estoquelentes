import { AuditDayCard } from '@renderer/components/AuditDayCard'
import { useAuditLog } from '@renderer/hooks/useAuditLog'
import type { AuditDay } from '@renderer/lib/auditLog'

export function AuditView(): React.JSX.Element {
  const { days, loading, refetch } = useAuditLog()

  async function handleRollback(day: AuditDay): Promise<void> {
    await window.api.rollbackDay({ dayStartMs: day.dayStartMs, dayEndMs: day.dayEndMs })
    await refetch()
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <h2 className="text-lg font-semibold">Registro de auditoria</h2>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Carregando histórico...
        </div>
      ) : days.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-center text-muted-foreground">
          Nenhuma alteração registrada ainda. Mudanças no estoque aparecem aqui.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <AuditDayCard key={day.dayKey} day={day} onRollback={handleRollback} />
          ))}
        </div>
      )}
    </div>
  )
}
