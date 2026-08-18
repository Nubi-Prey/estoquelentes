import { ipcMain } from 'electron'
import { IPC_CHANNELS, type RollbackDayRequest } from '@shared/ipc'
import { db } from '../db/client'
import { getStockHistory, rollbackDay } from '../db/queries'

export function registerHistoryIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, () => getStockHistory(db))
  ipcMain.handle(IPC_CHANNELS.HISTORY_ROLLBACK_DAY, (_event, req: RollbackDayRequest) =>
    rollbackDay(db, req)
  )
}
