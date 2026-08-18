export const IPC_CHANNELS = {
  STOCK_GET_ALL: 'stock:get-all',
  STOCK_ADJUST_QUANTITY: 'stock:adjust-quantity',
  FILE_SAVE: 'file:save',
  HISTORY_GET_ALL: 'history:get-all',
  HISTORY_ROLLBACK_DAY: 'history:rollback-day'
} as const

export type LensCategory = 'positive' | 'negative'
export type AdjustmentSource = 'manual' | 'barcode'

export interface StockVariant {
  id: number
  category: LensCategory
  sphereHundredths: number
  cylinderHundredths: number
  quantity: number
  createdAt: number
  updatedAt: number
}

export interface AdjustQuantityRequest {
  category: LensCategory
  sphereHundredths: number
  cylinderHundredths: number
  delta: number
  source?: AdjustmentSource
}

export interface StockHistoryEntry {
  id: number
  category: LensCategory
  sphereHundredths: number
  cylinderHundredths: number
  delta: number
  resultingQuantity: number
  source: AdjustmentSource
  createdAt: number
}

export interface RollbackDayRequest {
  dayStartMs: number
  dayEndMs: number
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface SaveFileRequest {
  content: string
  defaultFileName: string
  filters?: FileFilter[]
}

export interface SaveFileResult {
  saved: boolean
  filePath?: string
}
