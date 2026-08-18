import { ipcMain } from 'electron'
import { IPC_CHANNELS, type AdjustQuantityRequest } from '@shared/ipc'
import { db } from '../db/client'
import { getAllVariants, adjustVariantQuantity } from '../db/queries'

export function registerStockIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.STOCK_GET_ALL, () => getAllVariants(db))
  ipcMain.handle(IPC_CHANNELS.STOCK_ADJUST_QUANTITY, (_event, req: AdjustQuantityRequest) =>
    adjustVariantQuantity(db, req)
  )
}
