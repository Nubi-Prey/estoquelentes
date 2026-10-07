import path from 'node:path'
import { promises as fs } from 'node:fs'
import { ipcMain, dialog, BrowserWindow } from 'electron'
import {
  IPC_CHANNELS,
  type OpenFileRequest,
  type OpenFileResult,
  type SaveFileRequest,
  type SaveFileResult
} from '@shared/ipc'

export function registerFileIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.FILE_SAVE,
    async (event, req: SaveFileRequest): Promise<SaveFileResult> => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const result = window
        ? await dialog.showSaveDialog(window, {
            defaultPath: req.defaultFileName,
            filters: req.filters
          })
        : await dialog.showSaveDialog({ defaultPath: req.defaultFileName, filters: req.filters })

      if (result.canceled || !result.filePath) return { saved: false }

      await fs.writeFile(result.filePath, req.content, 'utf-8')
      return { saved: true, filePath: result.filePath }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.FILE_OPEN,
    async (event, req: OpenFileRequest): Promise<OpenFileResult> => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const result = window
        ? await dialog.showOpenDialog(window, {
            filters: req?.filters,
            properties: ['openFile']
          })
        : await dialog.showOpenDialog({
            filters: req?.filters,
            properties: ['openFile']
          })

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true }
      }

      const filePath = result.filePaths[0]
      const content = await fs.readFile(filePath, 'utf-8')
      return { canceled: false, content, fileName: path.basename(filePath), filePath }
    }
  )
}
