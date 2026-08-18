import { Minus, Plus } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { getStockStatus, type StockStatus } from '@renderer/lib/matrix'
import type { StockVariant } from '@shared/ipc'

interface MatrixCellProps {
  variant: StockVariant | undefined
  editMode: boolean
  target: number
  onAdjust: (delta: number) => void
}

const STATUS_TEXT_CLASS: Record<StockStatus, string> = {
  outOfStock: 'text-red-600 dark:text-red-400',
  belowTarget: 'text-amber-600 dark:text-amber-400',
  atTarget: 'text-emerald-600 dark:text-emerald-400'
}

export function MatrixCell({
  variant,
  editMode,
  target,
  onAdjust
}: MatrixCellProps): React.JSX.Element {
  const quantity = variant?.quantity ?? 0

  if (!variant && !editMode) {
    return (
      <div className="flex h-12 w-full items-center justify-center text-muted-foreground">—</div>
    )
  }

  if (!variant && editMode) {
    return (
      <button
        type="button"
        onClick={() => onAdjust(1)}
        className="flex h-12 w-full items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Adicionar lente nesta célula"
      >
        <Plus className="h-4 w-4" />
      </button>
    )
  }

  const status = getStockStatus(quantity, target)

  return (
    <div className="flex h-12 w-full items-center justify-center gap-1 font-medium">
      {editMode && (
        <button
          type="button"
          onClick={() => onAdjust(-1)}
          disabled={quantity === 0}
          className="rounded p-0.5 hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
          aria-label="Remover uma unidade"
        >
          <Minus className="h-3 w-3" />
        </button>
      )}
      <span className={cn('tabular-nums', STATUS_TEXT_CLASS[status])}>{quantity}</span>
      {editMode && (
        <button
          type="button"
          onClick={() => onAdjust(1)}
          className="rounded p-0.5 hover:bg-accent hover:text-accent-foreground"
          aria-label="Adicionar uma unidade"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
