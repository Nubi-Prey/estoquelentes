import { useState } from 'react'
import { useStock } from '@renderer/hooks/useStock'
import { useStockTarget } from '@renderer/hooks/useStockTarget'
import { StockMatrix } from '@renderer/components/StockMatrix'
import { EditModeToggle } from '@renderer/components/EditModeToggle'
import { AddVariantDialog } from '@renderer/components/AddVariantDialog'
import { CategoryToggle } from '@renderer/components/CategoryToggle'
import { BarcodeInput } from '@renderer/components/BarcodeInput'
import { StockTargetInput } from '@renderer/components/StockTargetInput'
import type { LensCategory } from '@shared/ipc'

export function InventoryView(): React.JSX.Element {
  const { variants, loading, adjust } = useStock()
  const { target, setTarget } = useStockTarget()
  const [editMode, setEditMode] = useState(false)
  const [category, setCategory] = useState<LensCategory>('positive')

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <BarcodeInput
          onScan={(req) => {
            adjust(req)
            setCategory(req.category)
          }}
        />
        <StockTargetInput target={target} onChange={setTarget} />
      </div>

      <div className="flex items-center justify-between">
        <EditModeToggle editMode={editMode} onChange={setEditMode} />
        <div className="flex items-center gap-4">
          {editMode && <AddVariantDialog defaultCategory={category} onAdd={adjust} />}
          <CategoryToggle category={category} onChange={setCategory} />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Carregando estoque...
          </div>
        ) : (
          <StockMatrix
            variants={variants}
            category={category}
            editMode={editMode}
            target={target}
            onAdjust={adjust}
          />
        )}
      </div>
    </div>
  )
}
