import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { desc, eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import * as schema from './schema'
import { stockHistory } from './schema'
import {
  getAllVariants,
  adjustVariantQuantity,
  getStockHistory,
  rollbackDay,
  getMonthlySales,
  getTopSellingVariants,
  importStockVariants,
  type Db
} from './queries'

function createTestDb(): Db {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../../../drizzle') })
  return db
}

// Backdates the most recently inserted history row so rollbackDay's day-boundary
// filtering can be tested deterministically instead of depending on "now".
function backdateLastHistoryEntry(db: Db, ms: number): void {
  const last = db.select().from(stockHistory).orderBy(desc(stockHistory.id)).limit(1).get()
  if (!last) throw new Error('no history entry to backdate')
  db.update(stockHistory)
    .set({ createdAt: new Date(ms) })
    .where(eq(stockHistory.id, last.id))
    .run()
}

describe('adjustVariantQuantity', () => {
  it('creates a new variant when none exists yet (the dynamic-growth mechanism)', () => {
    const db = createTestDb()

    const result = adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 425,
      cylinderHundredths: -50,
      delta: 1
    })

    expect(result.quantity).toBe(1)
    expect(getAllVariants(db)).toHaveLength(1)
  })

  it('increments an existing variant instead of creating a duplicate row', () => {
    const db = createTestDb()
    const input = { category: 'positive' as const, sphereHundredths: 0, cylinderHundredths: 0 }

    adjustVariantQuantity(db, { ...input, delta: 2 })
    const result = adjustVariantQuantity(db, { ...input, delta: 3 })

    expect(result.quantity).toBe(5)
    expect(getAllVariants(db)).toHaveLength(1)
  })

  it('clamps quantity at zero, never goes negative', () => {
    const db = createTestDb()
    const input = { category: 'positive' as const, sphereHundredths: 0, cylinderHundredths: 0 }

    adjustVariantQuantity(db, { ...input, delta: 1 })
    const result = adjustVariantQuantity(db, { ...input, delta: -5 })

    expect(result.quantity).toBe(0)
  })

  it('writes a stock_history entry alongside every adjustment, defaulting source to manual', () => {
    const db = createTestDb()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 0,
      cylinderHundredths: 0,
      delta: 2
    })

    const history = getStockHistory(db)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      delta: 2,
      resultingQuantity: 2,
      source: 'manual',
      category: 'positive',
      sphereHundredths: 0,
      cylinderHundredths: 0
    })
    expect(typeof history[0].createdAt).toBe('number')
  })

  it('records the barcode source when the caller specifies it', () => {
    const db = createTestDb()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 0,
      cylinderHundredths: 0,
      delta: 1,
      source: 'barcode'
    })

    expect(getStockHistory(db)[0].source).toBe('barcode')
  })
})

describe('getStockHistory', () => {
  it('orders entries most-recent-first', () => {
    const db = createTestDb()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 0,
      cylinderHundredths: 0,
      delta: 1
    })
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 25,
      cylinderHundredths: 0,
      delta: 1
    })

    expect(getStockHistory(db)[0].sphereHundredths).toBe(25)
  })
})

describe('rollbackDay', () => {
  it("reverses a day's net delta per variant and removes those entries", () => {
    const db = createTestDb()
    const dayStart = new Date(2026, 7, 18, 0, 0, 0, 0).getTime()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 0,
      cylinderHundredths: 0,
      delta: 5
    })
    backdateLastHistoryEntry(db, dayStart + 60_000)

    rollbackDay(db, { dayStartMs: dayStart, dayEndMs: dayStart + 86_400_000 })

    expect(getAllVariants(db)[0].quantity).toBe(0)
    expect(getStockHistory(db)).toHaveLength(0)
  })

  it('aggregates multiple entries for the same variant into one net reversal', () => {
    const db = createTestDb()
    const dayStart = new Date(2026, 7, 18, 0, 0, 0, 0).getTime()
    const input = { category: 'positive' as const, sphereHundredths: 0, cylinderHundredths: 0 }

    adjustVariantQuantity(db, { ...input, delta: 5 })
    backdateLastHistoryEntry(db, dayStart + 1000)
    adjustVariantQuantity(db, { ...input, delta: -2 })
    backdateLastHistoryEntry(db, dayStart + 2000)

    // net for the day is +3 (5 - 2); current quantity is 3 — rollback should return to 0
    rollbackDay(db, { dayStartMs: dayStart, dayEndMs: dayStart + 86_400_000 })

    expect(getAllVariants(db)[0].quantity).toBe(0)
  })

  it('never rolls a quantity below zero', () => {
    const db = createTestDb()
    const dayStart = new Date(2026, 7, 18, 0, 0, 0, 0).getTime()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 0,
      cylinderHundredths: 0,
      delta: 5
    })
    backdateLastHistoryEntry(db, dayStart + 1000)
    // A manual edit outside the entry we're rolling back already brought it down.
    db.update(schema.lensVariants).set({ quantity: 1 }).run()

    rollbackDay(db, { dayStartMs: dayStart, dayEndMs: dayStart + 86_400_000 })

    expect(getAllVariants(db)[0].quantity).toBe(0)
  })

  it('leaves entries from other days untouched', () => {
    const db = createTestDb()
    const day1Start = new Date(2026, 7, 17, 0, 0, 0, 0).getTime()
    const day2Start = new Date(2026, 7, 18, 0, 0, 0, 0).getTime()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 0,
      cylinderHundredths: 0,
      delta: 3
    })
    backdateLastHistoryEntry(db, day1Start + 1000)

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 25,
      cylinderHundredths: 0,
      delta: 2
    })
    backdateLastHistoryEntry(db, day2Start + 1000)

    rollbackDay(db, { dayStartMs: day2Start, dayEndMs: day2Start + 86_400_000 })

    const history = getStockHistory(db)
    expect(history).toHaveLength(1)
    expect(history[0].sphereHundredths).toBe(0)

    const sphere0 = getAllVariants(db).find((v) => v.sphereHundredths === 0)
    const sphere25 = getAllVariants(db).find((v) => v.sphereHundredths === 25)
    expect(sphere0?.quantity).toBe(3) // untouched, from day 1
    expect(sphere25?.quantity).toBe(0) // rolled back, was 2
  })
})

