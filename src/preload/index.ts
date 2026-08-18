import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import 'electron-log/renderer'
import {
  IPC_CHANNELS,
  type StockVariant,
  type AdjustQuantityRequest,
  type SaveFileRequest,
  type SaveFileResult,
  type StockHistoryEntry,
  type RollbackDayRequest
} from '@shared/ipc'

const api = {
  getAllStock: (): Promise<StockVariant[]> => ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_ALL),
  adjustQuantity: (req: AdjustQuantityRequest): Promise<StockVariant> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOCK_ADJUST_QUANTITY, req),
  saveFile: (req: SaveFileRequest): Promise<SaveFileResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, req),
  getStockHistory: (): Promise<StockHistoryEntry[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_ALL),
  rollbackDay: (req: RollbackDayRequest): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_ROLLBACK_DAY, req)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api
