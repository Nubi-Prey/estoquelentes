import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { cn } from '@renderer/lib/utils'
import { isQuarterStep, toHundredths } from '@renderer/lib/matrix'
import type { AdjustQuantityRequest, LensCategory } from '@shared/ipc'

interface AddVariantDialogProps {
  defaultCategory: LensCategory
  onAdd: (req: AdjustQuantityRequest) => void
}

export function AddVariantDialog({
  defaultCategory,
  onAdd
}: AddVariantDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<LensCategory>(defaultCategory)
  const [sphere, setSphere] = useState('')
  const [cylinder, setCylinder] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [error, setError] = useState<string | null>(null)

  function reset(): void {
    setSphere('')
    setCylinder('')
    setQuantity('1')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()

    const sphereHundredths = toHundredths(sphere)
    const cylinderHundredths = toHundredths(cylinder)
    const initialQuantity = Math.max(1, Math.round(Number.parseFloat(quantity)) || 1)

    if (Number.isNaN(sphereHundredths) || !isQuarterStep(sphereHundredths)) {
      setError('Esférico deve ser um valor em passos de 0.25 (ex: 0, 0.25, -1.50).')
      return
    }
    if (category === 'positive' && sphereHundredths < 0) {
      setError('Esférico deve ser ≥ 0 para a categoria positiva.')
      return
    }
    if (category === 'negative' && sphereHundredths >= 0) {
      setError('Esférico deve ser < 0 para a categoria negativa.')
      return
    }
    if (Number.isNaN(cylinderHundredths) || !isQuarterStep(cylinderHundredths)) {
      setError('Cilindro deve ser um valor em passos de 0.25 (ex: 0, -0.25, -2.00).')
      return
    }
    if (cylinderHundredths > 0) {
      setError('Cilindro deve ser ≤ 0.')
      return
    }

    onAdd({ category, sphereHundredths, cylinderHundredths, delta: initialQuantity })
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setCategory(defaultCategory)
        } else {
          reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Adicionar lente</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar lente</DialogTitle>
            <DialogDescription>
              Cadastra um novo valor de esférico/cilindro na matriz. Se o valor estiver fora do
              range atual, uma nova linha ou coluna aparece automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={category === 'positive' ? 'default' : 'outline'}
                  className={cn('flex-1')}
                  onClick={() => setCategory('positive')}
                >
                  Esférico positivo
                </Button>
                <Button
                  type="button"
                  variant={category === 'negative' ? 'default' : 'outline'}
                  className={cn('flex-1')}
                  onClick={() => setCategory('negative')}
                >
                  Esférico negativo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sphere">Esférico</Label>
                <Input
                  id="sphere"
                  placeholder="ex: 4.25"
                  value={sphere}
                  onChange={(e) => setSphere(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cylinder">Cilindro</Label>
                <Input
                  id="cylinder"
                  placeholder="ex: -2.25"
                  value={cylinder}
                  onChange={(e) => setCylinder(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantidade inicial</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
