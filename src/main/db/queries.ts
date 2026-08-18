import { and, desc, eq, gte, lt } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { lensVariants, stockHistory, type LensVariant } from './schema'
import type * as schema from './schema'
import type { AdjustQuantityRequest, LensCategory, RollbackDayRequest } from '@shared/ipc'

// Business logic takes the db instance as a parameter (instead of importing the
// singleton from client.ts, which needs Electron's `app`) so it can be exercised
// from a plain Vitest/Node script — see queries.test.ts — without booting Electron.
export type Db = BetterSQLite3Database<typeof schema>

export function getAllVariants(db: Db): LensVariant[] {
  return db.select().from(lensVariants).all()
}

export function adjustVariantQuantity(db: Db, input: AdjustQuantityRequest): LensVariant {
  const { category, sphereHundredths, cylinderHundredths, delta, source = 'manual' } = input

  return db.transaction((tx) => {
    const existing = tx
      .select()
      .from(lensVariants)
      .where(
        and(
          eq(lensVariants.category, category),
          eq(lensVariants.sphereHundredths, sphereHundredths),
          eq(lensVariants.cylinderHundredths, cylinderHundredths)
        )
      )
      .get()

    // A variant that doesn't exist yet is exactly how a new row/column gets created —
    // this upsert IS the dynamic-growth mechanism.
    const result = existing
      ? tx
          .update(lensVariants)
          .set({ quantity: Math.max(0, existing.quantity + delta), updatedAt: new Date() })
          .where(eq(lensVariants.id, existing.id))
          .returning()
          .get()
      : tx
          .insert(lensVariants)
          .values({ category, sphereHundredths, cylinderHundredths, quantity: Math.max(0, delta) })
          .returning()
          .get()

    tx.insert(stockHistory)
      .values({ variantId: result.id, delta, resultingQuantity: result.quantity, source })
      .run()

    return result
  })
}

export interface StockHistoryWithVariant {
  id: number
  category: LensCategory
  sphereHundredths: number
  cylinderHundredths: number
  delta: number
  resultingQuantity: number
  source: 'manual' | 'barcode'
  createdAt: number
}

export function getStockHistory(db: Db): StockHistoryWithVariant[] {
  return (
    db
      .select({
        id: stockHistory.id,
        category: lensVariants.category,
        sphereHundredths: lensVariants.sphereHundredths,
        cylinderHundredths: lensVariants.cylinderHundredths,
        delta: stockHistory.delta,
        resultingQuantity: stockHistory.resultingQuantity,
        source: stockHistory.source,
        createdAt: stockHistory.createdAt
      })
      .from(stockHistory)
      .innerJoin(lensVariants, eq(stockHistory.variantId, lensVariants.id))
      // id as a tiebreaker: two adjustments in the same synchronous transaction can
      // land on the same createdAt millisecond, which would otherwise sort unstably.
      .orderBy(desc(stockHistory.createdAt), desc(stockHistory.id))
      .all()
      .map((row) => ({ ...row, createdAt: row.createdAt.getTime() }))
  )
}

// Reverses every history entry in [dayStartMs, dayEndMs): applies the aggregate
// inverse delta per variant (clamped at 0, same as adjustVariantQuantity), then
// deletes those entries — a rolled-back day is undone, not recorded as a new
// action, matching the spec's "se adicionado X, remova X".
export function rollbackDay(db: Db, { dayStartMs, dayEndMs }: RollbackDayRequest): void {
  db.transaction((tx) => {
    const entries = tx
      .select()
      .from(stockHistory)
      .where(
        and(
          gte(stockHistory.createdAt, new Date(dayStartMs)),
          lt(stockHistory.createdAt, new Date(dayEndMs))
        )
      )
      .all()

    const totalDeltaByVariant = new Map<number, number>()
    for (const entry of entries) {
      totalDeltaByVariant.set(
        entry.variantId,
        (totalDeltaByVariant.get(entry.variantId) ?? 0) + entry.delta
      )
    }

    for (const [variantId, totalDelta] of totalDeltaByVariant) {
      const variant = tx.select().from(lensVariants).where(eq(lensVariants.id, variantId)).get()
      if (variant) {
        tx.update(lensVariants)
          .set({ quantity: Math.max(0, variant.quantity - totalDelta), updatedAt: new Date() })
          .where(eq(lensVariants.id, variantId))
          .run()
      }
    }

    for (const entry of entries) {
      tx.delete(stockHistory).where(eq(stockHistory.id, entry.id)).run()
    }
  })
}
