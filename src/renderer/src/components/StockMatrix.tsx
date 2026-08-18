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
  category: LensCategory
  editMode: boolean
  onAdjust: (req: AdjustQuantityRequest) => void
}

export function StockMatrix({
  variants,
  category,
  editMode,
  onAdjust
}: StockMatrixProps): React.JSX.Element {
  const sphereRows = deriveSphereRows(variants, category)
  const cylinderColumns = deriveCylinderColumns(variants, category)

  return (
    <div className="mx-auto overflow-auto rounded-md border">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 h-12 w-16 border-b border-r bg-card text-xs font-medium text-muted-foreground">
              Esf \ Cil
            </th>
            {cylinderColumns.map((cyl) => (
              <th
                key={cyl}
                className="sticky top-0 z-10 h-12 border-b bg-card text-xs font-medium text-muted-foreground"
              >
                {formatDiopter(cyl)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sphereRows.map((sphere) => (
            <tr key={sphere}>
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
                          category,
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
