import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  Database,
  DatabaseBackup,
  FileJson,
  FolderOpen,
  HardDrive,
  Loader2,
  RotateCcw
} from 'lucide-react'
import { ThemeToggle } from '@renderer/components/ThemeToggle'
import { ImportModal } from '@renderer/components/ImportModal'
import { ExportModal } from '@renderer/components/ExportModal'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'
import { useStock } from '@renderer/hooks/useStock'
import { stockToJson, stockToSql } from '@renderer/lib/exportStock'
import type { DataPathResult } from '@shared/ipc'

export function SettingsView(): React.JSX.Element {
  const { variants, refetch: refetchStock } = useStock()
  const [dataPaths, setDataPaths] = useState<DataPathResult | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  useEffect(() => {
    window.api
      ?.getDataPath()
      .then(setDataPaths)
      .catch(() => {})
  }, [])

  async function handleBackup(): Promise<void> {
    setIsBackingUp(true)
    setFeedback(null)
    try {
      const res = await window.api.backupDatabase()
      if (res.success && res.filePath) {
        setFeedback({
          type: 'success',
          message: `Backup salvo com sucesso em: ${res.filePath}`
        })
      } else if (!res.canceled && res.error) {
        setFeedback({
          type: 'error',
          message: `Erro ao criar backup: ${res.error}`
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro inesperado ao criar backup.'
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  async function handleRestore(): Promise<void> {
    setIsRestoring(true)
    setFeedback(null)
    try {
      const res = await window.api.restoreDatabase()
      if (res.success && res.filePath) {
        setFeedback({
          type: 'success',
          message: `Backup restaurado com sucesso a partir de: ${res.filePath}`
        })
        await refetchStock()
      } else if (!res.canceled && res.error) {
        setFeedback({
          type: 'error',
          message: `Erro ao restaurar backup: ${res.error}`
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro inesperado ao restaurar backup.'
      })
    } finally {
      setIsRestoring(false)
    }
  }

  async function handleOpenDataFolder(): Promise<void> {
    setFeedback(null)
    try {
      const res = await window.api.openDataFolder()
      if (!res.success && res.error) {
        setFeedback({
          type: 'error',
          message: `Erro ao abrir pasta: ${res.error}`
        })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro inesperado ao abrir pasta de dados.'
      })
    }
  }

  const stockEmptyMessage = 'Nenhuma lente cadastrada ainda.'

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Preferências visuais, ferramentas de dados e gerenciamento de armazenamento local.
        </p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* Aparência */}
        <div className="flex items-center justify-between rounded-md border bg-card p-4">
          <div>
            <Label className="text-sm font-medium">Tema</Label>
            <p className="text-xs text-muted-foreground">
              Alterna entre modo claro e escuro (padrão: segue o sistema).
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Ferramentas de Importação e Exportação de Estoque */}
        <div className="flex flex-col gap-4 rounded-md border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ArrowUpDown className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-medium">Importação e Exportação de Estoque</Label>
              <p className="text-xs text-muted-foreground">
                Importe lotes de lentes para o sistema ou exporte seu inventário completo em formato
                JSON ou SQL.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <ImportModal onSuccess={refetchStock} />

            <ExportModal
              trigger={
                <Button variant="outline" size="sm">
                  <FileJson className="h-4 w-4" />
                  Estoque completo (JSON)
                </Button>
              }
              title="Exportar estoque (JSON)"
              content={stockToJson(variants)}
              isEmpty={variants.length === 0}
              emptyMessage={stockEmptyMessage}
              download={{
                fileName: 'estoque.json',
                filters: [{ name: 'JSON', extensions: ['json'] }]
              }}
            />

            <ExportModal
              trigger={
                <Button variant="outline" size="sm">
                  <Database className="h-4 w-4" />
                  Estoque completo (SQL)
                </Button>
              }
              title="Exportar estoque (SQL)"
              content={stockToSql(variants)}
              isEmpty={variants.length === 0}
              emptyMessage={stockEmptyMessage}
              download={{
                fileName: 'estoque.sql',
                filters: [{ name: 'SQL', extensions: ['sql'] }]
              }}
            />
          </div>
        </div>

        {/* Banco de Dados e Armazenamento */}
        <div className="flex flex-col gap-4 rounded-md border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-medium">Banco de Dados e Armazenamento Local</Label>
              <p className="text-xs text-muted-foreground">
                O EstoqueLentes utiliza um banco de dados SQLite local no seu computador.
              </p>
            </div>
          </div>

          {dataPaths && (
            <div className="rounded-md bg-muted/50 p-3 font-mono text-xs space-y-1 text-muted-foreground border">
              <div>
                <span className="font-semibold text-foreground">Arquivo do banco: </span>
                <span className="break-all">{dataPaths.dbPath}</span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Pasta de dados: </span>
                <span className="break-all">{dataPaths.userDataPath}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBackup}
              disabled={isBackingUp || isRestoring}
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando backup...
                </>
              ) : (
                <>
                  <DatabaseBackup className="h-4 w-4" />
                  Criar backup do banco de dados
                </>
              )}
            </Button>

            <ConfirmDialog
              title="Restaurar backup do banco de dados?"
              description="Esta ação substituirá todo o estoque e histórico atuais pelo conteúdo do backup selecionado. Recomendamos criar um backup do estado atual antes de continuar."
              confirmLabel="Selecionar arquivo e restaurar"
              destructive
              onConfirm={handleRestore}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBackingUp || isRestoring}
                >
                  {isRestoring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Restaurando backup...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Restaurar backup
                    </>
                  )}
                </Button>
              }
            />

            <Button type="button" variant="outline" size="sm" onClick={handleOpenDataFolder}>
              <FolderOpen className="h-4 w-4" />
              Abrir pasta de dados locais
            </Button>
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-2 rounded-md p-3 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="break-all">{feedback.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
