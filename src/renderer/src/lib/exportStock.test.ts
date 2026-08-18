import { describe, expect, it } from 'vitest'
import {
  buildShoppingList,
  formatShoppingListLine,
  formatShoppingListText,
  shoppingListToJson,
  stockToJson,
  stockToSql
} from './exportStock'
import type { StockVariant } from '@shared/ipc'

function makeVariant(overrides: Partial<StockVariant>): StockVariant {
  return {
    id: 1,
    category: 'positive',
    sphereHundredths: 0,
    cylinderHundredths: 0,
    quantity: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  }
}

describe('buildShoppingList', () => {
  it('includes every baseline cell below target, even ones with no variant row at all', () => {
    const items = buildShoppingList([], 3)

    // Baseline alone is 17 (positive) + 12 (negative) sphere rows x 9 columns each,
    // and every one of them is "quantity 0 < target 3" with no data at all.
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].quantity).toBe(0)
    expect(items[0].quantityToBuy).toBe(3)
  })

  it('computes quantityToBuy as target minus current quantity', () => {
    const variants = [makeVariant({ sphereHundredths: 0, cylinderHundredths: 0, quantity: 1 })]

    const items = buildShoppingList(variants, 3)
    const item = items.find((i) => i.sphereHundredths === 0 && i.cylinderHundredths === 0)

    expect(item?.quantity).toBe(1)
    expect(item?.quantityToBuy).toBe(2)
  })

  it('excludes a cell once it reaches the target', () => {
    const variants = [makeVariant({ sphereHundredths: 0, cylinderHundredths: 0, quantity: 3 })]

    const items = buildShoppingList(variants, 3)

    expect(items.some((i) => i.sphereHundredths === 0 && i.cylinderHundredths === 0)).toBe(false)
  })

  it('covers both categories', () => {
    const items = buildShoppingList([], 1)

    expect(items.some((i) => i.category === 'positive')).toBe(true)
    expect(items.some((i) => i.category === 'negative')).toBe(true)
  })
})

describe('formatShoppingListLine / formatShoppingListText', () => {
  it('matches the exact requested line format', () => {
    const line = formatShoppingListLine({
      category: 'positive',
      sphereHundredths: 425,
      cylinderHundredths: -50,
      quantity: 1,
      quantityToBuy: 2
    })

    expect(line).toBe('ESF: +4.25 | CIL: -0.50 - 2 unidades')
  })

  it('joins multiple lines with newlines, and is empty for an empty list', () => {
    expect(formatShoppingListText([])).toBe('')
    expect(
      formatShoppingListText([
        {
          category: 'positive',
          sphereHundredths: 0,
          cylinderHundredths: 0,
          quantity: 0,
          quantityToBuy: 1
        },
        {
          category: 'positive',
          sphereHundredths: 25,
          cylinderHundredths: 0,
          quantity: 0,
          quantityToBuy: 1
        }
      ])
    ).toBe('ESF: 0.00 | CIL: 0.00 - 1 unidades\nESF: +0.25 | CIL: 0.00 - 1 unidades')
  })
})

describe('shoppingListToJson', () => {
  it('converts hundredths back to decimal diopters', () => {
    const json = shoppingListToJson([
      {
        category: 'negative',
        sphereHundredths: -300,
        cylinderHundredths: -200,
        quantity: 0,
        quantityToBuy: 3
      }
    ])

    expect(JSON.parse(json)).toEqual([{ sphere: -3, cylinder: -2, quantityToBuy: 3 }])
  })
})

describe('stockToJson / stockToSql', () => {
  it('round-trips the full variant objects as JSON', () => {
    const variant = makeVariant({ quantity: 5 })

    expect(JSON.parse(stockToJson([variant]))).toEqual([variant])
  })

  it('generates a valid multi-row INSERT statement', () => {
    const variants = [
      makeVariant({
        category: 'positive',
        sphereHundredths: 0,
        cylinderHundredths: 0,
        quantity: 2
      }),
      makeVariant({
        category: 'negative',
        sphereHundredths: -25,
        cylinderHundredths: -50,
        quantity: 1
      })
    ]

    const sql = stockToSql(variants)

    expect(sql).toContain(
      'INSERT INTO lens_variants (category, sphere_hundredths, cylinder_hundredths, quantity) VALUES'
    )
    expect(sql).toContain("('positive', 0, 0, 2)")
    expect(sql).toContain("('negative', -25, -50, 1)")
    expect(sql.trim().endsWith(';')).toBe(true)
  })

  it('produces a harmless comment-only output for an empty stock', () => {
    expect(stockToSql([])).not.toContain('INSERT')
  })
})
