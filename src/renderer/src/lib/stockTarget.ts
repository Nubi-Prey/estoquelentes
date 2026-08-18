const STORAGE_KEY = 'estoquelentes-stock-target'

export function getInitialStockTarget(fallback: number): number {
  const stored = localStorage.getItem(STORAGE_KEY)
  const parsed = stored === null ? NaN : Number.parseInt(stored, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function persistStockTarget(target: number): void {
  localStorage.setItem(STORAGE_KEY, String(target))
}
