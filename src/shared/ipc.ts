export const IPC_CHANNELS = {
  STOCK_GET_ALL: 'stock:get-all',
  STOCK_ADJUST_QUANTITY: 'stock:adjust-quantity'
} as const

export type LensCategory = 'positive' | 'negative'

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
}
