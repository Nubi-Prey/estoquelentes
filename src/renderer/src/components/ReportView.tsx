import { useMemo } from 'react'
import { Calendar, FileJson, FileText, PackagePlus, TrendingUp, Trophy, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ExportModal } from '@renderer/components/ExportModal'
import { StockTargetInput } from '@renderer/components/StockTargetInput'
import { useStock } from '@renderer/hooks/useStock'
import { useStockTarget } from '@renderer/hooks/useStockTarget'
import { useSalesReport } from '@renderer/hooks/useSalesReport'
import { formatDiopter } from '@renderer/lib/matrix'
import {
  buildShoppingList,
  formatShoppingListText,
  shoppingListToJson
} from '@renderer/lib/exportStock'

function formatToPtBrDate(isoDate: string): string {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

export function ReportView(): React.JSX.Element {
  const { variants, loading: stockLoading } = useStock()
  const { target, setTarget } = useStockTarget()
  const {
    monthlySummary,
    topSellers,
    selectedDate,
    setSelectedDate,
    endDate,
    setEndDate,
    summary,
    loading: salesLoading
  } = useSalesReport()

  const periodLabel = useMemo(() => {
    if (!selectedDate) return 'Todos os períodos'
    if (!endDate || endDate === selectedDate) return formatToPtBrDate(selectedDate)
    return `${formatToPtBrDate(selectedDate)} a ${formatToPtBrDate(endDate)}`
  }, [selectedDate, endDate])

  const totalSold = summary
    ? summary.totalSold
    : monthlySummary.reduce((acc, s) => acc + s.totalSold, 0)
  const totalAdded = summary
    ? summary.totalAdded
    : monthlySummary.reduce((acc, s) => acc + s.totalAdded, 0)
  const championLens = topSellers[0]

  if (stockLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Carregando estoque...
      </div>
    )
  }

  const shoppingList = buildShoppingList(variants, target)
  const shoppingListEmptyMessage = 'Nenhuma lente abaixo da meta de estoque. Tudo em dia!'

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold">Relatório e Análise de Vendas</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe o giro de estoque, ranking de lentes mais vendidas e ferramentas de dados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-foreground focus-visible:outline-none"
              aria-label="Selecionar data"
              title="Filtrar por data no padrão dd/mm/aaaa"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('')
                  setEndDate('')
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Limpar filtro de data"
                title="Ver todos os períodos"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {selectedDate && !endDate && (
            <button
              type="button"
              onClick={() => setEndDate(selectedDate)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              + Até outra data
            </button>
          )}

          {selectedDate && endDate && (
            <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm">
              <span className="text-[11px] text-muted-foreground">Até:</span>
              <input
                type="date"
                value={endDate}
                min={selectedDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-foreground focus-visible:outline-none"
                aria-label="Data final"
                title="Data final no padrão dd/mm/aaaa"
              />
              <button
                type="button"
                onClick={() => setEndDate('')}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remover data final"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <div className="rounded-full bg-primary/10 p-2.5 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lentes vendidas</p>
            <p className="text-2xl font-bold tabular-nums">{salesLoading ? '...' : totalSold}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <div className="rounded-full bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
            <PackagePlus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="text-2xl font-bold tabular-nums">{salesLoading ? '...' : totalAdded}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <div className="rounded-full bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs text-muted-foreground">Mais vendida</p>
            <p className="truncate text-sm font-semibold">
              {salesLoading
                ? '...'
                : championLens
                  ? `ESF ${formatDiopter(championLens.sphereHundredths)} / CIL ${formatDiopter(championLens.cylinderHundredths)} (${championLens.totalSold} un)`
                  : 'Nenhuma saída'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Ranking */}
      <div className="rounded-md border bg-card">
        <div className="border-b p-3">
          <h3 className="font-medium text-sm">Ranking de Lentes Mais Vendidas</h3>
          <p className="text-xs text-muted-foreground">
            Lentes com maior saída ({periodLabel.toLowerCase()}).
          </p>
        </div>

        {salesLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Carregando dados de vendas...
          </div>
        ) : topSellers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma saída de lentes registrada para o período selecionado.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-2.5 text-center w-12">#</th>
                  <th className="p-2.5">Categoria</th>
                  <th className="p-2.5">Esférico</th>
                  <th className="p-2.5">Cilindro</th>
                  <th className="p-2.5 text-right font-medium pr-4">Quantidade vendida</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topSellers.map((lens, index) => (
                  <tr key={`${lens.category}-${lens.sphereHundredths}-${lens.cylinderHundredths}`}>
                    <td className="p-2.5 text-center font-medium text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="p-2.5 font-medium">
                      {lens.category === 'positive' ? 'Positivo' : 'Negativo'}
                    </td>
                    <td className="p-2.5 font-mono">{formatDiopter(lens.sphereHundredths)}</td>
                    <td className="p-2.5 font-mono">{formatDiopter(lens.cylinderHundredths)}</td>
                    <td className="p-2.5 text-right font-semibold tabular-nums pr-4 text-emerald-600 dark:text-emerald-400">
                      {lens.totalSold} un
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lista de Compras */}
      <div className="rounded-md border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
          <div>
            <h3 className="text-sm font-medium">Lista de Compras</h3>
            <p className="text-xs text-muted-foreground">
              Lentes com quantidade abaixo da meta estipulada ({target}{' '}
              {target === 1 ? 'unidade' : 'unidades'}).
            </p>
          </div>
          <StockTargetInput target={target} onChange={setTarget} />
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportModal
            trigger={
              <Button variant="outline">
                <FileText className="h-4 w-4" />
                Lista de compras (Texto)
              </Button>
            }
            title="Lista de compras"
            description={`Lentes abaixo da meta de estoque (${target} unidades).`}
            content={formatShoppingListText(shoppingList)}
            isEmpty={shoppingList.length === 0}
            emptyMessage={shoppingListEmptyMessage}
          />

          <ExportModal
            trigger={
              <Button variant="outline">
                <FileJson className="h-4 w-4" />
                Lista de compras (JSON)
              </Button>
            }
            title="Lista de compras (JSON)"
            description={`Lentes abaixo da meta de estoque (${target} unidades).`}
            content={shoppingListToJson(shoppingList)}
            isEmpty={shoppingList.length === 0}
            emptyMessage={shoppingListEmptyMessage}
            download={{
              fileName: 'lista-de-compras.json',
              filters: [{ name: 'JSON', extensions: ['json'] }]
            }}
          />
        </div>
      </div>
    </div>
  )
}
