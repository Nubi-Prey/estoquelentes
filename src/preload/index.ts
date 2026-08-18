import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS, type StockVariant, type AdjustQuantityRequest } from '@shared/ipc'

const api = {
  getAllStock: (): Promise<StockVariant[]> => ipcRenderer.invoke(IPC_CHANNELS.STOCK_GET_ALL),
  adjustQuantity: (req: AdjustQuantityRequest): Promise<StockVariant> =>
    ipcRenderer.invoke(IPC_CHANNELS.STOCK_ADJUST_QUANTITY, req)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
