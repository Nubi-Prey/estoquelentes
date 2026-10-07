import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, ScanBarcode } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { parseBarcode } from '@renderer/lib/matrix'
import type { AdjustQuantityRequest } from '@shared/ipc'

interface BarcodeInputProps {
  onScan: (req: AdjustQuantityRequest) => void
}

export function BarcodeInput({ onScan }: BarcodeInputProps): React.JSX.Element {
  const [code, setCode] = useState('')
  const [direction, setDirection] = useState<1 | -1>(1)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'F2') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()

    const parsed = parseBarcode(code)
    if (!parsed) {
      setError('Código de barras inválido (esperado 12 dígitos, formato LLLL S EEE I CCC).')
      return
    }

    onScan({ ...parsed, delta: direction, source: 'barcode' })
    setCode('')
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <ScanBarcode className="h-4 w-4 text-muted-foreground" />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setDirection((d) => (d === 1 ? -1 : 1))}
        aria-label={direction === 1 ? 'Modo leitura: adicionar' : 'Modo leitura: remover'}
        title={direction === 1 ? 'Modo leitura: adicionar' : 'Modo leitura: remover'}
      >
        {direction === 1 ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </Button>
      <Input
        ref={inputRef}
        value={code}
        onChange={(e) => {
          setCode(e.target.value)
          setError(null)
        }}
        placeholder="Código (F2)"
        className="w-40 font-mono"
        aria-label="Código de barras"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