describe('getMonthlySales and getTopSellingVariants', () => {
  it('aggregates sales by month, counting only removals (delta < 0)', () => {
    const db = createTestDb()

    // Add stock first
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: -50,
      delta: 10
    })

    // Date in August 2026
    const augTime = new Date(2026, 7, 10, 12, 0, 0).getTime()
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: -50,
      delta: -3
    })
    backdateLastHistoryEntry(db, augTime)

    // Date in September 2026
    const sepTime = new Date(2026, 8, 15, 12, 0, 0).getTime()
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: -50,
      delta: -2
    })
    backdateLastHistoryEntry(db, sepTime)

    const sales = getMonthlySales(db)
    expect(sales).toHaveLength(2)

    const sepSale = sales.find((s) => s.monthKey === '2026-09')
    const augSale = sales.find((s) => s.monthKey === '2026-08')

    expect(sepSale?.totalSold).toBe(2)
    expect(sepSale?.transactionCount).toBe(1)
    expect(augSale?.totalSold).toBe(3)
    expect(augSale?.transactionCount).toBe(1)
  })

  it('ranks top-selling variants in descending order of units sold', () => {
    const db = createTestDb()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: 0,
      delta: 10
    })
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 200,
      cylinderHundredths: 0,
      delta: 10
    })

    // Sell 4 units of +2.00
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 200,
      cylinderHundredths: 0,
      delta: -4
    })
    // Sell 1 unit of +1.00
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: 0,
      delta: -1
    })

    const topAll = getTopSellingVariants(db)
    expect(topAll).toHaveLength(2)
    expect(topAll[0].sphereHundredths).toBe(200)
    expect(topAll[0].totalSold).toBe(4)
    expect(topAll[1].sphereHundredths).toBe(100)
    expect(topAll[1].totalSold).toBe(1)
  })

  it('filters top sellers by monthKey when provided', () => {
    const db = createTestDb()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: 0,
      delta: 10
    })

    const augTime = new Date(2026, 7, 10, 12, 0, 0).getTime()
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: 0,
      delta: -5
    })
    backdateLastHistoryEntry(db, augTime)

    expect(getTopSellingVariants(db, '2026-08')).toHaveLength(1)
    expect(getTopSellingVariants(db, '2026-09')).toHaveLength(0)
  })
})

describe('importStockVariants', () => {
  it('merges stock by adding quantities to existing and inserting new variants', () => {
    const db = createTestDb()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: 0,
      delta: 2
    })

    const result = importStockVariants(db, {
      mode: 'merge',
      items: [
        { category: 'positive', sphereHundredths: 100, cylinderHundredths: 0, quantity: 3 },
        { category: 'negative', sphereHundredths: -50, cylinderHundredths: -25, quantity: 4 }
      ]
    })

    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(2)

    const variants = getAllVariants(db)
    const pos = variants.find((v) => v.category === 'positive' && v.sphereHundredths === 100)
    const neg = variants.find((v) => v.category === 'negative' && v.sphereHundredths === -50)

    expect(pos?.quantity).toBe(5) // 2 + 3
    expect(neg?.quantity).toBe(4)

    const history = getStockHistory(db)
    const importHistory = history.filter((h) => h.source === 'import')
    expect(importHistory.length).toBeGreaterThanOrEqual(2)
  })

  it('replaces stock by overwriting quantities and resetting absent existing variants to 0', () => {
    const db = createTestDb()

    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 100,
      cylinderHundredths: 0,
      delta: 5
    })
    adjustVariantQuantity(db, {
      category: 'positive',
      sphereHundredths: 200,
      cylinderHundredths: 0,
      delta: 8
    })

    // Import only specifies +1.00 with quantity 3. +2.00 is absent and should become 0.
    const result = importStockVariants(db, {
      mode: 'replace',
      items: [{ category: 'positive', sphereHundredths: 100, cylinderHundredths: 0, quantity: 3 }]
    })

    expect(result.success).toBe(true)
    const variants = getAllVariants(db)
    const v100 = variants.find((v) => v.sphereHundredths === 100)
    const v200 = variants.find((v) => v.sphereHundredths === 200)

    expect(v100?.quantity).toBe(3)
    expect(v200?.quantity).toBe(0)
  })

  it('rejects invalid diopters and returns an error message without changing database', () => {
    const db = createTestDb()

    const result = importStockVariants(db, {
      mode: 'merge',
      items: [
        // 13 is not a quarter step
        { category: 'positive', sphereHundredths: 13, cylinderHundredths: 0, quantity: 2 }
      ]
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('0.25')
    expect(getAllVariants(db)).toHaveLength(0)
  })
})
