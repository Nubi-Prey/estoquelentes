export const IPC_CHANNELS = {
  STOCK_GET_ALL: 'stock:get-all',
  STOCK_ADJUST_QUANTITY: 'stock:adjust-quantity',
  STOCK_IMPORT: 'stock:import',
  FILE_SAVE: 'file:save',
  FILE_OPEN: 'file:open',
  HISTORY_GET_ALL: 'history:get-all',
  HISTORY_ROLLBACK_DAY: 'history:rollback-day',
  REPORT_GET_SALES: 'report:get-sales',
  STORAGE_BACKUP_DATABASE: 'storage:backup-database',
  STORAGE_RESTORE_DATABASE: 'storage:restore-database',
  STORAGE_OPEN_DATA_FOLDER: 'storage:open-data-folder',
  STORAGE_GET_DATA_PATH: 'storage:get-data-path'
} as const

export type LensCategory = 'positive' | 'negative'
export type AdjustmentSource = 'manual' | 'barcode' | 'import'

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

export interface OpenFileRequest {
  filters?: FileFilter[]
}

export interface OpenFileResult {
  canceled: boolean
  content?: string
  fileName?: string
  filePath?: string
}

export interface MonthlySalesSummary {
  monthKey: string
  totalSold: number
  totalAdded: number
  transactionCount: number
}

export interface SalesReportRequest {
  periodKey?: string
  startDate?: string
  endDate?: string
  monthKey?: string
}

export interface TopSellingVariant {
  category: LensCategory
  sphereHundredths: number
  cylinderHundredths: number
  totalSold: number
}

export interface SalesReportResponse {
  monthlySummary: MonthlySalesSummary[]
  topSellers: TopSellingVariant[]
  summary?: {
    totalSold: number
    totalAdded: number
  }
}

export interface ImportVariantItem {
  category: LensCategory
  sphereHundredths: number
  cylinderHundredths: number
  quantity: number
}

export interface ImportStockRequest {
  items: ImportVariantItem[]
  mode: 'merge' | 'replace'
}

export interface ImportStockResult {
  success: boolean
  importedCount: number
  error?: string
}

export interface BackupDatabaseResult {
  success: boolean
  canceled?: boolean
  filePath?: string
  error?: string
}

export interface RestoreDatabaseResult {
  success: boolean
  canceled?: boolean
  filePath?: string
  error?: string
}

export interface OpenDataFolderResult {
  success: boolean
  error?: string
}

export interface DataPathResult {
  userDataPath: string
  dbPath: string
}
