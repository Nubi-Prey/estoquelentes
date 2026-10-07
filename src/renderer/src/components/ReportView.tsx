import { Calendar, Database, FileJson, FileText, Layers, TrendingUp, Trophy } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ExportModal } from '@renderer/components/ExportModal'
import { ImportModal } from '@renderer/components/ImportModal'
import { useStock } from '@renderer/hooks/useStock'
import { useStockTarget } from '@renderer/hooks/useStockTarget'
import { useSalesReport } from '@renderer/hooks/useSalesReport'
import { formatDiopter } from '@renderer/lib/matrix'
import {
  buildShoppingList,
  formatShoppingListText,
  shoppingListToJson,
  stockToJson,
  stockToSql
} from '@renderer/lib/exportStock'

function formatMonthName(monthKey: string): string {
  if (!monthKey) return 'Todos os períodos'
  const [year, month] = monthKey.split('-').map(Number)
  if (!year || !month) return monthKey
  const d = new Date(year, month - 1, 1)
  const name = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function ReportView(): React.JSX.Element {
  const { variants, loading: stockLoading } = useStock()
  const { target } = useStockTarget()
  const {
    monthlySummary,
    topSellers,
    selectedMonth,
    setSelectedMonth,
    loading: salesLoading
  } = useSalesReport()

  if (stockLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Carregando estoque...
      </div>
    )
  }

  const shoppingList = buildShoppingList(variants, target)
  const shoppingListEmptyMessage = 'Nenhuma lente abaixo da meta de estoque. Tudo em dia!'
  const stockEmptyMessage = 'Nenhuma lente cadastrada ainda.'

  const activeMonthSummary = selectedMonth
    ? monthlySummary.find((s) => s.monthKey === selectedMonth)
    : {
        totalSold: monthlySummary.reduce((acc, s) => acc + s.totalSold, 0),
        transactionCount: monthlySummary.reduce((acc, s) => acc + s.transactionCount, 0)
      }

  const totalSold = activeMonthSummary?.totalSold ?? 0
  const totalTransactions = activeMonthSummary?.transactionCount ?? 0
  const championLens = topSellers[0]

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold">Relatório e Análise de Vendas</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe o giro de estoque, ranking de lentes mais vendidas e ferramentas de dados.
          </p>
        </div>

        {monthlySummary.length > 0 && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Selecionar período"
            >
              <option value="">Todos os períodos</option>
              {monthlySummary.map((s) => (
                <option key={s.monthKey} value={s.monthKey}>
                  {formatMonthName(s.monthKey)}
                </option>
              ))}
            </select>
          </div>
        )}
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
          <div className="rounded-full bg-secondary p-2.5 text-foreground">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Movimentações de saída</p>
            <p className="text-2xl font-bold tabular-nums">
              {salesLoading ? '...' : totalTransactions}
            </p>
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
            Lentes com maior saída ({formatMonthName(selectedMonth).toLowerCase()}).
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

      {/* Ferramentas de Importação e Exportação */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Ferramentas de Importação e Exportação</h3>
        <div className="flex flex-wrap gap-3">
          <ImportModal />

          <ExportModal
            trigger={
              <Button variant="outline">
                <FileText className="h-4 w-4" />
                Lista de compras
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

          <ExportModal
            trigger={
              <Button variant="outline">
                <FileJson className="h-4 w-4" />
                Estoque completo (JSON)
              </Button>
            }
            title="Exportar estoque (JSON)"
            content={stockToJson(variants)}
            isEmpty={variants.length === 0}
            emptyMessage={stockEmptyMessage}
            download={{
              fileName: 'estoque.json',
              filters: [{ name: 'JSON', extensions: ['json'] }]
            }}
          />

          <ExportModal
            trigger={
              <Button variant="outline">
                <Database className="h-4 w-4" />
                Estoque completo (SQL)
              </Button>
            }
            title="Exportar estoque (SQL)"
            content={stockToSql(variants)}
            isEmpty={variants.length === 0}
            emptyMessage={stockEmptyMessage}
            download={{ fileName: 'estoque.sql', filters: [{ name: 'SQL', extensions: ['sql'] }] }}
          />
        </div>
      </div>
    </div>
  )
}
