import { deriveCylinderColumns, deriveSphereRows, findVariant, formatDiopter } from './matrix'
import type { LensCategory, StockVariant } from '@shared/ipc'

export interface ShoppingListItem {
  category: LensCategory
  sphereHundredths: number
  cylinderHundredths: number
  quantity: number
  quantityToBuy: number
}

const CATEGORIES: LensCategory[] = ['positive', 'negative']

// Every grid cell (both categories, full baseline + any out-of-range variant) that's
// below the target — including cells with no lens_variants row at all (quantity 0).
export function buildShoppingList(variants: StockVariant[], target: number): ShoppingListItem[] {
  const items: ShoppingListItem[] = []

  for (const category of CATEGORIES) {
    const sphereRows = deriveSphereRows(variants, category)
    const cylinderColumns = deriveCylinderColumns(variants, category)

    for (const sphereHundredths of sphereRows) {
      for (const cylinderHundredths of cylinderColumns) {
        const quantity = findVariant(variants, sphereHundredths, cylinderHundredths)?.quantity ?? 0
        if (quantity < target) {
          items.push({
            category,
            sphereHundredths,
            cylinderHundredths,
            quantity,
            quantityToBuy: target - quantity
          })
        }
      }
    }
  }

  return items
}

export function formatShoppingListLine(item: ShoppingListItem): string {
  return `ESF: ${formatDiopter(item.sphereHundredths)} | CIL: ${formatDiopter(item.cylinderHundredths)} - ${item.quantityToBuy} unidades`
}

export function formatShoppingListText(items: ShoppingListItem[]): string {
  return items.map(formatShoppingListLine).join('\n')
}

export function shoppingListToJson(items: ShoppingListItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      sphere: item.sphereHundredths / 100,
      cylinder: item.cylinderHundredths / 100,
      quantityToBuy: item.quantityToBuy
    })),
    null,
    2
  )
}

export function stockToJson(variants: StockVariant[]): string {
  return JSON.stringify(variants, null, 2)
}

export function stockToSql(variants: StockVariant[]): string {
  const header = `-- EstoqueLentes stock export\n-- ${variants.length} lens variant(s)\n\n`

  if (variants.length === 0) return header.trimEnd()

  const values = variants
    .map(
      (v) => `  ('${v.category}', ${v.sphereHundredths}, ${v.cylinderHundredths}, ${v.quantity})`
    )
    .join(',\n')

  return `${header}INSERT INTO lens_variants (category, sphere_hundredths, cylinder_hundredths, quantity) VALUES\n${values};\n`
}
