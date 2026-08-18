import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
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
import type { FileFilter } from '@shared/ipc'

export interface ExportModalDownload {
  fileName: string
  filters?: FileFilter[]
}

interface ExportModalProps {
  trigger: React.ReactNode
  title: string
  description?: string
  content: string
  copyable?: boolean
  download?: ExportModalDownload
  emptyMessage?: string
  isEmpty?: boolean
}

export function ExportModal({
  trigger,
  title,
  description,
  content,
  copyable = true,
  download,
  emptyMessage = 'Nada para mostrar.',
  isEmpty
}: ExportModalProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const empty = isEmpty ?? content.trim().length === 0

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Falha ao copiar para a área de transferência', error)
    }
  }

  async function handleDownload(): Promise<void> {
    if (!download) return
    const result = await window.api.saveFile({
      content,
      defaultFileName: download.fileName,
      filters: download.filters
    })
    if (result.saved) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false)
          setSaved(false)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">
            {content}
          </pre>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {copyable && (
              <Button type="button" variant="outline" onClick={handleCopy} disabled={empty}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado!' : 'Copiar lista'}
              </Button>
            )}
            {download && (
              <Button type="button" variant="outline" onClick={handleDownload} disabled={empty}>
                {saved ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {saved ? 'Salvo!' : 'Baixar arquivo'}
              </Button>
            )}
          </div>
          <DialogClose asChild>
            <Button type="button">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
