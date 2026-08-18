import { Target } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'

interface StockTargetInputProps {
  target: number
  onChange: (target: number) => void
}

export function StockTargetInput({ target, onChange }: StockTargetInputProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Target className="h-4 w-4 text-muted-foreground" />
      <Label htmlFor="stock-target">Meta de estoque</Label>
      <Input
        id="stock-target"
        type="number"
        min={1}
        value={target}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10)
          if (Number.isInteger(next) && next > 0) onChange(next)
        }}
        className="w-16"
      />
    </div>
  )
}
