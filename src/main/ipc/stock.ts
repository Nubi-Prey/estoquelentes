import { ipcMain } from 'electron'
import { IPC_CHANNELS, type AdjustQuantityRequest, type ImportStockRequest } from '@shared/ipc'
import { db } from '../db/client'
import { getAllVariants, adjustVariantQuantity, importStockVariants } from '../db/queries'

export function registerStockIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.STOCK_GET_ALL, () => getAllVariants(db))
  ipcMain.handle(IPC_CHANNELS.STOCK_ADJUST_QUANTITY, (_event, req: AdjustQuantityRequest) =>
    adjustVariantQuantity(db, req)
  )
  ipcMain.handle(IPC_CHANNELS.STOCK_IMPORT, (_event, req: ImportStockRequest) =>
    importStockVariants(db, req)
  )
}
