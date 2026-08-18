import type { LensCategory, StockVariant } from '@shared/ipc'

// Baseline grid extent per the shop's known lens range, in hundredths of a diopter.
// The table always shows these as placeholders even with zero stock; actual variants
// outside this range (dynamic growth) still extend it — see deriveSphereRows below.
export const CATEGORY_RANGES: Record<
  LensCategory,
  { sphere: [number, number]; cylinder: [number, number] }
> = {
  positive: { sphere: [0, 400], cylinder: [-200, 0] },
  negative: { sphere: [-300, -25], cylinder: [-200, 0] }
}

export function buildQuarterStepRange(minHundredths: number, maxHundredths: number): number[] {
  const values: number[] = []
  for (let v = minHundredths; v <= maxHundredths; v += 25) values.push(v)
  return values
}

export function deriveSphereRows(variants: StockVariant[], category: LensCategory): number[] {
  const [min, max] = CATEGORY_RANGES[category].sphere
  const fromData = variants.filter((v) => v.category === category).map((v) => v.sphereHundredths)
  // Sorted by distance from zero (ascending), not raw value — rows/columns start at
  // zero and move away from it as you go down/right, regardless of sign.
  return [...new Set([...buildQuarterStepRange(min, max), ...fromData])].sort(
    (a, b) => Math.abs(a) - Math.abs(b)
  )
}

export function deriveCylinderColumns(variants: StockVariant[], category: LensCategory): number[] {
  const [min, max] = CATEGORY_RANGES[category].cylinder
  const fromData = variants.filter((v) => v.category === category).map((v) => v.cylinderHundredths)
  // Sorted by distance from zero (ascending), not raw value — rows/columns start at
  // zero and move away from it as you go down/right, regardless of sign.
  return [...new Set([...buildQuarterStepRange(min, max), ...fromData])].sort(
    (a, b) => Math.abs(a) - Math.abs(b)
  )
}

export function findVariant(
  variants: StockVariant[],
  sphereHundredths: number,
  cylinderHundredths: number
): StockVariant | undefined {
  return variants.find(
    (v) => v.sphereHundredths === sphereHundredths && v.cylinderHundredths === cylinderHundredths
  )
}

export function formatDiopter(hundredths: number): string {
  const value = hundredths / 100
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

export function isQuarterStep(hundredths: number): boolean {
  return Number.isInteger(hundredths) && hundredths % 25 === 0
}

export function toHundredths(displayValue: string): number {
  return Math.round(Number.parseFloat(displayValue) * 100)
}

export type StockStatus = 'outOfStock' | 'belowTarget' | 'atTarget'

// Placeholder default until per-category/per-variant targets exist (the spec's
// planned "adjustable target" shopping-list feature) — trivial to swap out later
// since callers pass it in explicitly rather than getStockStatus assuming it.
export const DEFAULT_STOCK_TARGET = 3

export function getStockStatus(quantity: number, target: number): StockStatus {
  if (quantity <= 0) return 'outOfStock'
  if (quantity < target) return 'belowTarget'
  return 'atTarget'
}
