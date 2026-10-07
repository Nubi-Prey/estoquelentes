import { useState } from 'react'
import { Check, FileUp, Loader2, Upload } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { parseStockContent } from '@renderer/lib/importStock'

interface ImportModalProps {
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function ImportModal({ trigger, onSuccess }: ImportModalProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ success?: string; error?: string } | null>(null)

  function reset(): void {
    setRawText('')
    setFileName(null)
    setMode('merge')
    setFeedback(null)
    setIsSubmitting(false)
  }

  async function handleSelectFile(): Promise<void> {
    setFeedback(null)
    const res = await window.api.openFile({
      filters: [{ name: 'Estoque (JSON ou SQL)', extensions: ['json', 'sql'] }]
    })
    if (!res.canceled && res.content) {
      setRawText(res.content)
      setFileName(res.fileName ?? 'arquivo carregado')
    }
  }

  const parsed = rawText.trim().length > 0 ? parseStockContent(rawText) : null

  async function handleImport(): Promise<void> {
    if (!parsed || parsed.error || parsed.items.length === 0) return

    setIsSubmitting(true)
    setFeedback(null)
    try {
      const res = await window.api.importStock({
        items: parsed.items,
        mode
      })

      if (res.success) {
        setFeedback({ success: `${res.importedCount} lente(s) importada(s) com sucesso!` })
        if (onSuccess) onSuccess()
        setTimeout(() => {
          setOpen(false)
          reset()
        }, 1200)
      } else {
        setFeedback({ error: res.error ?? 'Falha ao importar estoque.' })
      }
    } catch (err) {
      setFeedback({ error: err instanceof Error ? err.message : 'Erro inesperado na importação.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Upload className="h-4 w-4" />
            Importar estoque
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importar estoque</DialogTitle>
          <DialogDescription>
            Carregue um arquivo JSON ou SQL ou cole os dados abaixo para atualizar o estoque.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSelectFile}>
              <FileUp className="h-4 w-4" />
              Carregar arquivo (.json, .sql)
            </Button>
            {fileName && (
              <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                {fileName}
              </span>
            )}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="import-content" className="text-xs">
              Ou cole o conteúdo JSON ou SQL:
            </Label>
            <textarea
              id="import-content"
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value)
                setFileName(null)
                setFeedback(null)
              }}
              placeholder='[ { "sphere": 0.25, "cylinder": -0.50, "quantity": 5 } ]'
              className="h-28 w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Modo de importação:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'merge' ? 'default' : 'outline'}
                className="flex-1 text-xs"
                onClick={() => setMode('merge')}
              >
                Somar ao estoque
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'replace' ? 'destructive' : 'outline'}
                className="flex-1 text-xs"
                onClick={() => setMode('replace')}
              >
                Substituir estoque
              </Button>
            </div>
          </div>

          {parsed?.error && <p className="text-xs text-destructive">{parsed.error}</p>}

          {parsed && !parsed.error && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {parsed.items.length} lente(s) identificada(s) para importação.
            </p>
          )}

          {feedback?.error && <p className="text-xs text-destructive">{feedback.error}</p>}
          {feedback?.success && (
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              {feedback.success}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={!parsed || !!parsed.error || parsed.items.length === 0 || isSubmitting}
            variant={mode === 'replace' ? 'destructive' : 'default'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Importando...
              </>
            ) : (
              'Confirmar importação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
