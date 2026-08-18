import { and, eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { lensVariants, type LensVariant } from './schema'
import type * as schema from './schema'
import type { AdjustQuantityRequest } from '@shared/ipc'

// Business logic takes the db instance as a parameter (instead of importing the
// singleton from client.ts, which needs Electron's `app`) so it can be exercised
// from a plain Vitest/Node script — see queries.test.ts — without booting Electron.
export type Db = BetterSQLite3Database<typeof schema>

export function getAllVariants(db: Db): LensVariant[] {
  return db.select().from(lensVariants).all()
}

export function adjustVariantQuantity(db: Db, input: AdjustQuantityRequest): LensVariant {
  const { category, sphereHundredths, cylinderHundredths, delta } = input

  const existing = db
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

  if (!existing) {
    // A variant that doesn't exist yet is exactly how a new row/column gets created —
    // this upsert IS the dynamic-growth mechanism.
    return db
      .insert(lensVariants)
      .values({
        category,
        sphereHundredths,
        cylinderHundredths,
        quantity: Math.max(0, delta)
      })
      .returning()
      .get()
  }

  return db
    .update(lensVariants)
    .set({ quantity: Math.max(0, existing.quantity + delta), updatedAt: new Date() })
    .where(eq(lensVariants.id, existing.id))
    .returning()
    .get()
}
