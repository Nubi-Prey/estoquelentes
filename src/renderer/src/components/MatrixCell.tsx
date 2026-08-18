import { Minus, Plus } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { StockVariant } from '@shared/ipc'

interface MatrixCellProps {
  variant: StockVariant | undefined
  editMode: boolean
  onAdjust: (delta: number) => void
}

export function MatrixCell({ variant, editMode, onAdjust }: MatrixCellProps): React.JSX.Element {
  const quantity = variant?.quantity ?? 0

  if (!variant && !editMode) {
    return <div className="flex h-12 w-16 items-center justify-center text-muted-foreground">—</div>
  }

  if (!variant && editMode) {
    return (
      <button
        type="button"
        onClick={() => onAdjust(1)}
        className="flex h-12 w-16 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Adicionar lente nesta célula"
      >
        <Plus className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        'flex h-12 w-16 items-center justify-center gap-1 font-medium',
        quantity === 0 && 'text-muted-foreground'
      )}
    >
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
      <span className="tabular-nums">{quantity}</span>
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
