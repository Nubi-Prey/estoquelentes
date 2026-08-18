import { ipcMain } from 'electron'
import { IPC_CHANNELS, type AdjustQuantityRequest } from '@shared/ipc'
import { getAllVariants, adjustVariantQuantity } from '../db/queries'

export function registerStockIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.STOCK_GET_ALL, () => getAllVariants())
  ipcMain.handle(IPC_CHANNELS.STOCK_ADJUST_QUANTITY, (_event, req: AdjustQuantityRequest) =>
    adjustVariantQuantity(req)
  )
}
