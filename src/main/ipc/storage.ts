import path from 'node:path'
import { app, dialog, BrowserWindow, ipcMain, shell } from 'electron'
import {
  IPC_CHANNELS,
  type BackupDatabaseResult,
  type DataPathResult,
  type OpenDataFolderResult,
  type RestoreDatabaseResult
} from '@shared/ipc'
import { db, runMigrations } from '../db/client'
import { backupDatabase, restoreDatabase } from '../db/queries'

export function registerStorageIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.STORAGE_BACKUP_DATABASE,
    async (event): Promise<BackupDatabaseResult> => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender)
        const now = new Date()
        const dateStr = now.toISOString().slice(0, 10)
        const defaultFileName = `estoquelentes-backup-${dateStr}.db`

        const options = {
          title: 'Salvar backup do banco de dados',
          defaultPath: defaultFileName,
          filters: [{ name: 'Banco de Dados SQLite (*.db)', extensions: ['db', 'sqlite'] }]
        }

        const result = window
          ? await dialog.showSaveDialog(window, options)
          : await dialog.showSaveDialog(options)

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true }
        }

        await backupDatabase(db, result.filePath)
        return { success: true, filePath: result.filePath }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Falha ao criar backup do banco de dados.'
        }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.STORAGE_RESTORE_DATABASE,
    async (event): Promise<RestoreDatabaseResult> => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender)
        const options = {
          title: 'Selecionar arquivo de backup para restauração',
          filters: [
            { name: 'Banco de Dados SQLite (*.db, *.sqlite)', extensions: ['db', 'sqlite'] }
          ],
          properties: ['openFile'] as Array<'openFile'>
        }

        const result = window
          ? await dialog.showOpenDialog(window, options)
          : await dialog.showOpenDialog(options)

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, canceled: true }
        }

        const backupFilePath = result.filePaths[0]
        const userDataPath = app.getPath('userData')
        const liveDbPath = path.join(userDataPath, 'estoquelentes.db')

        await restoreDatabase(liveDbPath, backupFilePath)
        runMigrations()

        return { success: true, filePath: backupFilePath }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Falha ao restaurar backup do banco de dados.'
        }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.STORAGE_OPEN_DATA_FOLDER, async (): Promise<OpenDataFolderResult> => {
    try {
      const userDataPath = app.getPath('userData')
      const errorMessage = await shell.openPath(userDataPath)
      if (errorMessage) {
        return { success: false, error: errorMessage }
      }
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao abrir pasta de dados locais.'
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_DATA_PATH, (): DataPathResult => {
    const userDataPath = app.getPath('userData')
    const dbPath = path.join(userDataPath, 'estoquelentes.db')
    return { userDataPath, dbPath }
  })
}
