import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { lensVariants, stockHistory, type LensVariant } from './schema'
import type * as schema from './schema'
import type {
  AdjustmentSource,
  AdjustQuantityRequest,
  ImportStockRequest,
  ImportStockResult,
  ImportVariantItem,
  LensCategory,
  MonthlySalesSummary,
  RollbackDayRequest,
  TopSellingVariant
} from '@shared/ipc'

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
  source: AdjustmentSource
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

export function getMonthlySales(db: Db): MonthlySalesSummary[] {
  const rows = db.all<{ monthKey: string; totalSold: number; transactionCount: number }>(sql`
    SELECT
      strftime('%Y-%m', ${stockHistory.createdAt} / 1000, 'unixepoch', 'localtime') AS monthKey,
      SUM(ABS(${stockHistory.delta})) AS totalSold,
      COUNT(*) AS transactionCount
    FROM ${stockHistory}
    WHERE ${stockHistory.delta} < 0
    GROUP BY monthKey
    ORDER BY monthKey DESC
  `)

  return rows.map((r) => ({
    monthKey: String(r.monthKey),
    totalSold: Number(r.totalSold) || 0,
    transactionCount: Number(r.transactionCount) || 0
  }))
}

export function getTopSellingVariants(
  db: Db,
  monthKey?: string,
  limit: number = 10
): TopSellingVariant[] {
  const query = monthKey
    ? sql`
        SELECT
          ${lensVariants.category} AS category,
          ${lensVariants.sphereHundredths} AS sphereHundredths,
          ${lensVariants.cylinderHundredths} AS cylinderHundredths,
          SUM(ABS(${stockHistory.delta})) AS totalSold
        FROM ${stockHistory}
        INNER JOIN ${lensVariants} ON ${stockHistory.variantId} = ${lensVariants.id}
        WHERE ${stockHistory.delta} < 0
          AND strftime('%Y-%m', ${stockHistory.createdAt} / 1000, 'unixepoch', 'localtime') = ${monthKey}
        GROUP BY ${lensVariants.category}, ${lensVariants.sphereHundredths}, ${lensVariants.cylinderHundredths}
        ORDER BY totalSold DESC
        LIMIT ${limit}
      `
    : sql`
        SELECT
          ${lensVariants.category} AS category,
          ${lensVariants.sphereHundredths} AS sphereHundredths,
          ${lensVariants.cylinderHundredths} AS cylinderHundredths,
          SUM(ABS(${stockHistory.delta})) AS totalSold
        FROM ${stockHistory}
        INNER JOIN ${lensVariants} ON ${stockHistory.variantId} = ${lensVariants.id}
        WHERE ${stockHistory.delta} < 0
        GROUP BY ${lensVariants.category}, ${lensVariants.sphereHundredths}, ${lensVariants.cylinderHundredths}
        ORDER BY totalSold DESC
        LIMIT ${limit}
      `

  const rows = db.all<{
    category: LensCategory
    sphereHundredths: number
    cylinderHundredths: number
    totalSold: number
  }>(query)

  return rows.map((r) => ({
    category: r.category,
    sphereHundredths: Number(r.sphereHundredths),
    cylinderHundredths: Number(r.cylinderHundredths),
    totalSold: Number(r.totalSold) || 0
  }))
}

export function importStockVariants(db: Db, req: ImportStockRequest): ImportStockResult {
  const { items, mode } = req

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 0) {
      return { success: false, importedCount: 0, error: 'Quantidade inválida encontrada.' }
    }
    if (!Number.isInteger(item.sphereHundredths) || item.sphereHundredths % 25 !== 0) {
      return { success: false, importedCount: 0, error: 'Esférico fora do passo de 0.25.' }
    }
    if (
      !Number.isInteger(item.cylinderHundredths) ||
      item.cylinderHundredths % 25 !== 0 ||
      item.cylinderHundredths > 0
    ) {
      return { success: false, importedCount: 0, error: 'Cilindro inválido ou positivo.' }
    }
    if (item.category === 'positive' && item.sphereHundredths < 0) {
      return { success: false, importedCount: 0, error: 'Esférico negativo em categoria positiva.' }
    }
    if (item.category === 'negative' && item.sphereHundredths >= 0) {
      return {
        success: false,
        importedCount: 0,
        error: 'Esférico não-negativo em categoria negativa.'
      }
    }
  }

  const itemMap = new Map<string, ImportVariantItem>()
  for (const item of items) {
    const key = `${item.category}:${item.sphereHundredths}:${item.cylinderHundredths}`
    const existing = itemMap.get(key)
    if (existing) {
      itemMap.set(key, { ...existing, quantity: existing.quantity + item.quantity })
    } else {
      itemMap.set(key, { ...item })
    }
  }

  try {
    db.transaction((tx) => {
      const existingVariants = tx.select().from(lensVariants).all()
      const existingMap = new Map<string, LensVariant>()
      for (const v of existingVariants) {
        existingMap.set(`${v.category}:${v.sphereHundredths}:${v.cylinderHundredths}`, v)
      }

      const processedKeys = new Set<string>()

      for (const [key, item] of itemMap.entries()) {
        processedKeys.add(key)
        const existing = existingMap.get(key)

        if (existing) {
          const newQty = mode === 'replace' ? item.quantity : existing.quantity + item.quantity
          const delta = newQty - existing.quantity

          if (delta !== 0) {
            tx.update(lensVariants)
              .set({ quantity: newQty, updatedAt: new Date() })
              .where(eq(lensVariants.id, existing.id))
              .run()

            tx.insert(stockHistory)
              .values({
                variantId: existing.id,
                delta,
                resultingQuantity: newQty,
                source: 'import'
              })
              .run()
          }
        } else {
          const inserted = tx
            .insert(lensVariants)
            .values({
              category: item.category,
              sphereHundredths: item.sphereHundredths,
              cylinderHundredths: item.cylinderHundredths,
              quantity: item.quantity
            })
            .returning()
            .get()

          if (item.quantity > 0) {
            tx.insert(stockHistory)
              .values({
                variantId: inserted.id,
                delta: item.quantity,
                resultingQuantity: item.quantity,
                source: 'import'
              })
              .run()
          }
        }
      }

      if (mode === 'replace') {
        for (const [key, existing] of existingMap.entries()) {
          if (!processedKeys.has(key) && existing.quantity > 0) {
            tx.update(lensVariants)
              .set({ quantity: 0, updatedAt: new Date() })
              .where(eq(lensVariants.id, existing.id))
              .run()

            tx.insert(stockHistory)
              .values({
                variantId: existing.id,
                delta: -existing.quantity,
                resultingQuantity: 0,
                source: 'import'
              })
              .run()
          }
        }
      }
    })

    return { success: true, importedCount: itemMap.size }
  } catch (err) {
    return {
      success: false,
      importedCount: 0,
      error: err instanceof Error ? err.message : 'Erro ao importar estoque.'
    }
  }
}
