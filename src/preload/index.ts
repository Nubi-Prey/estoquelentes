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
  type RollbackDayRequest,
  type ImportStockRequest,
  type ImportStockResult,
  type OpenFileRequest,
  type OpenFileResult,
  type SalesReportRequest,
  type SalesReportResponse,
  type BackupDatabaseResult,
  type RestoreDatabaseResult,
  type OpenDataFolderResult,
  type DataPathResult
} from '@shared/ipc'

const api = {
  getAllStock: (): Promise<StockVariant[]> => ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_ALL),
  adjustQuantity: (req: AdjustQuantityRequest): Promise<StockVariant> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOCK_ADJUST_QUANTITY, req),
  importStock: (req: ImportStockRequest): Promise<ImportStockResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOCK_IMPORT, req),
  saveFile: (req: SaveFileRequest): Promise<SaveFileResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE, req),
  openFile: (req?: OpenFileRequest): Promise<OpenFileResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN, req),
  getStockHistory: (): Promise<StockHistoryEntry[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_ALL),
  rollbackDay: (req: RollbackDayRequest): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_ROLLBACK_DAY, req),
  getSalesReport: (req?: SalesReportRequest): Promise<SalesReportResponse> =>
    ipcRenderer.invoke(IPC_CHANNELS.REPORT_GET_SALES, req),
  backupDatabase: (): Promise<BackupDatabaseResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.STORAGE_BACKUP_DATABASE),
  restoreDatabase: (): Promise<RestoreDatabaseResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.STORAGE_RESTORE_DATABASE),
  openDataFolder: (): Promise<OpenDataFolderResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.STORAGE_OPEN_DATA_FOLDER),
  getDataPath: (): Promise<DataPathResult> => ipcRenderer.invoke(IPC_CHANNELS.STORAGE_GET_DATA_PATH)
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
