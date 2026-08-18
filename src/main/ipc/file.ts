import { ipcMain, dialog, BrowserWindow } from 'electron'
import { promises as fs } from 'node:fs'
import { IPC_CHANNELS, type SaveFileRequest, type SaveFileResult } from '@shared/ipc'

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
}
