import { Database, FileJson, FileText } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ExportModal } from '@renderer/components/ExportModal'
import { useStock } from '@renderer/hooks/useStock'
import { useStockTarget } from '@renderer/hooks/useStockTarget'
import {
  buildShoppingList,
  formatShoppingListText,
  shoppingListToJson,
  stockToJson,
  stockToSql
} from '@renderer/lib/exportStock'

export function ReportView(): React.JSX.Element {
  const { variants, loading } = useStock()
  const { target } = useStockTarget()

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Carregando estoque...
      </div>
    )
  }

  const shoppingList = buildShoppingList(variants, target)
  const shoppingListEmptyMessage = 'Nenhuma lente abaixo da meta de estoque. Tudo em dia!'
  const stockEmptyMessage = 'Nenhuma lente cadastrada ainda.'

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Relatório</h2>
        <p className="text-sm text-muted-foreground">
          Lentes mais vendidas e quantidade vendida por mês — ainda não implementado.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
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
          download={{ fileName: 'estoque.json', filters: [{ name: 'JSON', extensions: ['json'] }] }}
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
  )
}
