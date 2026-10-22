import { useMemo, useState } from 'react'
import { Calendar, Search, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { AuditDayCard } from '@renderer/components/AuditDayCard'
import { useAuditLog } from '@renderer/hooks/useAuditLog'
import { filterAuditDays, type AuditDay } from '@renderer/lib/auditLog'

export function AuditView(): React.JSX.Element {
  const { days, loading, refetch } = useAuditLog()
  const [searchTerm, setSearchTerm] = useState('')

  async function handleRollback(day: AuditDay): Promise<void> {
    await window.api.rollbackDay({ dayStartMs: day.dayStartMs, dayEndMs: day.dayEndMs })
    await refetch()
  }

  const filteredDays = useMemo(() => {
    return filterAuditDays(days, searchTerm)
  }, [days, searchTerm])

  const datePickerValue = /^\d{4}-\d{2}-\d{2}$/.test(searchTerm) ? searchTerm : ''

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold">Registro de auditoria</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe o histórico de alterações no estoque e reverta dias quando necessário.
          </p>
        </div>

        {days.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por dia ou mês (ex: 21/10, outubro)..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-8 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Pesquisar histórico por mês ou dia"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar campo de pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={datePickerValue}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs text-foreground focus-visible:outline-none"
                aria-label="Filtrar por data no calendário"
                title="Filtrar por data específica"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Carregando histórico...
        </div>
      ) : days.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-center text-muted-foreground">
          Nenhuma alteração registrada ainda. Mudanças no estoque aparecem aqui.
        </div>
      ) : filteredDays.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <p>Nenhuma alteração encontrada para &quot;{searchTerm}&quot;.</p>
          <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
            Limpar pesquisa
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {searchTerm && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Exibindo {filteredDays.length} {filteredDays.length === 1 ? 'dia' : 'dias'} para
                &quot;{searchTerm}&quot;
              </span>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-primary hover:underline"
              >
                Limpar filtro
              </button>
            </div>
          )}
          {filteredDays.map((day) => (
            <AuditDayCard key={day.dayKey} day={day} onRollback={handleRollback} />
          ))}
        </div>
      )}
    </div>
  )
}
