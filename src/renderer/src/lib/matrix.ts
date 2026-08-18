import type { StockVariant } from '@shared/ipc'

export function deriveSphereRows(variants: StockVariant[]): number[] {
  return [...new Set(variants.map((v) => v.sphereHundredths))].sort((a, b) => b - a)
}

export function deriveCylinderColumns(variants: StockVariant[]): number[] {
  return [...new Set(variants.map((v) => v.cylinderHundredths))].sort((a, b) => b - a)
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
