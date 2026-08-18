import { vi } from 'vitest'
import type { StockVariant } from '@shared/ipc'

type Api = Window['api']

export function createMockApi(overrides: Partial<Api> = {}): Api {
  return {
    getAllStock: vi.fn().mockResolvedValue([]),
    adjustQuantity: vi.fn().mockResolvedValue({} as StockVariant),
    saveFile: vi.fn().mockResolvedValue({ saved: true, filePath: 'C:/fake/saida.json' }),
    getStockHistory: vi.fn().mockResolvedValue([]),
    rollbackDay: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}
