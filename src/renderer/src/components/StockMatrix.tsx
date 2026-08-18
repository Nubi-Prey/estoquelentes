import {
  deriveCylinderColumns,
  deriveSphereRows,
  findVariant,
  formatDiopter
} from '@renderer/lib/matrix'
import { MatrixCell } from '@renderer/components/MatrixCell'
import type { AdjustQuantityRequest, LensCategory, StockVariant } from '@shared/ipc'

interface StockMatrixProps {
  variants: StockVariant[]
  editMode: boolean
  onAdjust: (req: AdjustQuantityRequest) => void
}

function categoryForSphere(sphereHundredths: number): LensCategory {
  return sphereHundredths >= 0 ? 'positive' : 'negative'
}

export function StockMatrix({ variants, editMode, onAdjust }: StockMatrixProps): React.JSX.Element {
  const sphereRows = deriveSphereRows(variants)
  const cylinderColumns = deriveCylinderColumns(variants)

  if (sphereRows.length === 0 || cylinderColumns.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Nenhuma lente cadastrada ainda. Use &quot;Adicionar lente&quot; para começar.
      </div>
    )
  }

  return (
    <div className="overflow-auto rounded-md border">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 h-12 w-16 border-b border-r bg-card text-xs font-medium text-muted-foreground">
              Esf \ Cil
            </th>
            {cylinderColumns.map((cyl) => (
              <th
                key={cyl}
                className="sticky top-0 z-10 h-12 w-16 border-b bg-card text-xs font-medium text-muted-foreground"
              >
                {formatDiopter(cyl)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sphereRows.map((sphere, rowIndex) => {
            const prevSphere = sphereRows[rowIndex - 1]
            const isFirstNegativeRow =
              rowIndex > 0 &&
              categoryForSphere(prevSphere) === 'positive' &&
              categoryForSphere(sphere) === 'negative'

            return (
              <tr
                key={sphere}
                className={isFirstNegativeRow ? 'border-t-2 border-t-primary/30' : undefined}
              >
                <th className="sticky left-0 z-10 w-16 border-r bg-card text-xs font-medium text-muted-foreground">
                  {formatDiopter(sphere)}
                </th>
                {cylinderColumns.map((cyl) => {
                  const variant = findVariant(variants, sphere, cyl)
                  return (
                    <td key={cyl} className="border-b border-r last:border-r-0">
                      <MatrixCell
                        variant={variant}
                        editMode={editMode}
                        onAdjust={(delta) =>
                          onAdjust({
                            category: categoryForSphere(sphere),
                            sphereHundredths: sphere,
                            cylinderHundredths: cyl,
                            delta
                          })
                        }
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
