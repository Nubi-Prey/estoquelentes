import { vi } from 'vitest'
import type { StockVariant } from '@shared/ipc'

type Api = Window['api']

export function createMockApi(overrides: Partial<Api> = {}): Api {
  return {
    getAllStock: vi.fn().mockResolvedValue([]),
    adjustQuantity: vi.fn().mockResolvedValue({} as StockVariant),
    saveFile: vi.fn().mockResolvedValue({ saved: true, filePath: 'C:/fake/saida.json' }),
    openFile: vi.fn().mockResolvedValue({ canceled: true }),
    importStock: vi.fn().mockResolvedValue({ success: true, importedCount: 0 }),
    getStockHistory: vi.fn().mockResolvedValue([]),
    rollbackDay: vi.fn().mockResolvedValue(undefined),
    getSalesReport: vi.fn().mockResolvedValue({ monthlySummary: [], topSellers: [] }),
    ...overrides
  }
}
